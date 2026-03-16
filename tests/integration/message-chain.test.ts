import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 20 }, outputTokens: { total: 10 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

describe('message-chain: static and dynamic messages', () => {
  it('prepends static messages before the user input message', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ answer: 'Paris', certainty: 'high' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const answerWithContext = ai.fn({
      model: 'test-model',
      system: 'Answer questions based on the conversation context.',
      schema: z.object({
        answer: z.string(),
        certainty: z.enum(['high', 'medium', 'low']),
      }),
      messages: [
        { role: 'user', content: 'I am studying European geography.' },
        { role: 'assistant', content: 'Great topic! I can help with that.' },
      ],
      input: (question: string) => question,
    });

    await answerWithContext('What is the capital of France?');

    const callArgs = doGenerate.mock.calls[0][0];
    const messages = callArgs.prompt.filter((m: { role: string }) => m.role !== 'system');

    // Messages order: context user, context assistant, final user
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');

    // The final message should be the question
    expect(messages[2].content).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: 'What is the capital of France?',
      }),
    );
  });

  it('builds messages dynamically from input using function form', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ response: 'The meeting is at 3pm', tone: 'formal' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    type ChatInput = {
      history: Array<{ role: 'user' | 'assistant'; text: string }>;
      newMessage: string;
    };

    const chat = ai.fn({
      model: 'test-model',
      system: 'You are a helpful assistant.',
      schema: z.object({
        response: z.string(),
        tone: z.enum(['formal', 'casual', 'neutral']),
      }),
      messages: (input: ChatInput) =>
        input.history.map((h) => ({
          role: h.role,
          content: h.text,
        })),
      input: (data: ChatInput) => data.newMessage,
    });

    const result = await chat({
      history: [
        { role: 'user', text: 'When is our meeting?' },
        { role: 'assistant', text: 'Let me check the schedule.' },
      ],
      newMessage: 'Please tell me the time.',
    });

    expect(result.response).toBe('The meeting is at 3pm');

    const callArgs = doGenerate.mock.calls[0][0];
    const messages = callArgs.prompt.filter((m: { role: string }) => m.role !== 'system');

    // 2 history messages + 1 new user message
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');
  });

  it('works with an empty messages array', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ reply: 'Hello!' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const greet = ai.fn({
      model: 'test-model',
      system: 'Be friendly.',
      schema: z.object({ reply: z.string() }),
      messages: [],
      input: (text: string) => text,
    });

    const result = await greet('Hi');

    expect(result.reply).toBe('Hello!');

    const callArgs = doGenerate.mock.calls[0][0];
    const nonSystemMessages = callArgs.prompt.filter((m: { role: string }) => m.role !== 'system');
    // Only the final user message
    expect(nonSystemMessages).toHaveLength(1);
    expect(nonSystemMessages[0].role).toBe('user');
  });

  it('works with no messages config at all (undefined)', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ answer: 42 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const compute = ai.fn({
      model: 'test-model',
      system: 'Compute things.',
      schema: z.object({ answer: z.number() }),
      input: (text: string) => text,
    });

    const result = await compute('What is the meaning of life?');

    expect(result.answer).toBe(42);
  });
});
