import { type ExecFileSyncOptions, execFileSync } from 'node:child_process';

export function commandForPlatform(command: string): string {
  if (command === process.execPath) return command;
  if (process.platform !== 'win32') return command;
  if (command.endsWith('.cmd') || command.endsWith('.exe')) return command;
  return `${command}.cmd`;
}

export function run(
  command: string,
  args: string[],
  options: ExecFileSyncOptions = {},
): Buffer | string {
  return execFileSync(commandForPlatform(command), args, {
    stdio: 'inherit',
    ...options,
  });
}

export function pnpm(args: string[], options: ExecFileSyncOptions = {}): Buffer | string {
  return run('pnpm', args, options);
}
