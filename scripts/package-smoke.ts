import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pnpm, run } from './process';

type PackResult = Array<{ filename: string }>;

const root = resolve(import.meta.dirname, '..');
const packOutput = run('npm', ['pack', '--json', '--ignore-scripts'], {
  cwd: root,
  encoding: 'utf-8',
  stdio: 'pipe',
});
const [{ filename }] = JSON.parse(String(packOutput)) as PackResult;
const tarball = join(root, filename);
const tempDir = mkdtempSync(join(tmpdir(), 'funcai-package-smoke-'));

try {
  writeFileSync(join(tempDir, 'package.json'), '{"type":"module","private":true}\n');
  pnpm(['add', tarball, 'zod', '--ignore-scripts'], {
    cwd: tempDir,
    stdio: 'pipe',
  });

  writeFileSync(
    join(tempDir, 'esm.mjs'),
    `import { createAiFn, pdf, text } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { validateExamples } from 'funcai/test';

console.log(typeof createAiFn, typeof openrouter, text('x').type, pdf('x').mediaType, typeof validateExamples);
`,
  );

  writeFileSync(
    join(tempDir, 'cjs.cjs'),
    `const { createAiFn, text } = require('funcai');
const { openrouter } = require('funcai/providers/openrouter');

console.log(typeof createAiFn, typeof openrouter, text('x').type);
`,
  );

  run(process.execPath, ['esm.mjs'], { cwd: tempDir, stdio: 'inherit' });
  run(process.execPath, ['cjs.cjs'], { cwd: tempDir, stdio: 'inherit' });
  run(
    process.execPath,
    [
      'node_modules/funcai/dist/bin/funcai.js',
      'models',
      'validate',
      'google/gemini-3.1-flash-lite-preview',
      '--provider',
      'openrouter',
    ],
    { cwd: tempDir, stdio: 'inherit' },
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
  rmSync(tarball, { force: true });
}
