#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type ModelInfo = {
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  maxCompletionTokens: number | null;
  pricing: { promptPerMToken: number; completionPerMToken: number };
  modalities: readonly string[];
  capabilities: { structuredOutput: boolean; tools: boolean; reasoning: boolean };
};

type Registry = Record<string, ModelInfo>;

const REGISTRY_RELATIVE_PATH = 'src/provider/openrouter/models.ts';
const REGISTRY_PATH = resolve('src/provider/openrouter/models.ts');

function parseArgs(args: string[]): { output?: string } {
  const outputIndex = args.indexOf('--output');
  if (outputIndex === -1) return {};

  const output = args[outputIndex + 1];
  if (!output) throw new Error('Missing value for --output');

  return { output: resolve(output) };
}

async function importRegistryFromSource(source: string, fileName: string): Promise<Registry> {
  const tempDir = mkdtempSync(join(tmpdir(), 'funcai-model-report-'));
  const tempFile = join(tempDir, fileName);

  writeFileSync(tempFile, source, 'utf8');

  try {
    const module = (await import(pathToFileURL(tempFile).href)) as { OPENROUTER_MODELS: Registry };
    return module.OPENROUTER_MODELS;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function loadPreviousRegistrySource(): string | null {
  try {
    return execFileSync('git', ['show', `HEAD:${REGISTRY_RELATIVE_PATH}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

async function loadRegistries(): Promise<{ previous: Registry; current: Registry }> {
  const current = await import(pathToFileURL(REGISTRY_PATH).href).then(
    (module) => (module as { OPENROUTER_MODELS: Registry }).OPENROUTER_MODELS,
  );

  const previousSource = loadPreviousRegistrySource();
  const previous = previousSource
    ? await importRegistryFromSource(previousSource, 'previous-models.ts')
    : {};

  return { previous, current };
}

function formatMoney(value: number): string {
  return `$${value}/M`;
}

function formatNumber(value: number | null): string {
  if (value === null) return 'n/a';
  return new Intl.NumberFormat('en-US').format(value);
}

function formatModalities(modalities: readonly string[]): string {
  return [...modalities].sort().join(', ');
}

function diffModel(previous: ModelInfo, current: ModelInfo): string[] {
  const changes: string[] = [];

  if (previous.name !== current.name) {
    changes.push(`name: \`${previous.name}\` -> \`${current.name}\``);
  }

  if (previous.provider !== current.provider) {
    changes.push(`provider: \`${previous.provider}\` -> \`${current.provider}\``);
  }

  if (previous.contextLength !== current.contextLength) {
    changes.push(
      `context: \`${formatNumber(previous.contextLength)}\` -> \`${formatNumber(current.contextLength)}\``,
    );
  }

  if (previous.maxCompletionTokens !== current.maxCompletionTokens) {
    changes.push(
      `max completion: \`${formatNumber(previous.maxCompletionTokens)}\` -> \`${formatNumber(current.maxCompletionTokens)}\``,
    );
  }

  if (previous.pricing.promptPerMToken !== current.pricing.promptPerMToken) {
    changes.push(
      `prompt price: \`${formatMoney(previous.pricing.promptPerMToken)}\` -> \`${formatMoney(current.pricing.promptPerMToken)}\``,
    );
  }

  if (previous.pricing.completionPerMToken !== current.pricing.completionPerMToken) {
    changes.push(
      `completion price: \`${formatMoney(previous.pricing.completionPerMToken)}\` -> \`${formatMoney(current.pricing.completionPerMToken)}\``,
    );
  }

  const previousModalities = formatModalities(previous.modalities);
  const currentModalities = formatModalities(current.modalities);
  if (previousModalities !== currentModalities) {
    changes.push(`modalities: \`${previousModalities}\` -> \`${currentModalities}\``);
  }

  if (previous.capabilities.structuredOutput !== current.capabilities.structuredOutput) {
    changes.push(
      `structured output: \`${previous.capabilities.structuredOutput}\` -> \`${current.capabilities.structuredOutput}\``,
    );
  }

  if (previous.capabilities.tools !== current.capabilities.tools) {
    changes.push(`tools: \`${previous.capabilities.tools}\` -> \`${current.capabilities.tools}\``);
  }

  if (previous.capabilities.reasoning !== current.capabilities.reasoning) {
    changes.push(
      `reasoning: \`${previous.capabilities.reasoning}\` -> \`${current.capabilities.reasoning}\``,
    );
  }

  if (previous.description !== current.description) {
    changes.push('description updated');
  }

  return changes;
}

function renderAddedSection(title: string, ids: string[], registry: Registry): string[] {
  if (ids.length === 0) return [];

  const lines = [
    `## ${title}`,
    '',
    '| Model | Provider | Prompt | Completion | Modalities | Reasoning | Tools |',
    '| --- | --- | ---: | ---: | --- | --- | --- |',
  ];
  for (const id of ids) {
    const model = registry[id];
    lines.push(
      `| \`${id}\` | ${model.provider} | ${formatMoney(model.pricing.promptPerMToken)} | ${formatMoney(model.pricing.completionPerMToken)} | ${formatModalities(model.modalities)} | ${model.capabilities.reasoning ? 'yes' : 'no'} | ${model.capabilities.tools ? 'yes' : 'no'} |`,
    );
  }
  lines.push('');
  return lines;
}

function renderChangedSection(changed: Array<{ id: string; changes: string[] }>): string[] {
  if (changed.length === 0) return [];

  const lines = ['## Updated Models', ''];
  for (const entry of changed) {
    lines.push(`### \`${entry.id}\``, '');
    for (const change of entry.changes) {
      lines.push(`- ${change}`);
    }
    lines.push('');
  }
  return lines;
}

function buildReport(previous: Registry, current: Registry): string {
  const previousIds = new Set(Object.keys(previous));
  const currentIds = new Set(Object.keys(current));

  const added = [...currentIds].filter((id) => !previousIds.has(id)).sort();
  const removed = [...previousIds].filter((id) => !currentIds.has(id)).sort();
  const changed = [...currentIds]
    .filter((id) => previousIds.has(id))
    .map((id) => ({ id, changes: diffModel(previous[id], current[id]) }))
    .filter((entry) => entry.changes.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Weekly OpenRouter model refresh',
    '',
    `Generated on ${today}. This PR refreshes the curated registry in \`src/provider/openrouter/models.ts\`.`,
    '',
    '## Summary',
    '',
    `- Added: ${added.length}`,
    `- Removed: ${removed.length}`,
    `- Updated: ${changed.length}`,
    `- Total models: ${Object.keys(current).length}`,
    '',
  ];

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    lines.push('No registry changes were detected.');
    return `${lines.join('\n')}\n`;
  }

  lines.push(...renderAddedSection('Added Models', added, current));
  lines.push(...renderAddedSection('Removed Models', removed, previous));
  lines.push(...renderChangedSection(changed));

  return `${lines.join('\n')}\n`;
}

async function main() {
  const { output } = parseArgs(process.argv.slice(2));
  const { previous, current } = await loadRegistries();
  const report = buildReport(previous, current);

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
