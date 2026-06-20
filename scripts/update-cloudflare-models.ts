#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

/**
 * Fetches the latest Workers AI model catalog from Cloudflare docs and
 * generates a strict structured-output-only registry.
 *
 * Usage:
 *   npx tsx scripts/update-cloudflare-models.ts              # print summary
 *   npx tsx scripts/update-cloudflare-models.ts --write      # generate models.ts
 *   npx tsx scripts/update-cloudflare-models.ts --json       # raw parsed JSON
 */

const MODELS_INDEX_URL = 'https://developers.cloudflare.com/workers-ai/models/index.md';
const JSON_MODE_URL = 'https://developers.cloudflare.com/workers-ai/features/json-mode/index.md';
const MODEL_PAGE_BASE_URL = 'https://developers.cloudflare.com/workers-ai/models';
const MODELS_PATH = new URL('../src/provider/cloudflare/models.ts', import.meta.url).pathname;

type InputModality = 'text' | 'image';
type StructuredOutputSource = 'json-mode' | 'model-page';

export type ParsedModel = {
  id: string;
  slug: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number | null;
  pricing: {
    promptPerMToken: number | null;
    cachedPromptPerMToken: number | null;
    completionPerMToken: number | null;
    raw: string;
  };
  modalities: InputModality[];
  capabilities: {
    structuredOutput: true;
    tools: boolean;
    reasoning: boolean;
    vision: boolean;
    batch: boolean;
  };
  structuredOutputSource: StructuredOutputSource;
  sourceUrl: string;
};

export type SkippedModel = {
  slug: string;
  reason: string;
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cloudflare docs returned ${response.status} for ${url}`);
  return response.text();
}

export function extractModelSlugs(index: string): string[] {
  const slugs = new Set<string>();
  const linkPattern = /https:\/\/developers\.cloudflare\.com\/workers-ai\/models\/([^/)]+)\//g;

  for (const match of index.matchAll(linkPattern)) {
    const slug = match[1];
    if (slug) slugs.add(slug);
  }

  return [...slugs].sort((a, b) => a.localeCompare(b));
}

export function extractJsonModeModels(page: string): Map<string, string> {
  const models = new Map<string, string>();
  const supportedModels = page.match(/## Supported Models[\s\S]*?(?=\n## |\n```json|$)/)?.[0] ?? '';
  const linkPattern =
    /\*\s+\[(@[a-z0-9-]+\/[^\]]+)]\(https:\/\/developers\.cloudflare\.com\/workers-ai\/models\/([^/)]+)\//g;

  for (const match of supportedModels.matchAll(linkPattern)) {
    const modelId = match[1];
    const slug = match[2];
    if (modelId && slug) models.set(slug, modelId);
  }

  return models;
}

function extractFrontmatterValue(page: string, key: string): string {
  const match = page.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

export function extractTaskLine(page: string): { task: string; provider: string } | null {
  const match = page.match(/^\s*([A-Za-z -]+)\s+•\s+([^•\n]+?)(?:\s+•\s+[^\n]+)?\s*$/m);
  if (!match?.[1] || !match?.[2]) return null;

  return {
    task: match[1].trim(),
    provider: match[2].trim(),
  };
}

export function extractContextLength(page: string): number | null {
  const match = page.match(/\| Context Window[^|]*\|\s*([0-9,]+)\s+tokens/i);
  if (!match?.[1]) return null;
  return Number.parseInt(match[1].replace(/,/g, ''), 10);
}

export function extractUnitPricing(page: string): string {
  const match = page.match(/\| Unit Pricing\s*\|\s*([^|]+?)\s*\|/i);
  return match?.[1]?.trim() ?? '';
}

export function parsePrice(raw: string, label: string): number | null {
  const match = raw.match(new RegExp(`\\$([0-9.]+)\\s+per M ${label} tokens`, 'i'));
  if (!match?.[1]) return null;
  return Number.parseFloat(match[1]);
}

export function hasModelInfoFlag(page: string, label: string): boolean {
  return new RegExp(`\\| ${label}[^|]*\\|\\s*Yes\\s*\\|`, 'i').test(page);
}

export function hasStructuredOutputEvidence(page: string): boolean {
  return (
    /guided\\?_json/i.test(page) ||
    /structured outputs?/i.test(page) ||
    /▶response\\?_format\s*\n\s*`one of`Specifies the format the model must output/i.test(page) ||
    /JSON schema that should be fulfilled for the response/i.test(page)
  );
}

export function parseModelPage(
  slug: string,
  page: string,
  jsonModeModels: Map<string, string>,
): ParsedModel | SkippedModel {
  const sourceUrl = `${MODEL_PAGE_BASE_URL}/${slug}/`;
  const id = page.match(/`(@[a-z0-9-]+\/[^`]+)`/)?.[1];
  if (!id) return { slug, reason: 'missing Workers AI model id' };

  const taskLine = extractTaskLine(page);
  if (!taskLine) return { slug, reason: 'missing task line' };
  if (taskLine.task !== 'Text Generation') {
    return { slug, reason: `unsupported task: ${taskLine.task}` };
  }
  if (/\|\s*(?:Planned\s+Deprecation|Deprecated)\s*\|/i.test(page)) {
    return { slug, reason: 'deprecated or planned deprecation' };
  }
  const structuredOutputSource = jsonModeModels.get(slug) === id ? 'json-mode' : 'model-page';
  if (structuredOutputSource === 'model-page' && !hasStructuredOutputEvidence(page)) {
    return { slug, reason: 'no explicit structured-output support' };
  }

  const rawPricing = extractUnitPricing(page);
  const vision = hasModelInfoFlag(page, 'Vision');

  return {
    id,
    slug,
    name: extractFrontmatterValue(page, 'title') || slug,
    provider: taskLine.provider,
    description: extractFrontmatterValue(page, 'description'),
    contextLength: extractContextLength(page),
    pricing: {
      promptPerMToken: parsePrice(rawPricing, 'input'),
      cachedPromptPerMToken: parsePrice(rawPricing, 'cached input'),
      completionPerMToken: parsePrice(rawPricing, 'output'),
      raw: rawPricing,
    },
    modalities: vision ? ['text', 'image'] : ['text'],
    capabilities: {
      structuredOutput: true,
      tools: hasModelInfoFlag(page, 'Function calling'),
      reasoning: hasModelInfoFlag(page, 'Reasoning'),
      vision,
      batch: hasModelInfoFlag(page, 'Batch'),
    },
    structuredOutputSource,
    sourceUrl,
  };
}

export async function fetchModels(): Promise<{ models: ParsedModel[]; skipped: SkippedModel[] }> {
  const [index, jsonModePage] = await Promise.all([
    fetchText(MODELS_INDEX_URL),
    fetchText(JSON_MODE_URL),
  ]);
  const jsonModeModels = extractJsonModeModels(jsonModePage);
  const slugs = [...new Set([...extractModelSlugs(index), ...jsonModeModels.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  if (slugs.length === 0) {
    throw new Error('No Cloudflare Workers AI model links found. The docs shape may have changed.');
  }

  const models: ParsedModel[] = [];
  const skipped: SkippedModel[] = [];

  for (const slug of slugs) {
    try {
      const page = await fetchText(`${MODEL_PAGE_BASE_URL}/${slug}/index.md`);
      const parsed = parseModelPage(slug, page, jsonModeModels);
      if ('id' in parsed) models.push(parsed);
      else skipped.push(parsed);
    } catch (error) {
      skipped.push({ slug, reason: error instanceof Error ? error.message : 'fetch failed' });
    }
  }

  if (models.length === 0) {
    throw new Error('No structured-output Cloudflare text-generation models found.');
  }

  models.sort((a, b) => a.id.localeCompare(b.id));
  return { models, skipped };
}

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/\r/g, '');
}

function formatNumber(value: number | null): string {
  if (value === null) return 'null';
  return value.toLocaleString('en-US').replace(/,/g, '_');
}

export function generateModelsFile(models: ParsedModel[]): string {
  const date = new Date().toISOString().split('T')[0];

  const entries = models.map((model) => {
    const modalities = model.modalities.map((modality) => `'${modality}'`).join(', ');
    const description = escapeString(model.description);
    const name = escapeString(model.name);
    const provider = escapeString(model.provider);
    const rawPricing = escapeString(model.pricing.raw);

    return `  /** ${description} */
  '${model.id}': {
    name: '${name}',
    provider: '${provider}',
    description: '${description}',
    contextLength: ${formatNumber(model.contextLength)},
    pricing: {
      promptPerMToken: ${model.pricing.promptPerMToken ?? 'null'},
      cachedPromptPerMToken: ${model.pricing.cachedPromptPerMToken ?? 'null'},
      completionPerMToken: ${model.pricing.completionPerMToken ?? 'null'},
      raw: '${rawPricing}',
    },
    modalities: [${modalities}],
    capabilities: {
      structuredOutput: true,
      tools: ${model.capabilities.tools},
      reasoning: ${model.capabilities.reasoning},
      vision: ${model.capabilities.vision},
      batch: ${model.capabilities.batch},
    },
    structuredOutputSource: '${model.structuredOutputSource}',
    sourceUrl: '${model.sourceUrl}',
  },`;
  });

  return `// Auto-generated from Cloudflare Workers AI docs — run \`pnpm update:cloudflare-models --write\` to refresh
// Last updated: ${date}

export type CloudflareInputModality = 'text' | 'image';

export type CloudflareModelInfo = {
  name: string;
  provider: string;
  description: string;
  contextLength: number | null;
  /** USD per million tokens when Cloudflare publishes token-based pricing */
  pricing: {
    promptPerMToken: number | null;
    cachedPromptPerMToken: number | null;
    completionPerMToken: number | null;
    raw: string;
  };
  modalities: readonly CloudflareInputModality[];
  capabilities: {
    structuredOutput: true;
    tools: boolean;
    reasoning: boolean;
    vision: boolean;
    batch: boolean;
  };
  structuredOutputSource: 'json-mode' | 'model-page';
  sourceUrl: string;
};

/**
 * Cloudflare Workers AI text-generation models with explicit structured-output support.
 *
 * Models only enter this registry when Cloudflare docs explicitly document
 * structured output support through the JSON Mode supported-model list or a
 * model page that exposes controls such as \`response_format\` or \`guided_json\`.
 * Non-chat, embeddings, image, speech, transcription, reranking,
 * planned-deprecation, missing-page, and unknown structured-output models are
 * intentionally excluded.
 */
export const CLOUDFLARE_MODELS = {
${entries.join('\n\n')}
} as const satisfies Record<string, CloudflareModelInfo>;

export type CloudflareModelId = keyof typeof CLOUDFLARE_MODELS;

export const CLOUDFLARE_MODEL_IDS = Object.keys(CLOUDFLARE_MODELS) as CloudflareModelId[];

const hasModality = (id: CloudflareModelId, modality: CloudflareInputModality): boolean =>
  (CLOUDFLARE_MODELS[id].modalities as readonly string[]).includes(modality);

export const CLOUDFLARE_MULTIMODAL_IMAGE_MODELS = CLOUDFLARE_MODEL_IDS.filter((id) =>
  hasModality(id, 'image'),
);

export const CLOUDFLARE_REASONING_MODELS = CLOUDFLARE_MODEL_IDS.filter(
  (id) => CLOUDFLARE_MODELS[id].capabilities.reasoning,
);

export const CLOUDFLARE_TOOL_CALLING_MODELS = CLOUDFLARE_MODEL_IDS.filter(
  (id) => CLOUDFLARE_MODELS[id].capabilities.tools,
);
`;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const writeMode = args.includes('--write');

  console.log('Fetching structured-output models from Cloudflare Workers AI docs...');
  const { models, skipped } = await fetchModels();
  console.log(`Found ${models.length} structured-output text-generation models`);
  console.log(`Skipped ${skipped.length} non-matching models\n`);

  if (jsonMode) {
    console.log(JSON.stringify({ models, skipped }, null, 2));
    return;
  }

  if (writeMode) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(MODELS_PATH, generateModelsFile(models));
    console.log(`Wrote ${models.length} models to ${MODELS_PATH}`);
    console.log('Run `pnpm fix` to format the output.');
    return;
  }

  const byProvider = new Map<string, ParsedModel[]>();
  for (const model of models) {
    const providerModels = byProvider.get(model.provider) ?? [];
    providerModels.push(model);
    byProvider.set(model.provider, providerModels);
  }

  for (const [provider, providerModels] of byProvider) {
    console.log(`${provider} (${providerModels.length} models):`);
    for (const model of providerModels) {
      const flags = [
        model.capabilities.vision ? 'vision' : null,
        model.capabilities.tools ? 'tools' : null,
        model.capabilities.reasoning ? 'reasoning' : null,
      ].filter(Boolean);
      console.log(
        `  ${model.id.padEnd(52)} [structured${flags.length ? `, ${flags.join(', ')}` : ''}]`,
      );
    }
    console.log('');
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return entry ? import.meta.url === pathToFileURL(entry).href : false;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
