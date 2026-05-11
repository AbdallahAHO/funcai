/**
 * 16 — Redis result cache.
 *
 * Wraps a `redis` client in the `CacheProvider` contract. Results survive
 * across processes, so re-running this example will hit the cache from the
 * previous run until the TTL expires.
 *
 * Setup (one-time):
 *   pnpm add redis           # already added to examples/package.json
 *   docker run -p 6379:6379 redis:7-alpine
 *
 * Run: set OPENROUTER_API_KEY and optional REDIS_URL in your shell or CI,
 * then `pnpm cache:redis`.
 */
import { type CacheProvider, type CacheSetOptions, createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { createClient, type RedisClientType } from 'redis';
import { z } from 'zod';

/**
 * Adapts a node-redis client to the `CacheProvider` interface.
 * Values are JSON-serialized; TTL is set with `EX` (seconds).
 */
function createRedisCache(client: RedisClientType): CacheProvider {
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
      const payload = JSON.stringify(value);
      if (options?.ttlSeconds && options.ttlSeconds > 0) {
        await client.set(key, payload, { EX: options.ttlSeconds });
      } else {
        await client.set(key, payload);
      }
    },
    async delete(key: string): Promise<void> {
      await client.del(key);
    },
  };
}

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const client: RedisClientType = createClient({
  url: redisUrl,
  // Fail fast in this demo instead of node-redis's default 50-attempt loop.
  socket: { reconnectStrategy: false, connectTimeout: 2_000 },
});

// Swallow post-connect errors so we don't crash with an unhandled 'error' event
// when the demo is deliberately disconnected at the end.
client.on('error', () => {});

try {
  await client.connect();
} catch {
  console.error(`\nCould not connect to Redis at ${redisUrl}.`);
  console.error('Start one with: docker run -p 6379:6379 redis:7-alpine\n');
  process.exit(1);
}

const ai = createAiFn({
  provider: openrouter(),
  cache: createRedisCache(client),
  cachePolicy: { namespace: 'examples:redis', ttlSeconds: 300 },
});

const summarize = ai.fn({
  id: 'summarize-release-notes',
  model: 'google/gemini-3.1-flash-lite-preview',
  system:
    'Summarize release notes into a single sentence and a list of breaking changes. Stay terse.',
  schema: z.object({
    summary: z.string(),
    breakingChanges: z.array(z.string()),
  }),
  input: (notes: string) => notes,
  cache: { ttlSeconds: 600, version: 'v1' },
});

const notes = `
v2.0.0 (2026-05-10)
  * BREAKING: rename \`fetchUser()\` → \`getUser()\`
  * BREAKING: drop Node 18 support, require Node 20+
  * feat: add OAuth2 device-code flow
  * fix: retry 429s with exponential backoff
  * docs: rewrite the auth guide
`.trim();

const formatMs = (ms: number) => `${Math.round(ms)}ms`;

try {
  console.log(`Connected to Redis at ${redisUrl}\n`);

  console.log('First call — may hit Redis if you ran this before within the TTL');
  const first = await summarize.detailed(notes);
  console.log('  output:    ', first.output);
  console.log('  latency:   ', formatMs(first.latencyMs));
  console.log('  usage:     ', first.usage);
  console.log('  cache.hit: ', first.cache?.hit);

  console.log('\nSecond call — same input, served from Redis');
  const second = await summarize.detailed(notes);
  console.log('  latency:   ', formatMs(second.latencyMs));
  console.log('  usage:     ', second.usage);
  console.log('  cache.hit: ', second.cache?.hit);
  console.log('  ageMs:     ', second.cache?.ageMs);

  console.log('\nKey lives at:', second.cache?.key);
  console.log('Re-run this script — the second call latency stays low until the TTL expires.');
} finally {
  await client.quit();
}
