#!/usr/bin/env node

/**
 * Fetches the latest model catalog from OpenRouter and generates models.ts.
 *
 * By default, applies heuristic filtering to include only the latest/popular
 * models per provider. Use --all to include every model with structured output.
 *
 * Usage:
 *   npx tsx scripts/update-openrouter-models.ts            # print curated summary
 *   npx tsx scripts/update-openrouter-models.ts --write     # generate curated models.ts
 *   npx tsx scripts/update-openrouter-models.ts --all       # print ALL models
 *   npx tsx scripts/update-openrouter-models.ts --all --write  # generate ALL models
 *   npx tsx scripts/update-openrouter-models.ts --json      # raw JSON
 */

const PROVIDERS = ['openai', 'anthropic', 'google', 'meta-llama', 'deepseek', 'mistralai', 'qwen'];
const MODELS_PATH = new URL('../src/provider/openrouter/models.ts', import.meta.url).pathname;

// Patterns to always skip (not useful for structured output)
const ALWAYS_SKIP = [/:free$/, /:extended$/, /:exacto$/];

// Patterns to skip in curated mode (legacy, dated, niche variants)
const CURATED_SKIP = [
  // Legacy OpenAI
  /^openai\/gpt-3\.5/,
  /^openai\/gpt-4-/,
  /^openai\/gpt-4$/,
  /^openai\/gpt-4-turbo/,
  // Dated snapshots (e.g., gpt-4o-2024-08-06)
  /-\d{4}-\d{2}-\d{2}$/,
  // Niche variants
  /-search-preview$/,
  /-deep-research$/,
  /-image$/,
  /-image-mini$/,
  /^openai\/gpt-audio/,
  /^openai\/gpt-oss-/,
  /-high$/,
  /-pro$/, // o3-pro, o1-pro — very expensive, not typical
  // Old Mistral versions (keep only latest per tier)
  /^mistralai\/mistral-large-2(?:407|411)$/,
  /^mistralai\/mistral-large$/,
  /^mistralai\/mistral-medium-3$/,
  /^mistralai\/mistral-nemo$/,
  /^mistralai\/mistral-saba$/,
  /^mistralai\/mixtral/,
  /^mistralai\/pixtral/,
  /^mistralai\/voxtral/,
  /^mistralai\/devstral-medium$/,
  /^mistralai\/devstral-small$/,
  /^mistralai\/mistral-small/,
  // Old DeepSeek
  /^deepseek\/deepseek-chat-v3-0324$/,
  /^deepseek\/deepseek-r1-distill/,
  /^deepseek\/deepseek-v3\.2-exp$/,
  /^deepseek\/deepseek-v3\.2-speciale$/,
  // Old/niche Google
  /^google\/gemma/,
  /^google\/gemini-2\.0-flash-lite/,
  /^google\/gemini-2\.5-flash-image$/,
  /^google\/gemini-2\.5-flash-lite-preview/,
  /^google\/gemini-2\.5-pro-preview/,
  /^google\/gemini-3-pro-image/,
  // Old Meta Llama
  /^meta-llama\/llama-3-/,
  /^meta-llama\/llama-3\.1-/,
  // Old/niche Qwen
  /^qwen\/qwen-2\.5/,
  /^qwen\/qwen2\.5/,
  /^qwen\/qwq-/,
  /:thinking$/,
  /-thinking$/,
  /-thinking-\d+$/,
  /^qwen\/qwen-plus/,
  /^qwen\/qwen3-14b$/,
  /^qwen\/qwen3-30b-a3b$/,
  /^qwen\/qwen3-30b-a3b-instruct/,
  /^qwen\/qwen3-30b-a3b-thinking/,
  /^qwen\/qwen3-vl-/,
  /^qwen\/qwen3-next-/,
  /^qwen\/qwen3-coder-30b/,
  /^qwen\/qwen3-coder-next$/,
  /^qwen\/qwen3-coder-plus$/,
];

type ApiModel = {
  id: string;
  name: string;
  description: string;
  context_length: number;
  architecture: { input_modalities: string[] };
  pricing: { prompt: string; completion: string };
  top_provider: { max_completion_tokens: number | null };
  supported_parameters: string[];
};

type ParsedModel = {
  id: string;
  name: string;
  description: string;
  provider: string;
  contextLength: number;
  maxCompletionTokens: number | null;
  promptPerMToken: number;
  completionPerMToken: number;
  modalities: string[];
  structuredOutput: boolean;
  tools: boolean;
  reasoning: boolean;
};

function parseProvider(id: string): string {
  const prefix = id.split('/')[0];
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    'meta-llama': 'Meta',
    deepseek: 'DeepSeek',
    mistralai: 'Mistral',
    qwen: 'Qwen',
  };
  return map[prefix] ?? prefix;
}

function toMTokenPrice(perToken: string): number {
  return Math.round(Number.parseFloat(perToken) * 1_000_000 * 1000) / 1000;
}

async function fetchModels(curated: boolean): Promise<ParsedModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) throw new Error(`OpenRouter API returned ${response.status}`);

  const { data } = (await response.json()) as { data: ApiModel[] };

  return data
    .filter((m) => {
      const prefix = m.id.split('/')[0];
      if (!PROVIDERS.includes(prefix)) return false;
      if (ALWAYS_SKIP.some((r) => r.test(m.id))) return false;
      const params = m.supported_parameters ?? [];
      if (!params.includes('structured_outputs')) return false;
      if (curated && CURATED_SKIP.some((r) => r.test(m.id))) return false;
      return true;
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description?.slice(0, 120) ?? '',
      provider: parseProvider(m.id),
      contextLength: m.context_length,
      maxCompletionTokens: m.top_provider?.max_completion_tokens ?? null,
      promptPerMToken: toMTokenPrice(m.pricing.prompt),
      completionPerMToken: toMTokenPrice(m.pricing.completion),
      modalities: m.architecture?.input_modalities ?? ['text'],
      structuredOutput: true,
      tools: (m.supported_parameters ?? []).includes('tools'),
      reasoning:
        (m.supported_parameters ?? []).includes('reasoning') ||
        (m.supported_parameters ?? []).includes('include_reasoning'),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/\r/g, '');
}

function generateModelsFile(models: ParsedModel[]): string {
  const date = new Date().toISOString().split('T')[0];

  const entries = models.map((m) => {
    const modArr = m.modalities.map((mod) => `'${mod}'`).join(', ');
    const desc = escapeString(m.description);
    const name = escapeString(m.name);
    return `  /** ${desc} */
  '${m.id}': {
    name: '${name}',
    provider: '${m.provider}',
    description: '${desc}',
    contextLength: ${m.contextLength.toLocaleString('en-US').replace(/,/g, '_')},
    maxCompletionTokens: ${m.maxCompletionTokens === null ? 'null' : m.maxCompletionTokens.toLocaleString('en-US').replace(/,/g, '_')},
    pricing: { promptPerMToken: ${m.promptPerMToken}, completionPerMToken: ${m.completionPerMToken} },
    modalities: [${modArr}],
    capabilities: { structuredOutput: ${m.structuredOutput}, tools: ${m.tools}, reasoning: ${m.reasoning} },
  },`;
  });

  return `// Auto-generated from OpenRouter API — run \`pnpm update:models\` to refresh
// Last updated: ${date}

export type InputModality = 'text' | 'image' | 'file' | 'audio' | 'video';

export type ModelInfo = {
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  maxCompletionTokens: number | null;
  /** USD per million tokens */
  pricing: { promptPerMToken: number; completionPerMToken: number };
  modalities: readonly InputModality[];
  capabilities: { structuredOutput: boolean; tools: boolean; reasoning: boolean };
};

/**
 * Curated registry of popular OpenRouter models that support structured output.
 * Each entry contains pricing, modality flags, and capability metadata.
 *
 * Use \`OpenRouterModelId\` for typed model selection, or access this object
 * at runtime for CLI tooling, scaffold prompts, and model pickers.
 */
export const OPENROUTER_MODELS = {
${entries.join('\n\n')}
} as const satisfies Record<string, ModelInfo>;

// Type union of all known model IDs + catch-all for arbitrary models
export type OpenRouterModelId = keyof typeof OPENROUTER_MODELS | (string & {});

// All known model IDs as an array (useful for CLI pickers and validation)
export const OPENROUTER_MODEL_IDS = Object.keys(OPENROUTER_MODELS) as (keyof typeof OPENROUTER_MODELS)[];

const hasModality = (id: keyof typeof OPENROUTER_MODELS, modality: InputModality): boolean =>
  (OPENROUTER_MODELS[id].modalities as readonly string[]).includes(modality);

// Subset: models that accept image input
export const MULTIMODAL_IMAGE_MODELS = OPENROUTER_MODEL_IDS.filter((id) => hasModality(id, 'image'));

// Subset: models that accept file/PDF input
export const MULTIMODAL_FILE_MODELS = OPENROUTER_MODEL_IDS.filter((id) => hasModality(id, 'file'));

// Subset: models that accept audio input
export const MULTIMODAL_AUDIO_MODELS = OPENROUTER_MODEL_IDS.filter((id) => hasModality(id, 'audio'));

// Subset: models that accept video input
export const MULTIMODAL_VIDEO_MODELS = OPENROUTER_MODEL_IDS.filter((id) => hasModality(id, 'video'));

// Subset: models with reasoning capabilities
export const REASONING_MODELS = OPENROUTER_MODEL_IDS.filter(
  (id) => OPENROUTER_MODELS[id].capabilities.reasoning,
);
`;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const writeMode = args.includes('--write');
  const allMode = args.includes('--all');
  const curated = !allMode;

  console.log(`Fetching models from OpenRouter API${curated ? ' (curated)' : ' (all)'}...`);
  const models = await fetchModels(curated);
  console.log(`Found ${models.length} models${curated ? ' after filtering' : ''}\n`);

  if (jsonMode) {
    console.log(JSON.stringify(models, null, 2));
    return;
  }

  if (writeMode) {
    const { writeFileSync } = await import('node:fs');
    const content = generateModelsFile(models);
    writeFileSync(MODELS_PATH, content);
    console.log(`Wrote ${models.length} models to ${MODELS_PATH}`);
    console.log('Run `pnpm fix` to format the output.');
    return;
  }

  // Default: print summary table
  const byProvider = new Map<string, ParsedModel[]>();
  for (const m of models) {
    const arr = byProvider.get(m.provider) ?? [];
    arr.push(m);
    byProvider.set(m.provider, arr);
  }

  for (const [provider, providerModels] of byProvider) {
    console.log(`\n${provider} (${providerModels.length} models):`);
    for (const m of providerModels) {
      const mods = m.modalities.filter((mod) => mod !== 'text').join('+') || 'text-only';
      console.log(
        `  ${m.id.padEnd(45)} $${String(m.promptPerMToken).padStart(6)}/$${String(m.completionPerMToken).padStart(6)} per M  [${mods}]`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
