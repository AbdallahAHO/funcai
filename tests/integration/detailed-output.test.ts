import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/index';

const mockResponse = (
  json: unknown,
  usage = { inputTokens: { total: 25 }, outputTokens: { total: 12 } },
  providerMetadata?: Record<string, unknown>,
) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage,
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
  providerMetadata,
});

describe('detailed-output: .detailed() returns metadata', () => {
  it('returns usage with inputTokens and outputTokens', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(
        mockResponse(
          { answer: 'yes' },
          { inputTokens: { total: 100 }, outputTokens: { total: 50 } },
        ),
      );
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const confirm = ai.fn({
      model: 'test-model',
      system: 'Answer yes or no.',
      schema: z.object({ answer: z.enum(['yes', 'no']) }),
      input: (text: string) => text,
    });

    const result = await confirm.detailed('Is the sky blue?');

    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it('returns the model name used for generation', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ data: 'test' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'anthropic/claude-3.5-sonnet',
      system: 'Do something.',
      schema: z.object({ data: z.string() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('go');

    expect(result.model).toBe('anthropic/claude-3.5-sonnet');
  });

  it('returns a traceId (auto-generated when not provided)', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ value: 1 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Count.',
      schema: z.object({ value: z.number() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('one');

    expect(result.traceId).toBeDefined();
    expect(typeof result.traceId).toBe('string');
    expect(result.traceId.length).toBeGreaterThan(0);
  });

  it('uses the provided traceId from call options', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ value: 1 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Count.',
      schema: z.object({ value: z.number() }),
      input: (text: string) => text,
    });

    const customTraceId = 'custom-trace-abc-123';
    const result = await task.detailed('one', { traceId: customTraceId });

    expect(result.traceId).toBe(customTraceId);
  });

  it('returns latencyMs as a positive number', async () => {
    const doGenerate = vi.fn().mockImplementation(async () => {
      // Simulate some latency
      await new Promise((resolve) => setTimeout(resolve, 20));
      return mockResponse({ done: true });
    });
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Check.',
      schema: z.object({ done: z.boolean() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('check');

    expect(result.latencyMs).toBeGreaterThan(0);
    expect(typeof result.latencyMs).toBe('number');
  });

  it('returns attempts count of 1 on first-try success', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 2 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Check.',
      schema: z.object({ ok: z.boolean() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('check');

    expect(result.attempts).toBe(1);
  });

  it('returns correct attempts count after retries', async () => {
    const doGenerate = vi
      .fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockRejectedValueOnce(new Error('502 Bad Gateway'))
      .mockResolvedValueOnce(mockResponse({ recovered: true }));

    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 2 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Do something.',
      schema: z.object({ recovered: z.boolean() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('go');

    expect(result.attempts).toBe(3);
    expect(result.output).toEqual({ recovered: true });
  });

  it('includes the output in detailed result', async () => {
    const doGenerate = vi.fn().mockResolvedValue(
      mockResponse({
        title: 'Integration Testing',
        topics: ['vitest', 'mocking', 'assertions'],
      }),
    );
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const extract = ai.fn({
      model: 'test-model',
      system: 'Extract article metadata.',
      schema: z.object({
        title: z.string(),
        topics: z.array(z.string()),
      }),
      input: (text: string) => text,
    });

    const result = await extract.detailed('An article about integration testing');

    expect(result.output).toEqual({
      title: 'Integration Testing',
      topics: ['vitest', 'mocking', 'assertions'],
    });
  });

  it('surfaces cost from OpenRouter providerMetadata', async () => {
    const doGenerate = vi.fn().mockResolvedValue(
      mockResponse(
        { ok: true },
        { inputTokens: { total: 50 }, outputTokens: { total: 20 } },
        {
          openrouter: {
            usage: {
              promptTokens: 50,
              completionTokens: 20,
              totalTokens: 70,
              cost: 0.00042,
            },
          },
        },
      ),
    );
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Check.',
      schema: z.object({ ok: z.boolean() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('check');

    expect(result.cost).toBe(0.00042);
    expect(result.providerMetadata).toBeDefined();
  });

  it('omits cost when providerMetadata has no cost field', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Check.',
      schema: z.object({ ok: z.boolean() }),
      input: (text: string) => text,
    });

    const result = await task.detailed('check');

    expect(result.cost).toBeUndefined();
    expect(result.providerMetadata).toBeUndefined();
  });
});
