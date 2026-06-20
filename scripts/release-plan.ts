import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export type VersionBump = 'major' | 'minor' | 'patch' | 'none';

export type CommitEntry = {
  hash: string;
  subject: string;
};

type CommitGroup = 'breaking' | 'features' | 'fixes' | 'other' | 'ignored';

type ChangelogOptions = {
  commits: CommitEntry[];
  newVersion: string;
  previousTag?: string;
  repository?: string;
};

const COMMIT_LINE_PATTERN = /^(?<hash>[0-9a-f]{7,40}|0{40})\s+(?<subject>.+)$/i;
const CONVENTIONAL_SUBJECT_PATTERN =
  /^(?<type>[a-z]+)(?:\([^)]+\))?(?<breaking>!)?:\s*(?<summary>.+)$/i;
const FALLBACK_HASH = '0000000000000000000000000000000000000000';

/** Parses `git log --pretty=format:"%H %s"` output for release planning. */
export function parseCommitLog(rawLog: string): CommitEntry[] {
  return rawLog
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = COMMIT_LINE_PATTERN.exec(line);

      if (!match?.groups) {
        return { hash: FALLBACK_HASH, subject: line };
      }

      return {
        hash: match.groups.hash,
        subject: match.groups.subject,
      };
    });
}

/** Determines the semver bump from conventional commit subjects. */
export function determineVersionBump(subjects: string[]): VersionBump {
  let bump: VersionBump = 'none';

  for (const subject of subjects) {
    const commit = classifyCommit(subject);

    if (commit.breaking) return 'major';
    if (commit.type === 'feat') bump = bump === 'major' ? bump : 'minor';
    if (commit.type === 'fix' && bump === 'none') bump = 'patch';
  }

  return bump;
}

/** Applies a semver bump to a plain `x.y.z` package version. */
export function bumpVersion(currentVersion: string, bump: Exclude<VersionBump, 'none'>): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);

  if (!match) {
    throw new Error(`Expected a plain semver version, got: ${currentVersion}`);
  }

  const [, currentMajor, currentMinor, currentPatch] = match;
  let major = Number(currentMajor);
  let minor = Number(currentMinor);
  let patch = Number(currentPatch);

  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

/** Builds the GitHub Release body used by both prepared release PRs and publish jobs. */
export function formatChangelog({
  commits,
  newVersion,
  previousTag,
  repository,
}: ChangelogOptions): string {
  const groups: Record<Exclude<CommitGroup, 'ignored'>, string[]> = {
    breaking: [],
    features: [],
    fixes: [],
    other: [],
  };

  for (const entry of commits) {
    const commit = classifyCommit(entry.subject);
    if (commit.group === 'ignored') continue;

    groups[commit.group].push(`- ${commit.summary} (\`${entry.hash.slice(0, 7)}\`)`);
  }

  const sections = [
    ['Breaking Changes', groups.breaking],
    ['Features', groups.features],
    ['Fixes', groups.fixes],
    ['Other', groups.other],
  ]
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => `### ${title}\n\n${lines.join('\n')}`);

  if (sections.length === 0) {
    sections.push('No user-facing changes.');
  }

  if (previousTag && repository) {
    sections.push(
      `**Full Changelog**: https://github.com/${repository}/compare/${previousTag}...v${newVersion}`,
    );
  }

  return `${sections.join('\n\n')}\n`;
}

function classifyCommit(subject: string): {
  breaking: boolean;
  group: CommitGroup;
  summary: string;
  type: string | undefined;
} {
  const match = CONVENTIONAL_SUBJECT_PATTERN.exec(subject);
  const type = match?.groups?.type?.toLowerCase();
  const breaking = Boolean(match?.groups?.breaking) || /BREAKING CHANGE/i.test(subject);
  const summary = match?.groups?.summary ?? subject;

  if (breaking) return { breaking, group: 'breaking', summary, type };
  if (type === 'feat') return { breaking, group: 'features', summary, type };
  if (type === 'fix') return { breaking, group: 'fixes', summary, type };
  if (type === 'perf' || type === 'refactor') {
    return { breaking, group: 'other', summary, type };
  }

  return { breaking, group: 'ignored', summary, type };
}

function requiredOption(args: string[], flag: string): string {
  const value = optionalOption(args, flag);
  if (value === undefined || value === '') throw new Error(`Missing required option: ${flag}`);
  return value;
}

function optionalOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function appendOutputs(outputFile: string | undefined, values: Record<string, string>): void {
  if (!outputFile) return;

  appendFileSync(
    outputFile,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')}\n`,
  );
}

function runCli(): void {
  const args = process.argv.slice(2);
  const currentVersion = requiredOption(args, '--current-version');
  const commitsFile = requiredOption(args, '--commits-file');
  const previousTag = optionalOption(args, '--previous-tag');
  const forcedVersion = optionalOption(args, '--new-version');
  const repository = optionalOption(args, '--repository');
  const changelogFile = requiredOption(args, '--changelog-file');
  const outputFile = optionalOption(args, '--output-file') ?? process.env.GITHUB_OUTPUT;

  const commits = parseCommitLog(readFileSync(commitsFile, 'utf8'));
  const bump = forcedVersion
    ? 'none'
    : determineVersionBump(commits.map((commit) => commit.subject));

  if (!forcedVersion && bump === 'none') {
    appendOutputs(outputFile, { skip: 'true', bump: 'none' });
    writeFileSync(changelogFile, '');
    console.log('No releasable commits found.');
    return;
  }

  const newVersion =
    forcedVersion ?? bumpVersion(currentVersion, bump as Exclude<VersionBump, 'none'>);
  const changelog = formatChangelog({
    commits,
    newVersion,
    previousTag,
    repository,
  });

  writeFileSync(changelogFile, changelog);
  appendOutputs(outputFile, {
    bump,
    new_version: newVersion,
    skip: 'false',
    tag: `v${newVersion}`,
  });

  console.log(`Release plan: ${currentVersion} -> ${newVersion} (${bump})`);
  console.log(changelog);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
