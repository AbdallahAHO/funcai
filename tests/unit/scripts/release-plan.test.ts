import { describe, expect, it } from 'vitest';
import {
  bumpVersion,
  determineVersionBump,
  formatChangelog,
  parseCommitLog,
} from '../../../scripts/release-plan';

describe('release planning', () => {
  it('parses git log entries without losing commit subjects', () => {
    expect(
      parseCommitLog(`
abc123456789 feat: add tracing
def987654321 fix(core): repair retry metadata
`),
    ).toEqual([
      { hash: 'abc123456789', subject: 'feat: add tracing' },
      { hash: 'def987654321', subject: 'fix(core): repair retry metadata' },
    ]);
  });

  it('uses the highest conventional semver bump', () => {
    expect(determineVersionBump(['fix: repair retry', 'feat: add tracing'])).toBe('minor');
    expect(determineVersionBump(['feat!: replace provider contract', 'fix: repair retry'])).toBe(
      'major',
    );
    expect(determineVersionBump(['docs: update readme', 'ci: tune release workflow'])).toBe('none');
  });

  it('bumps plain package versions deterministically', () => {
    expect(bumpVersion('1.4.2', 'patch')).toBe('1.4.3');
    expect(bumpVersion('1.4.2', 'minor')).toBe('1.5.0');
    expect(bumpVersion('1.4.2', 'major')).toBe('2.0.0');
  });

  it('formats release notes by user-facing change type', () => {
    const changelog = formatChangelog({
      commits: parseCommitLog(`
111111111111 feat: add langfuse tracing integration (#12)
222222222222 fix(provider): preserve OpenRouter cost metadata
333333333333 ci: harden release automation
`),
      newVersion: '1.5.0',
      previousTag: 'v1.4.2',
      repository: 'AbdallahAHO/funcai',
    });

    expect(changelog).toContain('### Features');
    expect(changelog).toContain('- add langfuse tracing integration (#12) (`1111111`)');
    expect(changelog).toContain('### Fixes');
    expect(changelog).toContain('- preserve OpenRouter cost metadata (`2222222`)');
    expect(changelog).not.toContain('harden release automation');
    expect(changelog).toContain(
      '**Full Changelog**: https://github.com/AbdallahAHO/funcai/compare/v1.4.2...v1.5.0',
    );
  });
});
