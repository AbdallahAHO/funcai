/**
 * 15 — In-memory result cache.
 *
 * Demonstrates the built-in `createMemoryCache()` provider:
 *   - first call hits the model (cache miss)
 *   - second call returns the stored result (cache hit, no provider call)
 *   - `cacheControl: { bypass: true }` forces a fresh call
 *
 * Use the in-memory cache for local dev, tests, and short-lived processes.
 * Swap it for Redis/KV in production — same `CacheProvider` contract.
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm cache:memory
 */
import { createAiFn, createMemoryCache } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const cache = createMemoryCache();

const ai = createAiFn({
  provider: openrouter(),
  cache,
  cachePolicy: { namespace: 'examples', ttlSeconds: 300 },
});

const classify = ai.fn({
  id: 'classify-ticket',
  model: 'google/gemini-3.1-flash-lite-preview',
  system:
    'Classify support tickets by intent and urgency. Be terse — no explanations beyond the schema.',
  schema: z.object({
    intent: z.enum(['billing', 'technical', 'general', 'cancellation']),
    urgency: z.enum(['low', 'medium', 'high']),
  }),
  input: (ticket: { subject: string; body: string }) => `${ticket.subject}\n\n${ticket.body}`,
  cache: { ttlSeconds: 600, version: 'v1' },
});

const ticket = {
  subject: 'Cannot access the API since this morning',
  body: 'Our entire team has been getting 503s for the last 3 hours. Production is down.',
};

const formatMs = (ms: number) => `${Math.round(ms)}ms`;

console.log('First call — cache miss, hits the provider');
const first = await classify.detailed(ticket);
console.log('  output:    ', first.output);
console.log('  model:     ', first.model);
console.log('  latency:   ', formatMs(first.latencyMs));
console.log('  usage:     ', first.usage);
console.log('  cache.hit: ', first.cache?.hit);

console.log('\nSecond call — same input, cache hit (no provider call)');
const second = await classify.detailed(ticket);
console.log('  output:    ', second.output);
console.log('  model:     ', second.model);
console.log('  latency:   ', formatMs(second.latencyMs));
console.log('  usage:     ', second.usage, '← zero tokens on cache hits');
console.log('  cache.hit: ', second.cache?.hit);
console.log('  ageMs:     ', second.cache?.ageMs);

console.log('\nThird call — cacheControl.bypass forces a fresh provider call');
const third = await classify.detailed(ticket, { cacheControl: { bypass: true } });
console.log('  latency:   ', formatMs(third.latencyMs));
console.log('  usage:     ', third.usage);
console.log('  cache:     ', third.cache, '← undefined when bypassed');

console.log('\nMemory cache size:', cache.size, 'entries');
