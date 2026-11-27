import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const npmCommand = ['npm'];
const tmp = path.join(os.tmpdir(), `qflow-prepublish-${crypto.randomUUID()}`);
const consumer = path.join(tmp, 'consumer');
const bunConsumer = path.join(tmp, 'bun-consumer');
const optionalPackages = [
  '@serialport/parser-readline',
  'ajv',
  'ajv-formats',
  'cheerio',
  'node-cron',
  'playwright',
  'serialport',
  'simple-git',
  'ssh2',
  'webview-bun',
  'ws',
  'xlsx',
];

function assertNoOptionalPackages(label, directory) {
  for (const packageName of optionalPackages) {
    if (existsSync(path.join(directory, 'node_modules', packageName))) {
      throw new Error(`${label}: ${packageName} was installed without opt-in`);
    }
  }
}

// `npm publish` leaks config such as npm_config_dry_run into lifecycle
// scripts. The verifier must run its own pack/install for real.
function npmEnv() {
  const env = { ...process.env };
  delete env.npm_config_dry_run;
  delete env.npm_config_pack_destination;
  return env;
}

function run(command, args, cwd, { capture = false, env = process.env } = {}) {
  const cmd = Array.isArray(command) ? command : [command];
  const result = Bun.spawnSync({
    cmd: [...cmd, ...args],
    cwd,
    env,
    stdout: capture ? 'pipe' : 'inherit',
    stderr: capture ? 'pipe' : 'inherit',
  });
  const output = {
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
  };
  if (result.exitCode !== 0) {
    throw new Error(
      `${[...cmd, ...args].join(' ')} failed (exit ${result.exitCode})\n${output.stdout}${output.stderr}`
    );
  }
  return output;
}

const smokeSource = `
const subpaths = [
  ['@fractal-solutions/qflow', ['Node', 'Flow', 'AsyncNode', 'AsyncFlow']],
  ['@fractal-solutions/qflow/nodes', ['ReplaySafeNode', 'WaitForApprovalNode', 'ScheduleNode', 'BudgetNode', 'MemoryStoreNode']],
  ['@fractal-solutions/qflow/agent', ['AgentNode', 'AgentEngine']],
  ['@fractal-solutions/qflow/mcp', ['QFlowMCPServer']],
  ['@fractal-solutions/qflow/streaming', ['streamChatCompletions']],
  ['@fractal-solutions/qflow/durable', ['DurableFlow', 'SQLiteCheckpointer', 'WaitForApprovalNode', 'BudgetTracker']],
  ['@fractal-solutions/qflow/testing', ['recordFlow', 'MockNode']],
  ['@fractal-solutions/qflow/graph', ['MapNode', 'BranchNode']],
  ['@fractal-solutions/qflow/trace', ['normalizeTrace', 'writeTraceFile']],
  ['@fractal-solutions/qflow/optional', ['loadOptional']],
  ['@fractal-solutions/qflow/logger', ['log', 'LogLevel']],
  ['@fractal-solutions/qflow/llm', ['LLMNode', 'LLMAdapter']],
  ['@fractal-solutions/qflow/tool-spec', ['ToolSpec', 'ToolRegistry']],
  ['@fractal-solutions/qflow/contracts', ['StateContract', 'defineState']],
  ['@fractal-solutions/qflow/side-effects', ['ReplaySafeNode', 'SideEffectClaimedError']],
  ['@fractal-solutions/qflow/eval', ['AssertNode', 'ReplayNode']],
  ['@fractal-solutions/qflow/bun', ['BunSpawnNode', 'SQLiteQueryNode']],
  ['@fractal-solutions/qflow/approval', ['WaitForApprovalNode']],
  ['@fractal-solutions/qflow/schedule', ['ScheduleNode', 'nextCronTime']],
  ['@fractal-solutions/qflow/budget', ['BudgetTracker', 'BudgetNode', 'BudgetExceededError']],
  ['@fractal-solutions/qflow/memory', ['MemoryStoreNode', 'SQLiteMemoryStore']],
];
for (const [specifier, names] of subpaths) {
  const mod = await import(specifier);
  const missing = names.filter(name => !(name in mod));
  if (missing.length) throw new Error(specifier + ': missing ' + missing.join(', '));
}
console.log('All ' + subpaths.length + ' published subpaths import correctly.');
`;

try {
  console.log('[verify-package] 1/5 tests');
  run(process.execPath, ['test', 'tests'], root);

  console.log('[verify-package] 2/5 build');
  run(process.execPath, ['run', 'build'], root);

  console.log('[verify-package] 3/5 pack');
  mkdirSync(tmp, { recursive: true });
  const packed = run(npmCommand, ['pack', '--pack-destination', tmp, '--silent'], root, {
    capture: true,
    env: npmEnv(),
  });
  const tarball = packed.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  if (!tarball?.endsWith('.tgz')) throw new Error(`Could not read tarball name from npm pack: ${packed.stdout}`);
  console.log(`[verify-package]   ${tarball}`);

  console.log('[verify-package] 4/5 install tarball in clean npm and Bun consumers (runs postinstall)');
  mkdirSync(consumer, { recursive: true });
  writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ name: 'qflow-package-smoke', version: '1.0.0', private: true, type: 'module' }, null, 2)
  );
  run(npmCommand, [
    'install', path.join(tmp, tarball), '--no-audit', '--no-fund',
  ], consumer, { env: npmEnv() });
  assertNoOptionalPackages('npm consumer', consumer);
  if (existsSync(path.join(consumer, 'node_modules', 'typescript'))) {
    throw new Error('typescript was installed for the npm consumer; it must stay a devDependency.');
  }

  mkdirSync(bunConsumer, { recursive: true });
  writeFileSync(
    path.join(bunConsumer, 'package.json'),
    JSON.stringify({ name: 'qflow-package-smoke-bun', version: '1.0.0', private: true, type: 'module' }, null, 2)
  );
  run(['bun'], ['add', path.join(tmp, tarball)], bunConsumer);
  assertNoOptionalPackages('Bun consumer', bunConsumer);
  if (existsSync(path.join(bunConsumer, 'node_modules', 'typescript'))) {
    throw new Error('typescript was installed for the Bun consumer; it must stay a devDependency.');
  }

  console.log('[verify-package] 5/5 import every published subpath');
  writeFileSync(path.join(consumer, 'smoke.js'), smokeSource);
  run(process.execPath, ['smoke.js'], consumer);

  console.log('[verify-package] Package is ready to publish.');
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[verify-package] Could not remove ${tmp}: ${error.message}`);
  }
}
