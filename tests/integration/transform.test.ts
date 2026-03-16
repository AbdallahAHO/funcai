import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

describe('transform: sync and async post-processing', () => {
  it('applies a sync transform to the raw output', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ firstName: 'John', lastName: 'Doe', age: 30 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
    });

    const getDisplayName = ai.fn({
      model: 'test-model',
      system: 'Extract person info.',
      schema,
      input: (text: string) => text,
      transform: (output) => `${output.firstName} ${output.lastName} (${output.age})`,
    });

    const result = await getDisplayName('John Doe is 30 years old');

    expect(result).toBe('John Doe (30)');
  });

  it('applies an async transform to the raw output', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ keywords: ['typescript', 'ai', 'sdk'] }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const schema = z.object({ keywords: z.array(z.string()) });

    // Simulate async enrichment (e.g., database lookup)
    const enrichKeywords = ai.fn({
      model: 'test-model',
      system: 'Extract keywords.',
      schema,
      input: (text: string) => text,
      transform: async (output) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return output.keywords.map((k) => k.toUpperCase());
      },
    });

    const result = await enrichKeywords('TypeScript AI SDK tutorial');

    expect(result).toEqual(['TYPESCRIPT', 'AI', 'SDK']);
  });

  it('receives both raw output and original input in the transform', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ summary: 'A brief summary' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    type DocInput = { title: string; body: string };

    const schema = z.object({ summary: z.string() });

    const transformSpy = vi.fn(
      (output: z.infer<typeof schema>, input: DocInput) => `[${input.title}] ${output.summary}`,
    );

    const summarize = ai.fn({
      model: 'test-model',
      system: 'Summarize documents.',
      schema,
      input: (data: DocInput) => `${data.title}\n\n${data.body}`,
      transform: transformSpy,
    });

    const result = await summarize({
      title: 'Release Notes',
      body: 'We shipped new features and fixed bugs.',
    });

    expect(result).toBe('[Release Notes] A brief summary');

    // Verify transform received correct arguments
    expect(transformSpy).toHaveBeenCalledWith(
      { summary: 'A brief summary' },
      { title: 'Release Notes', body: 'We shipped new features and fixed bugs.' },
    );
  });

  it('transform result is reflected in detailed() output', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ value: 42 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const doubled = ai.fn({
      model: 'test-model',
      system: 'Get a number.',
      schema: z.object({ value: z.number() }),
      input: (text: string) => text,
      transform: (output) => output.value * 2,
    });

    const detailed = await doubled.detailed('give me a number');

    expect(detailed.output).toBe(84);
    expect(detailed.usage.inputTokens).toBe(10);
    expect(detailed.usage.outputTokens).toBe(5);
  });

  it('works without a transform (identity)', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ name: 'Alice', role: 'admin' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const getUser = ai.fn({
      model: 'test-model',
      system: 'Extract user info.',
      schema: z.object({ name: z.string(), role: z.string() }),
      input: (text: string) => text,
    });

    const result = await getUser('Alice is an admin');

    expect(result).toEqual({ name: 'Alice', role: 'admin' });
  });
});
