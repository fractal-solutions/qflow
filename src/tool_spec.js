import { AsyncNode, Flow, AsyncFlow } from './qflow.js';
import { stableHash, resolveTemplate } from './util.js';

const WRITE_VERBS = /\b(write|create|insert|update|delete|remove|push|commit|send|post|put|patch|execute|shell|spawn|pay|charge)\b/i;

/**
 * Provider-neutral tool description. The same object can produce agent tool
 * definitions, MCP tools, LLM tool calls, and Markdown documentation.
 */
export class ToolSpec {
  constructor(spec = {}) {
    if (!spec.name) throw new Error('ToolSpec requires a name.');
    this.name = spec.name;
    this.namespace = spec.namespace ?? '';
    this.description = spec.description ?? '';
    this.parameters = spec.parameters ?? { type: 'object', properties: {} };
    this.capabilities = new Set(spec.capabilities ?? []);
    this.permissions = new Set(spec.permissions ?? []);
    this.idempotencyKey = spec.idempotencyKey ?? null;
    this.timeoutMs = spec.timeoutMs ?? null;
    this.dryRun = spec.dryRun ?? null;
    this.sideEffect = spec.sideEffect ?? (WRITE_VERBS.test(`${this.name} ${this.description}`) ? 'write' : 'read');
    this.node = spec.node ?? null;
    this.execute = spec.execute ?? null;
    this.hidden = Boolean(spec.hidden);
    this.metadata = { ...(spec.metadata ?? {}) };
  }

  get qualifiedName() {
    return this.namespace ? `${this.namespace}.${this.name}` : this.name;
  }

  has(capability) {
    return this.capabilities.has(capability);
  }

  hasAll(capabilities = []) {
    return capabilities.every(capability => this.has(capability));
  }

  definition() {
    return {
      name: this.qualifiedName,
      description: this.description,
      parameters: this.parameters,
      capabilities: [...this.capabilities],
      permissions: [...this.permissions],
      sideEffect: this.sideEffect,
      idempotencyKey: this.idempotencyKey,
      timeoutMs: this.timeoutMs,
      dryRun: Boolean(this.dryRun),
    };
  }

  toJSONSchema() {
    return this.parameters;
  }

  toMCPTool() {
    return {
      name: this.qualifiedName,
      description: this.description,
      inputSchema: this.parameters,
    };
  }

  toLLMTool() {
    return {
      type: 'function',
      function: {
        name: this.qualifiedName,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  validate(args = {}) {
    const errors = [];
    const schema = this.parameters ?? {};
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];
    const value = args && typeof args === 'object' ? args : {};

    for (const key of required) {
      if (value[key] === undefined) errors.push(`Missing required parameter: '${key}'.`);
    }

    for (const [key, property] of Object.entries(properties)) {
      const child = value[key];
      if (child === undefined) continue;
      if (property.enum && !property.enum.includes(child)) {
        errors.push(`Parameter '${key}' must be one of ${property.enum.join(', ')}.`);
      }
      if (property.type === 'array' && !Array.isArray(child)) {
        errors.push(`Parameter '${key}' must be an array.`);
      }
      if (property.type === 'object' && (typeof child !== 'object' || Array.isArray(child))) {
        errors.push(`Parameter '${key}' must be an object.`);
      }
      if (property.type === 'number' && typeof child !== 'number') {
        errors.push(`Parameter '${key}' must be a number.`);
      }
      if (property.type === 'boolean' && typeof child !== 'boolean') {
        errors.push(`Parameter '${key}' must be a boolean.`);
      }
      if (property.type === 'string' && typeof child !== 'string') {
        errors.push(`Parameter '${key}' must be a string.`);
      }
    }

    return errors;
  }
}

export function toolSpecFromNode(nodeOrClass, overrides = {}) {
  const isInstance = nodeOrClass instanceof AsyncNode || (
    nodeOrClass && typeof nodeOrClass === 'object' && typeof nodeOrClass.execAsync === 'function'
  );
  const source = isInstance ? nodeOrClass.constructor : nodeOrClass;
  if (typeof source?.getToolDefinition !== 'function') {
    throw new Error('toolSpecFromNode requires a node class/instance with getToolDefinition().');
  }

  const definition = source.getToolDefinition();
  return new ToolSpec({
    ...definition,
    ...overrides,
    node: overrides.node ?? nodeOrClass,
  });
}

function matchesFilter(spec, filter = {}) {
  if (filter.namespace && spec.namespace !== filter.namespace) return false;
  if (filter.capability && !spec.hasAll(Array.isArray(filter.capability) ? filter.capability : [filter.capability])) return false;
  if (filter.permission && !Array.from(spec.permissions).some(permission => filter.permission.includes(permission))) return false;
  if (filter.tag && !spec.metadata.tags?.includes(filter.tag)) return false;
  return true;
}

async function resolveIdempotencyKey(spec, args, context) {
  if (typeof spec.idempotencyKey === 'function') {
    return await spec.idempotencyKey(args, context);
  }
  if (spec.idempotencyKey === true) {
    return `${spec.qualifiedName}:${stableHash(args)}`;
  }
  if (typeof spec.idempotencyKey === 'string') {
    return `${spec.qualifiedName}:${resolveTemplate(spec.idempotencyKey, {
      ...context,
      ...args,
      args,
      params: args,
      shared: context.shared ?? {},
    })}`;
  }
  return null;
}

/** Namespaced, capability-filtered registry shared by agents, MCP and docs. */
export class ToolRegistry {
  constructor({
    tools = [],
    grantedCapabilities = null,
    grantedPermissions = null,
    idempotencyStore = new Map(),
  } = {}) {
    this.tools = new Map();
    this.grantedCapabilities = grantedCapabilities ? new Set(grantedCapabilities) : null;
    this.grantedPermissions = grantedPermissions ? new Set(grantedPermissions) : null;
    this.idempotencyStore = idempotencyStore;

    for (const tool of tools) this.register(tool);
  }

  register(tool, overrides = {}) {
    const spec = tool instanceof ToolSpec
      ? tool
      : toolSpecFromNode(tool, overrides);
    this.tools.set(spec.qualifiedName, spec);
    this.tools.set(spec.name, spec);
    return spec;
  }

  unregister(name) {
    const spec = this.tools.get(name);
    if (!spec) return false;
    this.tools.delete(spec.name);
    this.tools.delete(spec.qualifiedName);
    return true;
  }

  allowed(spec, options = {}) {
    const asSet = value => value == null ? null : value instanceof Set ? value : new Set(value);
    const capabilities = asSet(options.grantedCapabilities ?? this.grantedCapabilities);
    const permissions = asSet(options.grantedPermissions ?? this.grantedPermissions);
    if (capabilities && [...spec.capabilities].some(c => !capabilities.has(c))) return false;
    if (permissions && [...spec.permissions].some(p => !permissions.has(p))) return false;
    return true;
  }

  list(options = {}) {
    return [...new Set(this.tools.values())].filter(spec =>
      !spec.hidden &&
      matchesFilter(spec, options) &&
      this.allowed(spec, options)
    );
  }

  get(name) {
    return this.tools.get(name) ?? null;
  }

  definitions(options = {}) {
    return this.list(options).map(spec => spec.definition());
  }

  mcpTools(options = {}) {
    return this.list(options).map(spec => spec.toMCPTool());
  }

  llmTools(options = {}) {
    return this.list(options).map(spec => spec.toLLMTool());
  }

  async execute(name, args = {}, options = {}) {
    const spec = this.get(name);
    if (!spec) throw new Error(`Tool '${name}' is not registered.`);
    if (!this.allowed(spec, options)) {
      throw new Error(`Tool '${name}' is not allowed by the current capability grant.`);
    }

    const validationErrors = spec.validate(args);
    if (validationErrors.length) {
      throw new Error(`${spec.qualifiedName}: ${validationErrors.join(' ')}`);
    }

    const context = {
      shared: options.shared ?? {},
      observer: options.observer ?? {},
      runId: options.runId ?? options.observer?.runId ?? null,
      checkpointer: options.checkpointer ?? options.observer?.checkpointer ?? null,
      signal: options.signal ?? options.observer?.signal ?? null,
    };

    if (options.dryRun || context.shared?.dryRun) {
      if (typeof spec.dryRun === 'function') {
        const preview = await spec.dryRun(args, context);
        return { tool: spec.qualifiedName, dryRun: true, args, preview, result: preview };
      }
      return {
        tool: spec.qualifiedName,
        dryRun: true,
        args,
        preview: { sideEffect: spec.sideEffect, capabilities: [...spec.capabilities] },
      };
    }

    const idempotencyKey = options.idempotencyKey ?? await resolveIdempotencyKey(spec, args, context);
    const pending = Symbol('qflow-tool-pending');
    const cacheKey = idempotencyKey ? `${spec.qualifiedName}:${idempotencyKey}` : null;
    const storeGet = key => this.idempotencyStore.get?.(key) ?? this.idempotencyStore[key];
    const storeSet = (key, value) => {
      if (this.idempotencyStore.set) this.idempotencyStore.set(key, value);
      else this.idempotencyStore[key] = value;
    };

    if (cacheKey) {
      const cached = storeGet(cacheKey);
      if (cached === pending) {
        throw new Error(`Tool '${spec.qualifiedName}' is already running for idempotency key '${idempotencyKey}'.`);
      }
      if (cached !== undefined) return { ...cached, replayed: true };
      storeSet(cacheKey, pending);
    }

    const run = async () => {
      if (typeof spec.execute === 'function') {
        return await spec.execute(args, context);
      }
      if (!spec.node) {
        throw new Error(`Tool '${spec.qualifiedName}' has no execute function or node.`);
      }

      const NodeClassOrInstance = spec.node;
      const node = NodeClassOrInstance instanceof AsyncNode || NodeClassOrInstance instanceof Flow
        ? NodeClassOrInstance
        : new NodeClassOrInstance();
      node.setParams(args ?? {});
      if (node instanceof AsyncNode) {
        return await new AsyncFlow(node).runAsync({}, context.observer);
      }
      if (node instanceof Flow) return node.run({});
      return node.run(context.shared);
    };

    const timeoutMs = options.timeoutMs ?? spec.timeoutMs;
    let timer = null;
    let result;

    try {
      if (timeoutMs) {
        const controller = new AbortController();
        const forwardAbort = () => controller.abort(context.signal?.reason);
        context.signal?.addEventListener?.('abort', forwardAbort, { once: true });
        const timeout = new Promise((_resolve, reject) => {
          timer = setTimeout(() => {
            const error = new Error(`Tool '${spec.qualifiedName}' timed out after ${timeoutMs}ms.`);
            error.name = 'TimeoutError';
            controller.abort(error);
            reject(error);
          }, timeoutMs);
        });
        context.signal = controller.signal;
        result = await Promise.race([run(), timeout]);
      } else {
        result = await run();
      }
    } catch (error) {
      if (cacheKey) storeSet(cacheKey, undefined);
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }

    const outcome = { tool: spec.qualifiedName, result, args };
    if (cacheKey) storeSet(cacheKey, outcome);
    return outcome;
  }
}

export function generateToolDocs(registry, { title = 'Available Tools' } = {}) {
  const lines = [`# ${title}`, ''];
  for (const spec of registry.list()) {
    lines.push(`## \`${spec.qualifiedName}\``, '', spec.description || '_No description_', '');
    if (spec.capabilities.size) lines.push(`- Capabilities: ${[...spec.capabilities].join(', ')}`);
    if (spec.permissions.size) lines.push(`- Permissions: ${[...spec.permissions].join(', ')}`);
    lines.push(`- Side effect: \`${spec.sideEffect}\``, '');
    const required = spec.parameters?.required ?? [];
    if (required.length) lines.push(`Required: ${required.map(name => `\`${name}\``).join(', ')}`, '');
    lines.push('```json', JSON.stringify(spec.parameters ?? {}, null, 2), '```', '');
  }
  return lines.join('\n');
}
