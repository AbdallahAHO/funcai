import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/core/factory';
import { ollama } from '@/provider/ollama';

const hasOllamaConfig = Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:latest';

describe.skipIf(!hasOllamaConfig)('Ollama E2E', () => {
  const ai = createAiFn({
    provider: ollama({ baseURL: OLLAMA_BASE_URL }),
    retries: 0,
  });

  it('returns structured output matching schema', { timeout: 30_000 }, async () => {
    const classify = ai.fn({
      model: OLLAMA_MODEL,
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
