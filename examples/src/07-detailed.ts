/**
 * 07 — Detailed output: get metadata alongside the result.
 *
 * .detailed() returns usage tokens, latency, model used (may differ
 * from primary if fallback was triggered), trace ID, and attempt count.
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm detailed
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

const classify = ai.fn({
  model: 'openai/gpt-4o-mini',
  system: 'Classify the language of the given text.',
  schema: z.object({
    language: z.string(),
    confidence: z.number(),
    script: z.string(),
  }),
  input: (text: string) => text,
});

// Simple call — just the output
const simple = await classify('Bonjour le monde');
console.log('Simple:', simple);

// Detailed call — output + metadata
const detailed = await classify.detailed('Bonjour le monde', {
  traceId: 'demo-trace-001',
  userId: 'demo-user',
  properties: { source: 'examples', env: 'development' },
});

console.log('\nDetailed:');
console.log('  Output:', detailed.output);
console.log('  Model:', detailed.model);
console.log('  Usage:', detailed.usage);
console.log('  Latency:', `${Math.round(detailed.latencyMs)}ms`);
console.log('  Attempts:', detailed.attempts);
console.log('  Trace ID:', detailed.traceId);
