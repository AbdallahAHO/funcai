import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn, createMemoryCache, type TracePlugin } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 12 }, outputTokens: { total: 6 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

const answerSchema = z.object({
  answer: z.string(),
});

describe('cache: function result caching', () => {
  it('returns cached detailed results without calling the provider or trace wrapper again', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ answer: 'urgent' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = {
      id: 'mock-provider',
      model: vi.fn(() => model),
    };
    const trace: TracePlugin = {
      wrap: vi.fn((languageModel) => languageModel),
    };

    const ai = createAiFn({
      provider,
      trace,
      cache: createMemoryCache(),
      retries: 0,
    });

    const classify = ai.fn({
      id: 'classify-ticket',
      model: 'primary-model',
      system: 'Classify support tickets.',
      schema: answerSchema,
      input: (text: string) => text,
      cache: { ttlSeconds: 60, version: 'v1' },
    });

    const first = await classify.detailed('Production login is broken');
    const second = await classify.detailed('Production login is broken');

    expect(first.output).toEqual({ answer: 'urgent' });
    expect(first.cache?.hit).toBe(false);
    expect(second.output).toEqual({ answer: 'urgent' });
    expect(second.model).toBe('primary-model');
    expect(second.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(second.attempts).toBe(0);
    expect(second.cache?.hit).toBe(true);
    expect(doGenerate).toHaveBeenCalledTimes(1);
    expect(provider.model).toHaveBeenCalledTimes(1);
    expect(trace.wrap).toHaveBeenCalledTimes(1);
  });

  it('caches transformed output so transforms only run on misses', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ answer: 'cached' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const transform = vi.fn((output: { answer: string }) => ({
      answer: output.answer.toUpperCase(),
    }));

    const ai = createAiFn({
      provider: { id: 'mock-provider', model: () => model },
      cache: createMemoryCache(),
      retries: 0,
    });

    const shout = ai.fn({
      id: 'shout',
      model: 'primary-model',
      system: 'Return a short answer.',
      schema: answerSchema,
      input: (text: string) => text,
      transform,
      cache: true,
    });

    expect(await shout('repeat')).toEqual({ answer: 'CACHED' });
    expect(await shout('repeat')).toEqual({ answer: 'CACHED' });
    expect(doGenerate).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledTimes(1);
  });

  it('uses the full message chain in the cache key', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ answer: 'formal' }))
      .mockResolvedValueOnce(mockResponse({ answer: 'casual' }));
    const model = new MockLanguageModelV3({ doGenerate });

    const ai = createAiFn({
      provider: { id: 'mock-provider', model: () => model },
      cache: createMemoryCache(),
      retries: 0,
    });

    const write = ai.fn({
      id: 'rewrite',
      model: 'primary-model',
      system: 'Rewrite text.',
      schema: answerSchema,
      messages: (input: { tone: string; text: string }) => [
        { role: 'user', content: `Tone: ${input.tone}` },
      ],
      input: (input: { tone: string; text: string }) => input.text,
      cache: true,
    });

    expect(await write({ tone: 'formal', text: 'hello' })).toEqual({ answer: 'formal' });
    expect(await write({ tone: 'casual', text: 'hello' })).toEqual({ answer: 'casual' });
    expect(await write({ tone: 'formal', text: 'hello' })).toEqual({ answer: 'formal' });
    expect(doGenerate).toHaveBeenCalledTimes(2);
  });

  it('supports per-call cache bypass on the simple callable', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ answer: 'first' }))
      .mockResolvedValueOnce(mockResponse({ answer: 'fresh' }));
    const model = new MockLanguageModelV3({ doGenerate });

    const ai = createAiFn({
      provider: { id: 'mock-provider', model: () => model },
      cache: createMemoryCache(),
      retries: 0,
    });

    const answer = ai.fn({
      id: 'answer',
      model: 'primary-model',
      system: 'Answer.',
      schema: answerSchema,
      input: (text: string) => text,
      cache: true,
    });

    expect(await answer('same')).toEqual({ answer: 'first' });
    expect(await answer('same', { cacheControl: { bypass: true } })).toEqual({ answer: 'fresh' });
    expect(await answer('same')).toEqual({ answer: 'first' });
    expect(doGenerate).toHaveBeenCalledTimes(2);
  });

  it('passes per-call ttl overrides to the cache provider', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ answer: 'stored' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const ai = createAiFn({
      provider: { id: 'mock-provider', model: () => model },
      cache,
      retries: 0,
    });

    const answer = ai.fn({
      id: 'ttl-answer',
      model: 'primary-model',
      system: 'Answer.',
      schema: answerSchema,
      input: (text: string) => text,
      cache: { ttlSeconds: 120 },
    });

    await answer.detailed('same', { cacheControl: { ttlSeconds: 7 } });

    expect(cache.set).toHaveBeenCalledWith(expect.any(String), expect.anything(), {
      ttlSeconds: 7,
    });
  });
});
