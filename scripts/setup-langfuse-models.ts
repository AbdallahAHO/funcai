#!/usr/bin/env node

/**
 * Ensures Langfuse can infer normalized costs for live OpenRouter E2E traces.
 *
 * Langfuse computes `totalCost` on generation observations when the generation
 * model name matches a model definition with prices. OpenRouter can report a
 * dated upstream model name, so this script installs project-owned model
 * definitions for the patterns this repo verifies in CI.
 *
 * Usage:
 *   pnpm langfuse:setup
 */

import { OPENROUTER_MODELS } from '../src/provider/openrouter/models';

type OpenRouterModelId = keyof typeof OPENROUTER_MODELS;

type LangfuseModelDefinition = {
  openrouterModelId: OpenRouterModelId;
  langfuseModelName: string;
  matchPattern: string;
};

type OpenRouterApiModel = {
  id: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
};

type Pricing = {
  promptPerToken: number;
  completionPerToken: number;
};

type LangfusePricingTier = {
  isDefault?: boolean;
  prices?: Record<string, number>;
};

type LangfuseModel = {
  id: string;
  modelName: string;
  matchPattern: string;
  isLangfuseManaged: boolean;
  pricingTiers?: LangfusePricingTier[];
};

type PaginatedLangfuseModels = {
  data?: LangfuseModel[];
  meta?: {
    totalPages?: number;
    total_pages?: number;
  };
};

const LANGFUSE_MODEL_DEFINITIONS = [
  {
    openrouterModelId: 'google/gemini-3.1-flash-lite-preview',
    langfuseModelName: 'funcai-openrouter-gemini-3.1-flash-lite-preview',
    matchPattern: '(?i)^google/gemini-3\\.1-flash-lite-preview(-[0-9]{8})?$',
  },
] as const satisfies readonly LangfuseModelDefinition[];

function readLangfuseConfig(): { baseUrl: string; publicKey: string; secretKey: string } | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com';

  if (!publicKey || !secretKey) return null;

  return { baseUrl, publicKey, secretKey };
}

function buildAuthHeader(publicKey: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`;
}

function assertFinitePrice(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }

  return value;
}

function localPricingFor(modelId: OpenRouterModelId): Pricing {
  const pricing = OPENROUTER_MODELS[modelId].pricing;

  return {
    promptPerToken: assertFinitePrice(pricing.promptPerMToken / 1_000_000, 'prompt price'),
    completionPerToken: assertFinitePrice(
      pricing.completionPerMToken / 1_000_000,
      'completion price',
    ),
  };
}

async function fetchOpenRouterPricing(modelId: OpenRouterModelId): Promise<Pricing | undefined> {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`OpenRouter model catalog returned ${response.status}`);
  }

  const body = (await response.json()) as { data?: OpenRouterApiModel[] };
  const model = body.data?.find((candidate) => candidate.id === modelId);
  if (!model?.pricing?.prompt || !model.pricing.completion) return undefined;

  return {
    promptPerToken: assertFinitePrice(Number.parseFloat(model.pricing.prompt), 'prompt price'),
    completionPerToken: assertFinitePrice(
      Number.parseFloat(model.pricing.completion),
      'completion price',
    ),
  };
}

async function resolvePricing(modelId: OpenRouterModelId): Promise<Pricing> {
  try {
    return (await fetchOpenRouterPricing(modelId)) ?? localPricingFor(modelId);
  } catch (error) {
    console.warn(
      `OpenRouter pricing lookup failed for ${modelId}; using local registry fallback. ${error}`,
    );
    return localPricingFor(modelId);
  }
}

function buildGeminiPrices(pricing: Pricing): Record<string, number> {
  const input = pricing.promptPerToken;
  const output = pricing.completionPerToken;
  const cachedInput = input / 10;

  return {
    input,
    input_modality_1: input,
    input_text: input,
    prompt_token_count: input,
    promptTokenCount: input,
    input_cached_tokens: cachedInput,
    cached_content_token_count: cachedInput,
    output,
    output_text: output,
    output_modality_1: output,
    candidates_token_count: output,
    candidatesTokenCount: output,
    thoughtsTokenCount: output,
    thoughts_token_count: output,
    output_reasoning: output,
    input_audio_tokens: input * 2,
  };
}

function pricesMatch(
  actual: Record<string, number> | undefined,
  expected: Record<string, number>,
): boolean {
  if (!actual) return false;

  return Object.entries(expected).every(([key, value]) => {
    const actualValue = actual[key];
    return typeof actualValue === 'number' && Math.abs(actualValue - value) <= 1e-14;
  });
}

async function langfuseRequest<T>(
  baseUrl: string,
  authHeader: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      authorization: authHeader,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(`Langfuse API returned ${response.status}: ${JSON.stringify(body)}`);
  }

  return body as T;
}

async function listLangfuseModels(baseUrl: string, authHeader: string): Promise<LangfuseModel[]> {
  const models: LangfuseModel[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const body = await langfuseRequest<PaginatedLangfuseModels>(
      baseUrl,
      authHeader,
      `/api/public/models?page=${page}&limit=100`,
    );
    const data = body.data ?? [];
    models.push(...data);

    const totalPages = body.meta?.totalPages ?? body.meta?.total_pages;
    if (totalPages && page >= totalPages) break;
    if (!totalPages && data.length < 100) break;
  }

  return models;
}

function findMatchingModel(
  models: LangfuseModel[],
  definition: LangfuseModelDefinition,
  prices: Record<string, number>,
): LangfuseModel | undefined {
  return models.find((model) => {
    const defaultTier = model.pricingTiers?.find((tier) => tier.isDefault);

    return (
      !model.isLangfuseManaged &&
      model.modelName === definition.langfuseModelName &&
      model.matchPattern === definition.matchPattern &&
      pricesMatch(defaultTier?.prices, prices)
    );
  });
}

async function createLangfuseModel(
  baseUrl: string,
  authHeader: string,
  definition: LangfuseModelDefinition,
  prices: Record<string, number>,
): Promise<LangfuseModel> {
  return langfuseRequest<LangfuseModel>(baseUrl, authHeader, '/api/public/models', {
    method: 'POST',
    body: JSON.stringify({
      modelName: definition.langfuseModelName,
      matchPattern: definition.matchPattern,
      unit: 'TOKENS',
      startDate: new Date(Date.now() - 60_000).toISOString(),
      pricingTiers: [
        {
          name: 'Standard',
          isDefault: true,
          priority: 0,
          conditions: [],
          prices,
        },
      ],
    }),
  });
}

async function main(): Promise<void> {
  const config = readLangfuseConfig();

  if (!config) {
    console.log('Langfuse credentials are not set; skipping model setup.');
    return;
  }

  const authHeader = buildAuthHeader(config.publicKey, config.secretKey);
  const models = await listLangfuseModels(config.baseUrl, authHeader);

  for (const definition of LANGFUSE_MODEL_DEFINITIONS) {
    const pricing = await resolvePricing(definition.openrouterModelId);
    const prices = buildGeminiPrices(pricing);
    const existing = findMatchingModel(models, definition, prices);

    if (existing) {
      console.log(`Langfuse model pricing already configured: ${definition.langfuseModelName}`);
      continue;
    }

    const created = await createLangfuseModel(config.baseUrl, authHeader, definition, prices);
    models.push(created);
    console.log(`Created Langfuse model pricing: ${definition.langfuseModelName}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
