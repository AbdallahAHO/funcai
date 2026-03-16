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

describe('simple-fn: string input -> structured output', () => {
  it('returns parsed output from a basic string-input fn', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ intent: 'greeting', confidence: 0.95 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const prompt = ai.definePrompt({
      id: 'classify-intent',
      model: 'test-model',
      system: 'Classify the user intent.',
    });

    const classifyIntent = ai.fn({
      prompt,
      schema: z.object({
        intent: z.string(),
        confidence: z.number(),
      }),
      input: (text: string) => text,
    });

    const result = await classifyIntent('Hello there!');

    expect(result).toEqual({ intent: 'greeting', confidence: 0.95 });
    expect(doGenerate).toHaveBeenCalledOnce();
  });

  it('passes the user message from the input function to the model', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ sentiment: 'positive' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const analyzeSentiment = ai.fn({
      model: 'test-model',
      system: 'Analyze sentiment.',
      schema: z.object({ sentiment: z.enum(['positive', 'negative', 'neutral']) }),
      input: (text: string) => `Analyze: "${text}"`,
    });

    await analyzeSentiment('I love this product!');

    const callArgs = doGenerate.mock.calls[0][0];
    const lastMessage = callArgs.prompt.at(-1);
    expect(lastMessage.role).toBe('user');
    expect(lastMessage.content).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'Analyze: "I love this product!"' }),
    );
  });

  it('injects the system prompt from the prompt config', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ category: 'tech' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const prompt = ai.definePrompt({
      id: 'categorize',
      model: 'test-model',
      system: 'You categorize articles into topics.',
    });

    const categorize = ai.fn({
      prompt,
      schema: z.object({ category: z.string() }),
      input: (text: string) => text,
    });

    await categorize('New JavaScript framework released');

    const callArgs = doGenerate.mock.calls[0][0];
    const systemMessage = callArgs.prompt.find((m: { role: string }) => m.role === 'system');
    // AI SDK v6 passes system content as a plain string
    expect(systemMessage.content).toBe('You categorize articles into topics.');
  });

  it('handles a schema with nested objects and arrays', async () => {
    const expectedOutput = {
      title: 'Meeting Notes',
      items: [
        { text: 'Discuss roadmap', priority: 'high' },
        { text: 'Review PRs', priority: 'medium' },
      ],
    };

    const doGenerate = vi.fn().mockResolvedValue(mockResponse(expectedOutput));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const extractTodos = ai.fn({
      model: 'test-model',
      system: 'Extract action items from meeting notes.',
      schema: z.object({
        title: z.string(),
        items: z.array(
          z.object({
            text: z.string(),
            priority: z.enum(['high', 'medium', 'low']),
          }),
        ),
      }),
      input: (text: string) => text,
    });

    const result = await extractTodos('We need to discuss roadmap and review PRs');

    expect(result).toEqual(expectedOutput);
  });
});
