#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './process';

type RegistryRecord = {
  name?: unknown;
  provider?: unknown;
  description?: unknown;
  contextLength?: unknown;
  maxCompletionTokens?: unknown;
  pricing?: unknown;
  modalities?: unknown;
  capabilities?: unknown;
  structuredOutputSource?: unknown;
  sourceUrl?: unknown;
};

type Registry = Record<string, RegistryRecord>;

type RegistryConfig = {
  title: string;
  relativePath: string;
  exportName: string;
};

type RegistryDiff = {
  config: RegistryConfig;
  added: string[];
  removed: string[];
  changed: Array<{ id: string; changes: string[] }>;
  total: number;
  previous: Registry;
  current: Registry;
};

const REGISTRIES: RegistryConfig[] = [
  {
    title: 'OpenRouter',
    relativePath: 'src/provider/openrouter/models.ts',
    exportName: 'OPENROUTER_MODELS',
  },
  {
    title: 'Cloudflare Workers AI',
    relativePath: 'src/provider/cloudflare/models.ts',
    exportName: 'CLOUDFLARE_MODELS',
  },
];

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;

  const value = args[index + 1];
  if (!value) throw new Error(`Missing value for ${name}`);

  return value;
}

function parseArgs(args: string[]): { baseDir?: string; output?: string } {
  const baseDir = getArgValue(args, '--base-dir');
  const output = getArgValue(args, '--output');

  return {
    baseDir: baseDir ? resolve(baseDir) : undefined,
    output: output ? resolve(output) : undefined,
  };
}

function loadBaselineRegistrySource(
  baseDir: string | undefined,
  relativePath: string,
): string | null {
  if (!baseDir) return null;

  const baselinePath = resolve(baseDir, relativePath);
  if (!existsSync(baselinePath)) return null;

  return readFileSync(baselinePath, 'utf8');
}

function loadPreviousRegistrySource(relativePath: string): string | null {
  try {
    return run('git', ['show', `HEAD:${relativePath}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }) as string;
  } catch {
    return null;
  }
}

function loadPreviousRegistrySourceOrBaseline(
  baseDir: string | undefined,
  relativePath: string,
): string | null {
  return (
    loadBaselineRegistrySource(baseDir, relativePath) ?? loadPreviousRegistrySource(relativePath)
  );
}

async function loadRegistries(
  config: RegistryConfig,
  baseDir: string | undefined,
): Promise<{ previous: Registry; current: Registry }> {
  const currentModule = (await import(pathToFileURL(resolve(config.relativePath)).href)) as Record<
    string,
    unknown
  >;
  const current = readRegistryExport(currentModule, config.exportName);
  const previousSource = loadPreviousRegistrySourceOrBaseline(baseDir, config.relativePath);
  const previous = previousSource
    ? await importRegistryFromSource(previousSource, `${config.exportName}.ts`, config.exportName)
    : {};

  return { previous, current };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRegistryExport(module: Record<string, unknown>, exportName: string): Registry {
  const value = module[exportName];
  if (!isRecord(value)) {
    throw new Error(`Expected ${exportName} to be an exported registry object`);
  }
  return value as Registry;
}

async function importRegistryFromSource(
  source: string,
  fileName: string,
  exportName: string,
): Promise<Registry> {
  const tempDir = mkdtempSync(join(tmpdir(), 'funcai-model-report-'));
  const tempFile = join(tempDir, fileName);

  writeFileSync(tempFile, source, 'utf8');

  try {
    const module = (await import(pathToFileURL(tempFile).href)) as Record<string, unknown>;
    return readRegistryExport(module, exportName);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function formatMoney(value: unknown): string {
  if (typeof value !== 'number') return 'n/a';
  return `$${value}/M`;
}

function formatNumber(value: unknown): string {
  if (value === null) return 'n/a';
  if (typeof value !== 'number') return String(value ?? 'n/a');
  return new Intl.NumberFormat('en-US').format(value);
}

function formatScalar(value: unknown): string {
  if (value === null) return 'n/a';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  return String(value ?? 'n/a');
}

function formatModalities(value: unknown): string {
  if (!Array.isArray(value)) return 'n/a';
  return value.map(String).sort().join(', ');
}

function getPricing(model: RegistryRecord): Record<string, unknown> {
  return isRecord(model.pricing) ? model.pricing : {};
}

function getCapabilities(model: RegistryRecord): Record<string, unknown> {
  return isRecord(model.capabilities) ? model.capabilities : {};
}

function formatCapabilities(model: RegistryRecord): string {
  const enabled = Object.entries(getCapabilities(model))
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .sort();

  return enabled.length > 0 ? enabled.join(', ') : 'none';
}

function diffField(
  changes: string[],
  label: string,
  previous: unknown,
  current: unknown,
  formatter: (value: unknown) => string = formatScalar,
): void {
  const previousValue = formatter(previous);
  const currentValue = formatter(current);
  if (previousValue !== currentValue) {
    changes.push(`${label}: \`${previousValue}\` -> \`${currentValue}\``);
  }
}

function diffPricing(previous: RegistryRecord, current: RegistryRecord): string[] {
  const previousPricing = getPricing(previous);
  const currentPricing = getPricing(current);
  const keys = [...new Set([...Object.keys(previousPricing), ...Object.keys(currentPricing)])]
    .filter((key) => key !== 'raw')
    .sort();

  const changes: string[] = [];
  for (const key of keys) {
    diffField(changes, `pricing.${key}`, previousPricing[key], currentPricing[key], formatMoney);
  }

  if (previousPricing.raw !== currentPricing.raw) {
    changes.push('pricing source updated');
  }

  return changes;
}

function diffCapabilities(previous: RegistryRecord, current: RegistryRecord): string[] {
  const previousCapabilities = getCapabilities(previous);
  const currentCapabilities = getCapabilities(current);
  const keys = [
    ...new Set([...Object.keys(previousCapabilities), ...Object.keys(currentCapabilities)]),
  ].sort();

  const changes: string[] = [];
  for (const key of keys) {
    diffField(changes, `capability.${key}`, previousCapabilities[key], currentCapabilities[key]);
  }

  return changes;
}

function diffModel(previous: RegistryRecord, current: RegistryRecord): string[] {
  const changes: string[] = [];

  diffField(changes, 'name', previous.name, current.name);
  diffField(changes, 'provider', previous.provider, current.provider);
  diffField(changes, 'context', previous.contextLength, current.contextLength, formatNumber);
  diffField(
    changes,
    'max completion',
    previous.maxCompletionTokens,
    current.maxCompletionTokens,
    formatNumber,
  );
  diffField(changes, 'modalities', previous.modalities, current.modalities, formatModalities);
  diffField(
    changes,
    'structured source',
    previous.structuredOutputSource,
    current.structuredOutputSource,
  );

  changes.push(...diffPricing(previous, current));
  changes.push(...diffCapabilities(previous, current));

  if (previous.description !== current.description) {
    changes.push('description updated');
  }

  if (previous.sourceUrl !== current.sourceUrl) {
    changes.push('source URL updated');
  }

  return changes;
}

function buildDiff(config: RegistryConfig, previous: Registry, current: Registry): RegistryDiff {
  const previousIds = new Set(Object.keys(previous));
  const currentIds = new Set(Object.keys(current));

  const added = [...currentIds].filter((id) => !previousIds.has(id)).sort();
  const removed = [...previousIds].filter((id) => !currentIds.has(id)).sort();
  const changed = [...currentIds]
    .filter((id) => previousIds.has(id))
    .map((id) => ({ id, changes: diffModel(previous[id], current[id]) }))
    .filter((entry) => entry.changes.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    config,
    added,
    removed,
    changed,
    total: Object.keys(current).length,
    previous,
    current,
  };
}

function renderModelTable(title: string, ids: string[], registry: Registry): string[] {
  if (ids.length === 0) return [];

  const lines = [
    `### ${title}`,
    '',
    '| Model | Provider | Prompt | Completion | Modalities | Capabilities |',
    '| --- | --- | ---: | ---: | --- | --- |',
  ];

  for (const id of ids) {
    const model = registry[id];
    const pricing = getPricing(model);
    lines.push(
      `| \`${id}\` | ${formatScalar(model.provider)} | ${formatMoney(pricing.promptPerMToken)} | ${formatMoney(pricing.completionPerMToken)} | ${formatModalities(model.modalities)} | ${formatCapabilities(model)} |`,
    );
  }

  lines.push('');
  return lines;
}

function renderChangedSection(changed: Array<{ id: string; changes: string[] }>): string[] {
  if (changed.length === 0) return [];

  const lines = ['### Updated Models', ''];
  for (const entry of changed) {
    lines.push(`#### \`${entry.id}\``, '');
    for (const change of entry.changes) {
      lines.push(`- ${change}`);
    }
    lines.push('');
  }
  return lines;
}

function renderRegistrySection(diff: RegistryDiff): string[] {
  const lines = [
    `## ${diff.config.title}`,
    '',
    `- Added: ${diff.added.length}`,
    `- Removed: ${diff.removed.length}`,
    `- Updated: ${diff.changed.length}`,
    `- Total models: ${diff.total}`,
    '',
  ];

  if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
    lines.push('No registry changes were detected.', '');
    return lines;
  }

  lines.push(...renderModelTable('Added Models', diff.added, diff.current));
  lines.push(...renderModelTable('Removed Models', diff.removed, diff.previous));
  lines.push(...renderChangedSection(diff.changed));
  return lines;
}

function buildReport(diffs: RegistryDiff[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Weekly model registry refresh',
    '',
    `Generated on ${today}. This PR refreshes the generated model registries.`,
    '',
    '## Summary',
    '',
    '| Registry | Added | Removed | Updated | Total |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const diff of diffs) {
    lines.push(
      `| ${diff.config.title} | ${diff.added.length} | ${diff.removed.length} | ${diff.changed.length} | ${diff.total} |`,
    );
  }

  lines.push('');

  for (const diff of diffs) {
    lines.push(...renderRegistrySection(diff));
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const { baseDir, output } = parseArgs(process.argv.slice(2));
  const diffs: RegistryDiff[] = [];

  for (const config of REGISTRIES) {
    const { previous, current } = await loadRegistries(config, baseDir);
    diffs.push(buildDiff(config, previous, current));
  }

  const report = buildReport(diffs);

  if (output) {
    writeFileSync(output, report, 'utf8');
  } else {
    process.stdout.write(report);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
