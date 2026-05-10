import { describe, expect, it } from 'vitest';
import {
  commandForPlatform,
  resolveCommandInvocation,
  resolvePnpmInvocation,
} from '../../../scripts/process';

describe('process runner helpers', () => {
  it('keeps regular commands unchanged outside Windows', () => {
    expect(commandForPlatform('pnpm', 'linux')).toBe('pnpm');
    expect(resolveCommandInvocation('pnpm', ['check'], 'linux')).toEqual({
      command: 'pnpm',
      args: ['check'],
      shell: false,
    });
  });

  it('uses a shell for Windows command shims', () => {
    expect(commandForPlatform('pnpm', 'win32')).toBe('pnpm.cmd');
    expect(resolveCommandInvocation('pnpm', ['check'], 'win32')).toEqual({
      command: 'pnpm.cmd',
      args: ['check'],
      shell: true,
    });
  });

  it('does not shell native Windows executables', () => {
    expect(commandForPlatform('node.exe', 'win32')).toBe('node.exe');
    expect(resolveCommandInvocation('node.exe', ['script.js'], 'win32')).toEqual({
      command: 'node.exe',
      args: ['script.js'],
      shell: false,
    });
  });

  it('prefers the active pnpm CLI over the Windows shim when available', () => {
    expect(
      resolvePnpmInvocation(['check'], {
        env: {
          npm_execpath: 'C:\\Users\\runneradmin\\setup-pnpm\\node_modules\\pnpm\\bin\\pnpm.cjs',
        },
        execPath: 'C:\\hostedtoolcache\\windows\\node\\22\\x64\\node.exe',
        platform: 'win32',
      }),
    ).toEqual({
      command: 'C:\\hostedtoolcache\\windows\\node\\22\\x64\\node.exe',
      args: ['C:\\Users\\runneradmin\\setup-pnpm\\node_modules\\pnpm\\bin\\pnpm.cjs', 'check'],
      shell: false,
    });
  });

  it('falls back to the platform command when not launched by pnpm', () => {
    expect(resolvePnpmInvocation(['check'], { env: {}, platform: 'win32' })).toEqual({
      command: 'pnpm.cmd',
      args: ['check'],
      shell: true,
    });
  });
});
