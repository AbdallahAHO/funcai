/**
 * 01 — Basic usage: string in, structured output out.
 *
 * Run: set OPENROUTER_API_KEY in your shell or CI, then `pnpm basic`.
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

const classify = ai.fn({
  model: 'google/gemini-3.1-flash-lite-preview',
  system: 'Classify the sentiment of the given text as positive, negative, or neutral.',
  schema: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }),
  input: (text: string) => text,
});

const result = await classify('This product exceeded all my expectations!');
console.log('Result:', result);
// { sentiment: "positive", confidence: 0.95 }
