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

function parsePackResult(output: string): PackResult {
  const jsonStart = output.indexOf('[');
  const jsonEnd = output.lastIndexOf(']');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error(`Unable to parse npm pack output:\n${output.trim()}`);
  }

  return JSON.parse(output.slice(jsonStart, jsonEnd + 1)) as PackResult;
}

const [{ filename }] = parsePackResult(String(packOutput));
const tarball = join(root, filename);

function smokeConsumer(label: string, zodSpec: string): void {
  const tempDir = mkdtempSync(join(tmpdir(), `funcai-package-smoke-${label}-`));
  console.log(`\nPackage smoke: ${label} consumer (${zodSpec})`);

  try {
    writeFileSync(join(tempDir, 'package.json'), '{"type":"module","private":true}\n');
    pnpm(['add', tarball, zodSpec, 'typescript', '@types/node', '--ignore-scripts'], {
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

    writeFileSync(
      join(tempDir, 'types.ts'),
      `import { createAiFn, definePrompt, text, type Example } from 'funcai';
import type { Provider } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const schema = z.object({ label: z.string() });
type Output = z.infer<typeof schema>;

const example: Example<Output> = {
  input: 'hello',
  output: { label: 'greeting' },
};

const prompt = definePrompt({
  id: 'compat',
  model: 'google/gemini-3.1-flash-lite-preview',
  system: 'Return a label.',
});

const provider: Provider = openrouter({ apiKey: 'test-key' });
const ai = createAiFn({ provider });
const fn = ai.fn({
  prompt,
  schema,
  examples: [example],
  input: (value: string) => text(value).text,
});

const result: Promise<Output> = fn('hello');
void result;
`,
    );

    writeFileSync(
      join(tempDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            types: ['node'],
            skipLibCheck: true,
            noEmit: true,
          },
          include: ['types.ts'],
        },
        null,
        2,
      ),
    );

    run(process.execPath, ['esm.mjs'], { cwd: tempDir, stdio: 'inherit' });
    run(process.execPath, ['cjs.cjs'], { cwd: tempDir, stdio: 'inherit' });
    pnpm(['exec', 'tsc', '--noEmit'], { cwd: tempDir, stdio: 'inherit' });
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
  }
}

try {
  smokeConsumer('latest-zod', 'zod@latest');
  smokeConsumer('zod3-peer-floor', 'zod@3.25.76');
} finally {
  rmSync(tarball, { force: true });
}
