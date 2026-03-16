export type TestLevel = 'unit' | 'integration' | 'e2e';

export type ScaffoldOptions = {
  name: string;
  description: string;
  modelId: string;
  fields: string[];
  posthog: boolean;
  testLevels: TestLevel[];
  aiGenerate: boolean;
};

export const DEFAULTS: ScaffoldOptions = {
  name: 'classify-sentiment',
  description: 'Classify text by sentiment and confidence',
  modelId: 'google/gemini-3.1-flash-lite-preview',
  fields: ['sentiment', 'confidence', 'reason'],
  posthog: false,
  testLevels: ['unit', 'integration'],
  aiGenerate: false,
};

export type AiContent = {
  systemPrompt: string;
  fewShots: Array<{ input: string; output: Record<string, unknown> }>;
  fieldTypes: Record<string, string>;
};
