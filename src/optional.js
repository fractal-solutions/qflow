/**
 * Optional integration packages and a single loader for them.
 *
 * Core qflow imports never load these packages. A node calls `loadOptional()`
 * only when its action actually needs the integration, so consumers install
 * just the capabilities they use.
 */
export const OPTIONAL_DEPENDENCIES = Object.freeze({
  '@serialport/parser-readline': '@serialport/parser-readline',
  ajv: 'ajv',
  'ajv-formats': 'ajv-formats',
  cheerio: 'cheerio',
  'node-cron': 'node-cron',
  playwright: 'playwright',
  serialport: 'serialport',
  'simple-git': 'simple-git',
  ssh2: 'ssh2',
  'webview-bun': 'webview-bun',
  ws: 'ws',
  xlsx: 'xlsx',
});

/** Friendly install command for a given optional package. */
export function optionalInstallCommand(name) {
  const packageName = OPTIONAL_DEPENDENCIES[name] ?? name;
  return `bun add --optional ${packageName}`;
}

/** Create the actionable error thrown when an optional package is unavailable. */
export function optionalDependencyError(name, cause) {
  const error = new Error(
    `[qflow] Optional dependency '${name}' is not installed. ` +
    `Install it with: ${optionalInstallCommand(name)}`,
  );
  error.name = 'OptionalDependencyError';
  error.code = 'QFLOW_OPTIONAL_DEPENDENCY_MISSING';
  error.dependency = name;
  error.installCommand = optionalInstallCommand(name);
  if (cause !== undefined) error.cause = cause;
  return error;
}

const loaders = new Map();

/**
 * Dynamically import an optional package, caching the resolved module.
 * Import failures are reported with the exact Bun command needed to fix them.
 */
export function loadOptional(name) {
  if (!loaders.has(name)) {
    const loader = import(name).catch(cause => {
      loaders.delete(name);
      throw optionalDependencyError(name, cause);
    });
    loaders.set(name, loader);
  }
  return loaders.get(name);
}

/** Clear cached modules. Useful in tests or after installing a package at runtime. */
export function clearOptionalDependencyCache(name) {
  if (name == null) {
    loaders.clear();
    return;
  }
  loaders.delete(name);
}
