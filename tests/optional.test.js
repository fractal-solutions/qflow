import { describe, expect, test } from 'bun:test';
import {
  OPTIONAL_DEPENDENCIES,
  clearOptionalDependencyCache,
  loadOptional,
  optionalDependencyError,
  optionalInstallCommand,
} from '../src/optional.js';

const OPTIONAL_PACKAGES = Object.keys(OPTIONAL_DEPENDENCIES);
const HEAVY_NODE_FILES = [
  'browser_control.js',
  'data_extractor.js',
  'data_validation.js',
  'git.js',
  'hardware_interaction.js',
  'interactive_webview.js',
  'remote_execution.js',
  'scheduler.js',
  'search.js',
  'spreadsheet.js',
  'websockets.js',
  'webview.js',
];

describe('optional integrations', () => {
  test('loader reports the exact install command', () => {
    expect(optionalInstallCommand('playwright')).toBe('bun add --optional playwright');
    const error = optionalDependencyError('xlsx', new Error('missing'));
    expect(error.code).toBe('QFLOW_OPTIONAL_DEPENDENCY_MISSING');
    expect(error.message).toContain('bun add --optional xlsx');
    expect(error.cause.message).toBe('missing');
  });

  test('integrations are declared as optional peers, not installed dependencies', async () => {
    const packageJson = JSON.parse(await Bun.file(new URL('../package.json', import.meta.url)).text());
    expect(packageJson.optionalDependencies).toBeUndefined();
    for (const packageName of OPTIONAL_PACKAGES) {
      expect(packageJson.dependencies?.[packageName]).toBeUndefined();
      expect(packageJson.peerDependencies?.[packageName]).toBeDefined();
      expect(packageJson.peerDependenciesMeta?.[packageName]?.optional).toBe(true);
    }
  });

  test('missing package produces an actionable error', async () => {
    const missing = 'qflow-optional-package-that-does-not-exist';
    clearOptionalDependencyCache(missing);
    let caught;
    try {
      await loadOptional(missing);
    } catch (error) {
      caught = error;
    }
    expect(caught?.code).toBe('QFLOW_OPTIONAL_DEPENDENCY_MISSING');
    expect(caught?.message).toContain(missing);
  });

  test('heavy node modules have no static optional imports', async () => {
    for (const file of HEAVY_NODE_FILES) {
      const source = await Bun.file(new URL(`../src/nodes/${file}`, import.meta.url)).text();
      for (const packageName of OPTIONAL_PACKAGES) {
        expect(source).not.toContain(`from '${packageName}'`);
        expect(source).not.toContain(`from "${packageName}"`);
      }
    }
  });
});
