import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as p from '@clack/prompts';
import { isFuncaiError } from '@/core/errors';

type RunnableAiFn = {
  detailed: (input: string) => Promise<unknown>;
};

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function firstPositional(args: string[]): string | undefined {
  const flagsWithValues = new Set(['--export', '--input']);

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg) continue;
    if (flagsWithValues.has(arg)) {
      index++;
      continue;
    }
    if (!arg.startsWith('--')) return arg;
  }

  return undefined;
}

function findEntry(targetDir: string): string | null {
  const candidates = ['index.js', 'dist/index.js', 'index.mjs', 'index.cjs', 'index.ts'];
  const entry = candidates.map((file) => resolve(targetDir, file)).find(existsSync);
  return entry ?? null;
}

function isRunnableAiFn(value: unknown): value is RunnableAiFn {
  return (
    typeof value === 'function' && typeof (value as Partial<RunnableAiFn>).detailed === 'function'
  );
}

async function readInput(args: string[]): Promise<string> {
  const inline = readFlag(args, '--input');
  if (inline) return inline;

  const value = await p.text({
    message: 'Input',
    placeholder: 'Paste the text you want to send to the AI function',
  });

  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  return value;
}

function formatUnknownError(error: unknown): string {
  if (isFuncaiError(error)) return `${error.code}: ${error.message}\nHint: ${error.hint}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runTry(args: string[]): Promise<void> {
  const target = firstPositional(args) ?? '.';
  const exportName = readFlag(args, '--export');
  const targetDir = resolve(target);
  const entry = findEntry(targetDir);

  if (!entry) {
    console.error(`No runnable entry found in ${targetDir}. Expected index.js or dist/index.js.`);
    process.exit(1);
  }

  if (entry.endsWith('.ts')) {
    console.error(
      `Found ${entry}, but this CLI cannot import TypeScript directly. Build the feature first or run its tests with tsx/vitest.`,
    );
    process.exit(1);
  }

  const mod = await import(pathToFileURL(entry).href);
  const candidate = exportName
    ? mod[exportName]
    : Object.values(mod).find((value) => isRunnableAiFn(value));

  if (!isRunnableAiFn(candidate)) {
    console.error(
      exportName
        ? `Export "${exportName}" is not a funcai function.`
        : 'No funcai function export found. Pass --export <name> if the function is not the first export.',
    );
    process.exit(1);
  }

  try {
    const input = await readInput(args);
    const result = await candidate.detailed(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(formatUnknownError(error));
    process.exit(1);
  }
}
