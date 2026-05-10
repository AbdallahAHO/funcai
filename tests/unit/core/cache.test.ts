import { describe, expect, it, vi } from 'vitest';
import {
  buildCacheKey,
  createMemoryCache,
  resolveCacheConfig,
  stableStringify,
} from '@/core/cache';

const cacheConfig = {
  namespace: 'test',
  ttlSeconds: 60,
  version: 'v1',
};

const keyInput = {
  featureId: 'classify-ticket',
  providerId: 'openrouter',
  primaryModel: 'anthropic/claude-sonnet-4.5',
  fallback: ['google/gemini-2.5-flash'],
  systemPrompt: 'Classify support tickets.',
  messages: [{ role: 'user', content: 'Previous context' }],
  userContent: 'The app will not load.',
  params: {
    temperature: 0,
    maxTokens: 250,
    reasoning: { effort: 'low' },
    providerOptions: { openrouter: { usage: { include: true } } },
  },
  cache: cacheConfig,
};

describe('cache key generation', () => {
  it('canonicalizes object keys so equivalent requests produce the same string', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it('builds deterministic keys for the same effective generation request', () => {
    expect(buildCacheKey(keyInput)).toBe(
      buildCacheKey({
        ...keyInput,
        params: {
          providerOptions: { openrouter: { usage: { include: true } } },
          reasoning: { effort: 'low' },
          maxTokens: 250,
          temperature: 0,
        },
      }),
    );
  });

  it('changes the key when message-chain content changes', () => {
    const first = buildCacheKey(keyInput);
    const second = buildCacheKey({
      ...keyInput,
      messages: [{ role: 'user', content: 'Different context' }],
    });

    expect(second).not.toBe(first);
  });

  it('changes the key when cache version changes', () => {
    const first = buildCacheKey(keyInput);
    const second = buildCacheKey({
      ...keyInput,
      cache: { ...cacheConfig, version: 'v2' },
    });

    expect(second).not.toBe(first);
  });

  it('hashes binary content by byte value rather than object identity', () => {
    const first = stableStringify({ image: Buffer.from('same-image') });
    const second = stableStringify({ image: new Uint8Array(Buffer.from('same-image')) });

    expect(first).toBe(second);
  });
});

describe('resolveCacheConfig', () => {
  it('keeps caching opt-in even when a provider is configured', () => {
    expect(
      resolveCacheConfig({
        cacheProvider: createMemoryCache(),
        factoryPolicy: { ttlSeconds: 120 },
      }),
    ).toBeNull();
  });

  it('merges factory, function, and call-level policy', () => {
    expect(
      resolveCacheConfig({
        cacheProvider: createMemoryCache(),
        factoryPolicy: { namespace: 'factory', ttlSeconds: 120, version: 'factory-v1' },
        fnCache: { ttlSeconds: 300 },
        callControl: { ttlSeconds: 15 },
      }),
    ).toEqual({
      namespace: 'factory',
      ttlSeconds: 15,
      version: 'factory-v1',
    });
  });

  it('returns null for per-call bypass', () => {
    expect(
      resolveCacheConfig({
        cacheProvider: createMemoryCache(),
        fnCache: true,
        callControl: { bypass: true },
      }),
    ).toBeNull();
  });
});

describe('createMemoryCache', () => {
  it('stores, reads, deletes, and clears values', async () => {
    const cache = createMemoryCache();

    await cache.set('one', { value: 1 });
    expect(await cache.get('one')).toEqual({ value: 1 });
    expect(cache.size).toBe(1);
    expect(cache.keys()).toEqual(['one']);

    await cache.delete?.('one');
    expect(await cache.get('one')).toBeNull();

    await cache.set('two', { value: 2 });
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('honors ttlSeconds', async () => {
    vi.useFakeTimers();
    const cache = createMemoryCache();

    await cache.set('short', 'cached', { ttlSeconds: 1 });
    expect(await cache.get('short')).toBe('cached');

    vi.advanceTimersByTime(1001);
    expect(await cache.get('short')).toBeNull();
    expect(cache.size).toBe(0);

    vi.useRealTimers();
  });
});
