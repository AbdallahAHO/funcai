import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const command = process.argv[2];
const examplesRoot = resolve(import.meta.dirname, '..');

function commandForPlatform(commandName: string): string {
  if (process.platform !== 'win32') return commandName;
  if (commandName.endsWith('.cmd') || commandName.endsWith('.exe')) return commandName;
  return `${commandName}.cmd`;
}

function pnpm(script: string): void {
  execFileSync(commandForPlatform('pnpm'), [script], {
    cwd: examplesRoot,
    stdio: 'inherit',
  });
}

const scriptsByCommand: Record<string, string[]> = {
  'local:all': ['lmstudio:vision', 'ollama:vision', 'local:multilingual'],
  'cloudflare:all': ['cloudflare:basic', 'cloudflare:vision'],
  all: [
    'basic',
    'prompt',
    'typed-input',
    'few-shots',
    'transform',
    'detailed',
    'multimodal',
    'cache:memory',
  ],
};

const scripts = command ? scriptsByCommand[command] : undefined;
if (!scripts) {
  console.error(`Unknown examples command: ${command ?? '(missing)'}`);
  process.exit(1);
}

for (const script of scripts) {
  pnpm(script);
}
