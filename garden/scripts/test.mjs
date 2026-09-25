import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = (await readdir(join(root, 'tests'))).sort();
const typed = files.filter((file) => file.endsWith('.test.ts'));
const plain = files.filter((file) => file.endsWith('.test.mjs'));
const output = await mkdtemp(join(tmpdir(), 'serena-tests-'));
try {
  await build({
    entryPoints: typed.map((file) => join(root, 'tests', file)),
    outdir: output,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    platform: 'node',
    format: 'esm',
  });
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--test',
      ...typed.map((file) => join(output, basename(file, '.ts') + '.mjs')),
      ...plain.map((file) => join(root, 'tests', file)),
    ],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
