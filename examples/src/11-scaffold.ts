/**
 * 11 — CLI scaffold demo: shows the generated folder structure.
 *
 * The `funcai scaffold` command creates a complete AI feature folder
 * with schema, prompt, few-shots, index, tests, and README — all
 * wired together and ready to run.
 *
 * Three ways to use it:
 *
 *   # Interactive TUI — Enter through everything for a working sentiment classifier
 *   npx funcai scaffold
 *
 *   # One-liner — skip TUI with flags
 *   npx funcai scaffold --name invoice-parser --fields "vendor,amount,currency" -y
 *
 *   # Full bypass — accept all defaults, no prompts
 *   npx funcai scaffold -y
 *
 * This example creates a scaffold in a temp directory, shows the output, and cleans up.
 *
 * Run: pnpm scaffold (no API key needed)
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const tmpDir = join(import.meta.dirname, '../.tmp-scaffold');

// Clean up any previous run
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });

// Run the scaffold command with -y (accept defaults)
console.log('Running: funcai scaffold -y\n');
execSync(`node ${join(import.meta.dirname, '../../dist/bin/funcai.js')} scaffold -y`, {
  cwd: join(import.meta.dirname, '..'),
  stdio: 'inherit',
});

// The scaffold creates a directory named after the feature
const featureDir = join(import.meta.dirname, '../classify-sentiment');

console.log('\n--- Generated files ---\n');

const showFile = (name: string) => {
  const path = join(featureDir, name);
  if (!existsSync(path)) return;
  console.log(`\x1b[36m=== ${name} ===\x1b[0m`);
  console.log(readFileSync(path, 'utf-8'));
};

// Show each generated file
showFile('schema.ts');
showFile('few-shots.ts');
showFile('index.ts');
showFile('classify-sentiment.prompt.md');

// Show test files
const testsDir = join(featureDir, 'tests');
if (existsSync(testsDir)) {
  for (const testFile of readdirSync(testsDir).sort()) {
    showFile(`tests/${testFile}`);
  }
}

showFile('README.md');

// Show the auto-generated prompt.ts (created by running `funcai generate` after scaffold)
showFile('classify-sentiment.prompt.ts');

console.log('\x1b[32m--- Summary ---\x1b[0m\n');
console.log('The scaffold created a fully working AI feature:');
console.log('  - schema.ts          Zod schema with .describe() annotations');
console.log('  - few-shots.ts       Typed examples for model guidance');
console.log('  - index.ts           Callable ai.fn() with JSDoc');
console.log('  - prompt.md          System prompt with YAML frontmatter');
console.log('  - prompt.ts          Auto-generated from prompt.md');
console.log('  - tests/             Unit + integration tests');
console.log('  - README.md          Quick start and customization guide');
console.log('\nNext steps:');
console.log('  cd classify-sentiment && npx vitest run tests/');
console.log('  OPENROUTER_API_KEY=sk-... npx vitest run tests/classify-sentiment.e2e.test.ts');

// Cleanup
rmSync(featureDir, { recursive: true });
