export type TestLevel = 'unit' | 'integration' | 'e2e';
export type ProviderKind = 'openrouter' | 'lmstudio' | 'ollama' | 'cloudflare';
export type ScaffoldRecipeId =
  | 'support-ticket'
  | 'invoice-extractor'
  | 'image-inspection'
  | 'cached-classifier'
  | 'fallback-chain';
export type ScaffoldInputKind = 'text' | 'image' | 'pdf';

export type ScaffoldOptions = {
  name: string;
  description: string;
  provider: ProviderKind;
  modelId: string;
  fields: string[];
  recipe?: ScaffoldRecipeId;
  inputKind: ScaffoldInputKind;
  cache: boolean;
  fallback: string[];
  posthog: boolean;
  testLevels: TestLevel[];
  aiGenerate: boolean;
};

export const DEFAULT_MODEL_IDS: Record<ProviderKind, string> = {
  openrouter: 'google/gemini-3.1-flash-lite-preview',
  lmstudio: 'google/gemma-4-26b-a4b',
  ollama: 'gemma4:latest',
  cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
};

export const DEFAULTS: ScaffoldOptions = {
  name: 'classify-sentiment',
  description: 'Classify text by sentiment and confidence',
  provider: 'openrouter',
  modelId: DEFAULT_MODEL_IDS.openrouter,
  fields: ['sentiment', 'confidence', 'reason'],
  inputKind: 'text',
  cache: false,
  fallback: [],
  posthog: false,
  testLevels: ['unit', 'integration'],
  aiGenerate: false,
};

export function getDefaultModelId(provider: ProviderKind): string {
  return DEFAULT_MODEL_IDS[provider];
}

export type AiContent = {
  systemPrompt: string;
  fewShots: Array<{ input: string; output: Record<string, unknown> }>;
  fieldTypes: Record<string, string>;
};
