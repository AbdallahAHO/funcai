import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const command = process.argv[2];
const examplesRoot = resolve(import.meta.dirname, '..');

function isPnpmExecPath(value: string): boolean {
  const normalized = value.replaceAll('\\', '/').toLowerCase();
  return (
    normalized.endsWith('/pnpm.cjs') ||
    normalized.endsWith('/pnpm.js') ||
    normalized.includes('/pnpm/bin/pnpm.cjs') ||
    normalized.includes('/pnpm/dist/pnpm.cjs')
  );
}

function pnpm(script: string): void {
  const npmExecPath = process.env.npm_execpath;
  const command =
    npmExecPath && isPnpmExecPath(npmExecPath)
      ? { file: process.execPath, args: [npmExecPath, script] }
      : { file: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args: [script] };

  execFileSync(command.file, command.args, {
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
