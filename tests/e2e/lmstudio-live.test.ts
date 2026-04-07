import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/core/factory';
import { lmstudio } from '@/provider/lmstudio';

const hasLMStudioConfig = Boolean(process.env.LMSTUDIO_BASE_URL || process.env.LMSTUDIO_MODEL);
const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL ?? 'http://192.168.2.188:1234/v1';
const LMSTUDIO_MODEL = process.env.LMSTUDIO_MODEL ?? 'google/gemma-4-26b-a4b';

describe.skipIf(!hasLMStudioConfig)('LM Studio E2E', () => {
  const ai = createAiFn({
    provider: lmstudio({ baseURL: LMSTUDIO_BASE_URL }),
    retries: 0,
  });

  it('returns structured output matching schema', { timeout: 30_000 }, async () => {
    const classify = ai.fn({
      model: LMSTUDIO_MODEL,
      system: 'Return a JSON object with intent and confidence.',
      schema: z.object({
        intent: z.enum(['greeting', 'question', 'command']),
        confidence: z.number().min(0).max(1),
      }),
      input: (msg: string) => msg,
    });

    const detailed = await classify.detailed('Hello there');

    expect(detailed.output.intent).toBe('greeting');
    expect(detailed.output.confidence).toBeGreaterThan(0.5);
    expect(detailed.usage.inputTokens).toBeGreaterThan(0);
    expect(detailed.usage.outputTokens).toBeGreaterThan(0);
  });
});
