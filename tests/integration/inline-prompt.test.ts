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

describe('inline-prompt: model/system directly instead of definePrompt', () => {
  it('works with inline model and system instead of definePrompt', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ color: 'red' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const detectColor = ai.fn({
      model: 'inline-model',
      system: 'Detect the dominant color.',
      schema: z.object({ color: z.string() }),
      input: (text: string) => text,
    });

    const result = await detectColor('A red rose');

    expect(result).toEqual({ color: 'red' });
    expect(doGenerate).toHaveBeenCalledOnce();
  });

  it('passes inline system to the model as system prompt', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ mood: 'calm' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const detectMood = ai.fn({
      model: 'test-model',
      system: 'You are a mood detector. Analyze the mood of text.',
      schema: z.object({ mood: z.string() }),
      input: (text: string) => text,
    });

    await detectMood('gentle breeze on a quiet morning');

    const callArgs = doGenerate.mock.calls[0][0];
    const systemMessage = callArgs.prompt.find((m: { role: string }) => m.role === 'system');
    // AI SDK v6 passes system content as a plain string
    expect(systemMessage.content).toContain('You are a mood detector');
  });

  it('supports inline temperature', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ creativity: 'high' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const creative = ai.fn({
      model: 'test-model',
      system: 'Be creative.',
      schema: z.object({ creativity: z.string() }),
      temperature: 0.9,
      input: (text: string) => text,
    });

    await creative('Write something');

    const callArgs = doGenerate.mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.9);
  });

  it('throws when neither prompt nor inline model is provided', () => {
    const doGenerate = vi.fn();
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    expect(() =>
      ai.fn({
        system: 'System prompt here.',
        schema: z.object({ value: z.string() }),
        input: (text: string) => text,
      }),
    ).toThrow('model');
  });

  it('throws when neither prompt nor inline system is provided', () => {
    const doGenerate = vi.fn();
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    expect(() =>
      ai.fn({
        model: 'test-model',
        schema: z.object({ value: z.string() }),
        input: (text: string) => text,
      }),
    ).toThrow('system');
  });

  it('inline temperature overrides prompt config temperature', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'ok' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const prompt = ai.definePrompt({
      id: 'base-prompt',
      model: 'prompt-model',
      system: 'Base system prompt.',
      temperature: 0.3,
    });

    const task = ai.fn({
      prompt,
      schema: z.object({ result: z.string() }),
      temperature: 0.8,
      input: (text: string) => text,
    });

    await task('test');

    const callArgs = doGenerate.mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.8);
  });

  it('falls back to prompt config temperature when inline is not set', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'ok' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const prompt = ai.definePrompt({
      id: 'prompt-with-temp',
      model: 'test-model',
      system: 'Do something.',
      temperature: 0.5,
    });

    const task = ai.fn({
      prompt,
      schema: z.object({ result: z.string() }),
      input: (text: string) => text,
    });

    await task('test');

    const callArgs = doGenerate.mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.5);
  });
});
