import { type ExecFileSyncOptions, execFileSync } from 'node:child_process';

export type CommandInvocation = {
  command: string;
  args: string[];
  shell: boolean;
};

type ResolvePnpmOptions = {
  env?: NodeJS.ProcessEnv;
  execPath?: string;
  platform?: NodeJS.Platform;
};

const WINDOWS_SHELL_SHIM = /\.(?:cmd|bat)$/i;
const WINDOWS_EXECUTABLE = /\.(?:cmd|bat|com|exe)$/i;

function isPnpmExecPath(value: string): boolean {
  const normalized = value.replaceAll('\\', '/').toLowerCase();
  return (
    normalized.endsWith('/pnpm.cjs') ||
    normalized.endsWith('/pnpm.js') ||
    normalized.includes('/pnpm/bin/pnpm.cjs') ||
    normalized.includes('/pnpm/dist/pnpm.cjs')
  );
}

export function commandForPlatform(
  command: string,
  platform: NodeJS.Platform = process.platform,
): string {
  if (command === process.execPath) return command;
  if (platform !== 'win32') return command;
  if (WINDOWS_EXECUTABLE.test(command)) return command;
  return `${command}.cmd`;
}

export function resolveCommandInvocation(
  command: string,
  args: string[],
  platform: NodeJS.Platform = process.platform,
): CommandInvocation {
  const resolvedCommand = commandForPlatform(command, platform);
  return {
    command: resolvedCommand,
    args,
    shell: platform === 'win32' && WINDOWS_SHELL_SHIM.test(resolvedCommand),
  };
}

export function resolvePnpmInvocation(
  args: string[],
  options: ResolvePnpmOptions = {},
): CommandInvocation {
  const env = options.env ?? process.env;
  const execPath = options.execPath ?? process.execPath;

  if (env.npm_execpath && isPnpmExecPath(env.npm_execpath)) {
    return {
      command: execPath,
      args: [env.npm_execpath, ...args],
      shell: false,
    };
  }

  return resolveCommandInvocation('pnpm', args, options.platform);
}

export function run(
  command: string,
  args: string[],
  options: ExecFileSyncOptions = {},
): Buffer | string {
  const invocation = resolveCommandInvocation(command, args);

  return execFileSync(invocation.command, invocation.args, {
    stdio: 'inherit',
    ...options,
    shell: options.shell ?? invocation.shell,
  });
}

export function pnpm(args: string[], options: ExecFileSyncOptions = {}): Buffer | string {
  const invocation = resolvePnpmInvocation(args);

  return execFileSync(invocation.command, invocation.args, {
    stdio: 'inherit',
    ...options,
    shell: options.shell ?? invocation.shell,
  });
}
