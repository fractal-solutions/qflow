import { AsyncNode } from '../qflow.js';
import { log } from '../logger.js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

function normalizeBaseUrl(baseUrl = 'http://localhost:9867') {
  return baseUrl.replace(/\/+$/, '');
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean') {
      if (value) searchParams.append(key, 'true');
      continue;
    }
    searchParams.append(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export class NavigatorNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "navigator",
      description: "Controls browser automation through a local PinchTab orchestrator (instances, tabs, snapshots, actions, text extraction, locks, media export, and more).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "ensure_orchestrator",
              "create_profile",
              "list_profiles",
              "get_profile",
              "delete_profile",
              "start_instance",
              "list_instances",
              "get_instance",
              "wait_instance_ready",
              "stop_instance",
              "get_instance_logs",
              "open_tab",
              "list_tabs",
              "get_tab",
              "close_tab",
              "navigate",
              "snapshot",
              "text",
              "evaluate",
              "action",
              "actions",
              "screenshot",
              "pdf",
              "get_cookies",
              "set_cookies",
              "delete_cookies",
              "lock_tab",
              "unlock_tab",
              "tab_lock_status",
              "rotate_fingerprint",
              "fingerprint_status",
            ],
            description: "The PinchTab operation to run."
          },
          baseUrl: {
            type: "string",
            description: "PinchTab orchestrator base URL. Defaults to http://localhost:9867."
          },
          autoStartOrchestrator: {
            type: "boolean",
            description: "If true, auto-starts `pinchtab` when the orchestrator is unreachable."
          },
          orchestratorWaitMs: {
            type: "number",
            description: "How long to wait for orchestrator startup/readiness in milliseconds."
          },
          profileId: {
            type: "string",
            description: "Profile ID for profile/instance operations."
          },
          profileName: {
            type: "string",
            description: "Name used when creating a profile."
          },
          instanceId: {
            type: "string",
            description: "Instance ID for instance/tab-scoped operations."
          },
          mode: {
            type: "string",
            enum: ["headless", "headed"],
            description: "Instance browser mode."
          },
          port: {
            type: "number",
            description: "Optional explicit port for a started instance."
          },
          tabId: {
            type: "string",
            description: "Tab ID for tab operations."
          },
          url: {
            type: "string",
            description: "URL for open_tab or navigate."
          },
          timeout: {
            type: "number",
            description: "Navigation timeout in milliseconds."
          },
          blockImages: {
            type: "boolean",
            description: "Whether to block image loading on navigate."
          },
          blockAds: {
            type: "boolean",
            description: "Whether to block ads on navigate."
          },
          snapshotOptions: {
            type: "object",
            description: "Snapshot options. Supported keys: interactive, compact, depth, maxTokens, filter."
          },
          raw: {
            type: "boolean",
            description: "Text extraction mode. true returns raw/full text."
          },
          expression: {
            type: "string",
            description: "JavaScript expression for evaluate."
          },
          awaitExpression: {
            type: "boolean",
            description: "If true, await the evaluated expression."
          },
          interaction: {
            type: "object",
            description: "Single action payload for `action` (e.g., { kind, ref, text, key })."
          },
          interactions: {
            type: "array",
            items: { type: "object" },
            description: "Action list for `actions` as [{ kind, ... }]."
          },
          screenshotOptions: {
            type: "object",
            description: "Screenshot query options. Supported keys: format, quality."
          },
          pdfOptions: {
            type: "object",
            description: "PDF query options. Supported keys: landscape, margins, scale, pages."
          },
          outputPath: {
            type: "string",
            description: "Optional destination file path for screenshot/pdf."
          },
          includeBase64: {
            type: "boolean",
            description: "If true, includes base64 payload for binary screenshot/pdf responses."
          },
          owner: {
            type: "string",
            description: "Owner identifier for lock/unlock operations."
          },
          ttl: {
            type: "number",
            description: "Lock TTL in seconds."
          },
          cookies: {
            type: "array",
            items: { type: "object" },
            description: "Cookies payload for set/delete cookie actions."
          },
          waitTimeoutMs: {
            type: "number",
            description: "wait_instance_ready total timeout in milliseconds."
          },
          pollIntervalMs: {
            type: "number",
            description: "wait_instance_ready polling interval in milliseconds."
          }
        },
        required: ["action"]
      }
    };
  }

  async execAsync(prepRes, shared) {
    const baseUrl = normalizeBaseUrl(this.params.baseUrl);
    const action = this.params.action;
    const autoStartOrchestrator = Boolean(this.params.autoStartOrchestrator);

    if (!action) {
      throw new Error('NavigatorNode requires an `action` parameter.');
    }

    if (action === 'ensure_orchestrator') {
      return await this.ensureOrchestrator(baseUrl);
    }

    if (autoStartOrchestrator) {
      await this.ensureOrchestrator(baseUrl);
    }

    switch (action) {
      case 'create_profile':
        this.requireParam('profileName');
        return await this.requestJson(baseUrl, '/profiles', 'POST', { name: this.params.profileName });
      case 'list_profiles':
        return await this.requestJson(baseUrl, '/profiles');
      case 'get_profile':
        this.requireParam('profileId');
        return await this.requestJson(baseUrl, `/profiles/${encodeURIComponent(this.params.profileId)}`);
      case 'delete_profile':
        this.requireParam('profileId');
        return await this.requestJson(baseUrl, `/profiles/${encodeURIComponent(this.params.profileId)}`, 'DELETE');

      case 'start_instance':
        return await this.requestJson(baseUrl, '/instances/start', 'POST', {
          profileId: this.params.profileId,
          mode: this.params.mode,
          port: this.params.port
        });
      case 'list_instances':
        return await this.requestJson(baseUrl, '/instances');
      case 'get_instance':
        this.requireParam('instanceId');
        return await this.requestJson(baseUrl, `/instances/${encodeURIComponent(this.params.instanceId)}`);
      case 'wait_instance_ready':
        this.requireParam('instanceId');
        return await this.waitInstanceReady(baseUrl, this.params.instanceId);
      case 'stop_instance':
        this.requireParam('instanceId');
        return await this.requestJson(baseUrl, `/instances/${encodeURIComponent(this.params.instanceId)}/stop`, 'POST');
      case 'get_instance_logs':
        this.requireParam('instanceId');
        return await this.requestText(baseUrl, `/instances/${encodeURIComponent(this.params.instanceId)}/logs`);

      case 'open_tab':
        this.requireParam('instanceId');
        return await this.requestJson(baseUrl, '/tabs/new', 'POST', {
          instanceId: this.params.instanceId,
          url: this.params.url
        });
      case 'list_tabs': {
        const query = buildQuery({ instanceId: this.params.instanceId });
        return await this.requestJson(baseUrl, `/tabs${query}`);
      }
      case 'get_tab':
        this.requireParam('tabId');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}`);
      case 'close_tab':
        this.requireParam('tabId');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/close`, 'POST');
      case 'navigate':
        this.requireParam('tabId');
        this.requireParam('url');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/navigate`, 'POST', {
          url: this.params.url,
          timeout: this.params.timeout,
          blockImages: this.params.blockImages,
          blockAds: this.params.blockAds
        });
      case 'snapshot': {
        this.requireParam('tabId');
        const options = this.params.snapshotOptions || {};
        const query = buildQuery({
          interactive: options.interactive,
          compact: options.compact,
          depth: options.depth,
          maxTokens: options.maxTokens,
          filter: options.filter
        });
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/snapshot${query}`);
      }
      case 'text': {
        this.requireParam('tabId');
        const query = buildQuery({ raw: this.params.raw });
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/text${query}`);
      }
      case 'evaluate':
        this.requireParam('tabId');
        this.requireParam('expression');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/evaluate`, 'POST', {
          expression: this.params.expression,
          await: this.params.awaitExpression
        });
      case 'action':
        this.requireParam('tabId');
        this.requireParam('interaction');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/action`, 'POST', this.params.interaction);
      case 'actions':
        this.requireParam('tabId');
        this.requireParam('interactions');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/actions`, 'POST', {
          actions: this.params.interactions
        });
      case 'screenshot': {
        this.requireParam('tabId');
        const options = this.params.screenshotOptions || {};
        const query = buildQuery({
          format: options.format,
          quality: options.quality
        });
        return await this.requestBinary(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/screenshot${query}`, {
          defaultFileExtension: options.format === 'jpeg' ? 'jpg' : 'png'
        });
      }
      case 'pdf': {
        this.requireParam('tabId');
        const options = this.params.pdfOptions || {};
        const query = buildQuery({
          landscape: options.landscape,
          margins: options.margins,
          scale: options.scale,
          pages: options.pages
        });
        return await this.requestBinary(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/pdf${query}`, {
          defaultFileExtension: 'pdf'
        });
      }
      case 'get_cookies':
        this.requireParam('tabId');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/cookies`);
      case 'set_cookies':
        this.requireParam('tabId');
        this.requireParam('cookies');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/cookies`, 'POST', {
          action: 'set',
          cookies: this.params.cookies
        });
      case 'delete_cookies':
        this.requireParam('tabId');
        this.requireParam('cookies');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/cookies`, 'POST', {
          action: 'delete',
          cookies: this.params.cookies
        });
      case 'lock_tab':
        this.requireParam('tabId');
        this.requireParam('owner');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/lock`, 'POST', {
          owner: this.params.owner,
          ttl: this.params.ttl ?? 60
        });
      case 'unlock_tab':
        this.requireParam('tabId');
        this.requireParam('owner');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/unlock`, 'POST', {
          owner: this.params.owner
        });
      case 'tab_lock_status':
        this.requireParam('tabId');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/locks`);
      case 'rotate_fingerprint':
        this.requireParam('tabId');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/fingerprint/rotate`, 'POST');
      case 'fingerprint_status':
        this.requireParam('tabId');
        return await this.requestJson(baseUrl, `/tabs/${encodeURIComponent(this.params.tabId)}/fingerprint/status`);

      default:
        throw new Error(`Unsupported navigator action: ${action}`);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.navigatorLastResult = execRes;

    if (this.params.action === 'start_instance' && execRes && execRes.id) {
      shared.navigatorInstanceId = execRes.id;
    }

    if (this.params.action === 'create_profile' && execRes && execRes.id) {
      shared.navigatorProfileId = execRes.id;
    }

    if (this.params.action === 'open_tab' && execRes && execRes.id) {
      shared.navigatorTabId = execRes.id;
    }

    return execRes;
  }

  requireParam(key) {
    if (this.params[key] === undefined || this.params[key] === null || this.params[key] === '') {
      throw new Error(`NavigatorNode requires a \`${key}\` parameter for \`${this.params.action}\`.`);
    }
  }

  async ensureOrchestrator(baseUrl) {
    const startupWindowMs = Number(this.params.orchestratorWaitMs ?? 12000);

    try {
      const instances = await this.requestJson(baseUrl, '/instances');
      return {
        status: 'running',
        message: 'PinchTab orchestrator is reachable.',
        instances
      };
    } catch (error) {
      log(`[NavigatorNode] PinchTab orchestrator not reachable at ${baseUrl}: ${error.message}`, this.params.logging);
    }

    if (!this.params.autoStartOrchestrator && this.params.action !== 'ensure_orchestrator') {
      throw new Error(`PinchTab orchestrator is not reachable at ${baseUrl}. Set \`autoStartOrchestrator: true\` to attempt auto-start.`);
    }

    if (!this.params.autoStartOrchestrator && this.params.action === 'ensure_orchestrator') {
      throw new Error(`PinchTab orchestrator is not reachable at ${baseUrl}.`);
    }

    const base = new URL(baseUrl);
    const port = base.port ? Number(base.port) : 9867;
    const env = { ...process.env };
    if (Number.isFinite(port) && port > 0) {
      env.BRIDGE_PORT = String(port);
    }

    log(`[NavigatorNode] Starting PinchTab orchestrator on ${baseUrl}`, this.params.logging);
    await this.startPinchTabProcess(env);

    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < startupWindowMs) {
      try {
        const instances = await this.requestJson(baseUrl, '/instances');
        return {
          status: 'started',
          message: 'PinchTab orchestrator started successfully.',
          instances
        };
      } catch (error) {
        lastError = error;
        await sleep(300);
      }
    }

    throw new Error(`Failed to start PinchTab orchestrator at ${baseUrl} within ${startupWindowMs}ms: ${lastError?.message || 'unknown error'}`);
  }

  async waitInstanceReady(baseUrl, instanceId) {
    const timeoutMs = Number(this.params.waitTimeoutMs ?? 20000);
    const pollIntervalMs = Number(this.params.pollIntervalMs ?? 500);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const statusData = await this.requestJson(baseUrl, `/instances/${encodeURIComponent(instanceId)}`);
      const state = (statusData?.status || '').toLowerCase();
      if (state === 'running' || state === 'chrome_ready') {
        return {
          ready: true,
          waitedMs: Date.now() - startedAt,
          instance: statusData
        };
      }
      await sleep(pollIntervalMs);
    }

    const latestStatus = await this.requestJson(baseUrl, `/instances/${encodeURIComponent(instanceId)}`);
    return {
      ready: false,
      waitedMs: timeoutMs,
      instance: latestStatus
    };
  }

  async startPinchTabProcess(env) {
    await new Promise((resolve, reject) => {
      const proc = spawn('pinchtab', [], {
        detached: true,
        stdio: 'ignore',
        env
      });

      let settled = false;

      proc.once('error', (error) => {
        if (settled) return;
        settled = true;
        reject(new Error(`Unable to launch 'pinchtab': ${error.message}`));
      });

      proc.once('spawn', () => {
        if (settled) return;
        settled = true;
        proc.unref();
        resolve();
      });
    });
  }

  async requestJson(baseUrl, route, method = 'GET', body) {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} (${method} ${route}) ${errorBody}`);
    }

    if (response.status === 204) {
      return { ok: true };
    }

    return await response.json();
  }

  async requestText(baseUrl, route, method = 'GET') {
    const response = await fetch(`${baseUrl}${route}`, { method });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} (${method} ${route}) ${errorBody}`);
    }
    return await response.text();
  }

  async requestBinary(baseUrl, route, options = {}) {
    const response = await fetch(`${baseUrl}${route}`);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText} (GET ${route}) ${errorBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const outputPath = this.params.outputPath;

    if (outputPath) {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, buffer);
    }

    const result = {
      contentType: response.headers.get('content-type') || null,
      sizeBytes: buffer.byteLength,
      outputPath: outputPath || null,
      extension: options.defaultFileExtension || null
    };

    if (this.params.includeBase64) {
      result.base64 = buffer.toString('base64');
    }

    return result;
  }
}
