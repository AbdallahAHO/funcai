/**
 * 08 — Retry and fallback: resilient AI calls.
 *
 * Configure retries per function and fallback model chains.
 * Each model gets retries+1 attempts before moving to the next.
 * Retryable: 429, 5xx, network errors. Non-retryable: 400, 401, schema errors.
 *
 * Run: set OPENROUTER_API_KEY in your shell or CI, then `pnpm retry`.
 */
import { AiFnError, createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({
  provider: openrouter(),
  retries: 1, // default for all functions
});

// This function uses a fallback chain
const extract = ai.fn({
  model: 'anthropic/claude-sonnet-4',
  system: 'Extract structured contact information from the text.',
  schema: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
  }),
  input: (text: string) => text,
  retries: 2, // override: 3 attempts per model
  fallback: ['google/gemini-3.1-flash-lite-preview', 'google/gemini-2.5-flash'],
});

// Normal usage — retries and fallback are transparent
const contact = await extract('Hi, I am Sarah Chen, CTO at Acme Corp. Reach me at sarah@acme.io');
console.log('Contact:', contact);

// Use .detailed() to see which model actually served the request
const detailed = await extract.detailed('John Doe, john@example.com, +1-555-0123');
console.log('Used model:', detailed.model);
console.log('Attempts:', detailed.attempts);

// Error handling — AiFnError has full attempt history
try {
  const failFn = ai.fn({
    model: 'nonexistent/model-that-does-not-exist',
    system: 'test',
    schema: z.object({ x: z.string() }),
    input: (s: string) => s,
    retries: 0,
    fallback: [],
  });
  await failFn('test');
} catch (error) {
  if (error instanceof AiFnError) {
    console.log('\nAiFnError caught:');
    console.log('  Message:', error.message);
    console.log('  Attempts:', error.attempts.length);
    for (const attempt of error.attempts) {
      console.log(
        `  - ${attempt.model}: ${attempt.error.message} (${Math.round(attempt.durationMs)}ms)`,
      );
    }
  }
}
