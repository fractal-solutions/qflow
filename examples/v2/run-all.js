/** Run every 2.0 example. Usage: bun examples/v2/run-all.js */
import { fileURLToPath } from 'node:url';

const examples = [
  'replay-safe-checkout.js',
  'unified-tool-contract.js',
  'dataflow-eval-regression.js',
  'bun-stream-ingest.js',
];

for (const name of examples) {
  console.log(`\n=== ${name} ===`);
  const path = fileURLToPath(new URL(name, import.meta.url));
  const child = Bun.spawnSync({ cmd: [process.execPath, path], stdout: 'inherit', stderr: 'inherit' });
  if (child.exitCode !== 0) {
    console.error(`FAILED: ${name}`);
    process.exit(child.exitCode ?? 1);
  }
}
console.log('\nAll 2.0 examples completed.');
