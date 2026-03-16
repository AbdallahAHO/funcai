import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 30 }, outputTokens: { total: 15 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

/** Extract the system prompt string from doGenerate call args. */
const extractSystemText = (callArgs: { prompt: Array<{ role: string; content: string }> }) => {
  const systemMessage = callArgs.prompt.find((m) => m.role === 'system');
  // AI SDK v6 passes system content as a plain string
  return systemMessage?.content ?? '';
};

describe('few-shots: examples formatted into system prompt', () => {
  it('includes formatted examples in the system prompt', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ sentiment: 'positive', score: 0.9 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const analyzeSentiment = ai.fn({
      model: 'test-model',
      system: 'Analyze the sentiment of the given text.',
      schema: z.object({
        sentiment: z.enum(['positive', 'negative', 'neutral']),
        score: z.number(),
      }),
      examples: [
        {
          input: 'I love this product!',
          output: { sentiment: 'positive', score: 0.95 },
        },
        {
          input: 'Terrible experience.',
          output: { sentiment: 'negative', score: 0.1 },
        },
      ],
      input: (text: string) => text,
    });

    await analyzeSentiment('Great service!');

    const systemText = extractSystemText(doGenerate.mock.calls[0][0]);

    expect(systemText).toContain('Analyze the sentiment of the given text.');
    expect(systemText).toContain('## Examples');
    expect(systemText).toContain('### Example 1');
    expect(systemText).toContain('I love this product!');
    expect(systemText).toContain('"sentiment": "positive"');
    expect(systemText).toContain('### Example 2');
    expect(systemText).toContain('Terrible experience.');
    expect(systemText).toContain('"sentiment": "negative"');
  });

  it('appends examples at the end when no {{FEW_SHOTS}} placeholder exists', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ label: 'bug' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const classify = ai.fn({
      model: 'test-model',
      system: 'Classify GitHub issues.',
      schema: z.object({ label: z.string() }),
      examples: [{ input: 'App crashes on login', output: { label: 'bug' } }],
      input: (text: string) => text,
    });

    await classify('Button does not respond');

    const systemText = extractSystemText(doGenerate.mock.calls[0][0]);

    const baseIndex = systemText.indexOf('Classify GitHub issues.');
    const examplesIndex = systemText.indexOf('## Examples');
    expect(baseIndex).toBeLessThan(examplesIndex);
  });

  it('injects examples at {{FEW_SHOTS}} placeholder when present', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ entity: 'person', name: 'John' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const extractEntity = ai.fn({
      model: 'test-model',
      system: 'Extract named entities.\n\n{{FEW_SHOTS}}\n\nAlways return valid JSON.',
      schema: z.object({ entity: z.string(), name: z.string() }),
      examples: [{ input: 'Alice went to Paris', output: { entity: 'person', name: 'Alice' } }],
      input: (text: string) => text,
    });

    await extractEntity('John visited London');

    const systemText = extractSystemText(doGenerate.mock.calls[0][0]);

    expect(systemText).not.toContain('{{FEW_SHOTS}}');

    const extractIndex = systemText.indexOf('Extract named entities.');
    const examplesIndex = systemText.indexOf('## Examples');
    const jsonIndex = systemText.indexOf('Always return valid JSON.');

    expect(extractIndex).toBeLessThan(examplesIndex);
    expect(examplesIndex).toBeLessThan(jsonIndex);
  });

  it('includes reasoning in system prompt when examples have reasoning', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ sentiment: 'positive', score: 0.9 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const analyzeSentiment = ai.fn({
      model: 'test-model',
      system: 'Analyze the sentiment of the given text.',
      schema: z.object({
        sentiment: z.enum(['positive', 'negative', 'neutral']),
        score: z.number(),
      }),
      examples: [
        {
          input: 'I love this product!',
          output: { sentiment: 'positive', score: 0.95 },
          reasoning: 'The word "love" strongly indicates positive sentiment.',
        },
        {
          input: 'Terrible experience.',
          output: { sentiment: 'negative', score: 0.1 },
        },
      ],
      input: (text: string) => text,
    });

    await analyzeSentiment('Great service!');

    const systemText = extractSystemText(doGenerate.mock.calls[0][0]);

    // First example has reasoning
    expect(systemText).toContain(
      '**Reasoning:** The word "love" strongly indicates positive sentiment.',
    );
    // Second example does not — only one reasoning block
    const matches = systemText.match(/\*\*Reasoning:\*\*/g);
    expect(matches).toHaveLength(1);
  });

  it('produces no examples section when examples array is empty', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ color: 'blue' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const detectColor = ai.fn({
      model: 'test-model',
      system: 'Detect the primary color mentioned.',
      schema: z.object({ color: z.string() }),
      examples: [],
      input: (text: string) => text,
    });

    await detectColor('The sky is blue');

    const systemText = extractSystemText(doGenerate.mock.calls[0][0]);

    expect(systemText).not.toContain('## Examples');
    expect(systemText).toBe('Detect the primary color mentioned.');
  });
});
