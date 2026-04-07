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

/** Extract providerOptions from doGenerate call args. */
const extractProviderOptions = (callArgs: { providerOptions?: Record<string, unknown> }) =>
  callArgs.providerOptions;

describe('reasoning-mode: reasoning config passed to generateObject', () => {
  it('passes reasoning effort to providerOptions', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'ok' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = {
      model: () => model,
      buildGenerateOptions: ({
        reasoning,
      }: {
        reasoning?: { effort: string } | { maxTokens: number };
      }) =>
        reasoning && 'effort' in reasoning
          ? {
              providerOptions: {
                openrouter: {
                  reasoning: { effort: reasoning.effort },
                },
              },
            }
          : {},
    };

    const ai = createAiFn({ provider, retries: 0 });

    const analyze = ai.fn({
      model: 'test-model',
      system: 'Analyze the input.',
      schema: z.object({ result: z.string() }),
      input: (text: string) => text,
      reasoning: { effort: 'high' },
    });

    await analyze('complex input');

    const providerOpts = extractProviderOptions(doGenerate.mock.calls[0][0]);
    expect(providerOpts).toBeDefined();
    expect(providerOpts?.openrouter).toEqual({
      reasoning: { effort: 'high' },
    });
  });

  it('passes reasoning maxTokens as max_tokens to providerOptions', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'ok' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = {
      model: () => model,
      buildGenerateOptions: ({
        reasoning,
      }: {
        reasoning?: { effort: string } | { maxTokens: number };
      }) =>
        reasoning && 'maxTokens' in reasoning
          ? {
              providerOptions: {
                openrouter: {
                  reasoning: { max_tokens: reasoning.maxTokens },
                },
              },
            }
          : {},
    };

    const ai = createAiFn({ provider, retries: 0 });

    const analyze = ai.fn({
      model: 'test-model',
      system: 'Analyze the input.',
      schema: z.object({ result: z.string() }),
      input: (text: string) => text,
      reasoning: { maxTokens: 2048 },
    });

    await analyze('complex input');

    const providerOpts = extractProviderOptions(doGenerate.mock.calls[0][0]);
    expect(providerOpts?.openrouter).toEqual({
      reasoning: { max_tokens: 2048 },
    });
  });

  it('omits providerOptions when no reasoning config', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'ok' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const analyze = ai.fn({
      model: 'test-model',
      system: 'Analyze the input.',
      schema: z.object({ result: z.string() }),
      input: (text: string) => text,
    });

    await analyze('simple input');

    const providerOpts = extractProviderOptions(doGenerate.mock.calls[0][0]);
    expect(providerOpts).toBeUndefined();
  });

  it('omits providerOptions for providers without a generate-options hook', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'ok' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const analyze = ai.fn({
      model: 'test-model',
      system: 'Analyze the input.',
      schema: z.object({ result: z.string() }),
      input: (text: string) => text,
      reasoning: { effort: 'high' },
    });

    await analyze('local input');

    const providerOpts = extractProviderOptions(doGenerate.mock.calls[0][0]);
    expect(providerOpts).toBeUndefined();
  });
});
