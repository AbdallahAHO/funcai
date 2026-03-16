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

describe('factory-instances: multiple createAiFn instances are isolated', () => {
  it('two instances use different providers independently', async () => {
    const doGenerateA = vi.fn().mockResolvedValue(mockResponse({ source: 'provider-a' }));
    const doGenerateB = vi.fn().mockResolvedValue(mockResponse({ source: 'provider-b' }));

    const modelA = new MockLanguageModelV3({ doGenerate: doGenerateA });
    const modelB = new MockLanguageModelV3({ doGenerate: doGenerateB });

    const aiA = createAiFn({
      provider: { model: () => modelA },
      retries: 0,
    });

    const aiB = createAiFn({
      provider: { model: () => modelB },
      retries: 0,
    });

    const schema = z.object({ source: z.string() });

    const fnA = aiA.fn({
      model: 'model-a',
      system: 'Return source.',
      schema,
      input: (text: string) => text,
    });

    const fnB = aiB.fn({
      model: 'model-b',
      system: 'Return source.',
      schema,
      input: (text: string) => text,
    });

    const [resultA, resultB] = await Promise.all([fnA('test'), fnB('test')]);

    expect(resultA).toEqual({ source: 'provider-a' });
    expect(resultB).toEqual({ source: 'provider-b' });

    expect(doGenerateA).toHaveBeenCalledOnce();
    expect(doGenerateB).toHaveBeenCalledOnce();
  });

  it('instances have independent retry configurations', async () => {
    // Instance A: 0 retries — fails immediately
    const doGenerateA = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));
    const modelA = new MockLanguageModelV3({ doGenerate: doGenerateA });

    const aiA = createAiFn({
      provider: { model: () => modelA },
      retries: 0,
    });

    // Instance B: 2 retries — can recover
    const doGenerateB = vi
      .fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValueOnce(mockResponse({ recovered: true }));
    const modelB = new MockLanguageModelV3({ doGenerate: doGenerateB });

    const aiB = createAiFn({
      provider: { model: () => modelB },
      retries: 2,
    });

    const schema = z.object({ recovered: z.boolean() });

    const fnA = aiA.fn({
      model: 'test-model',
      system: 'Test.',
      schema,
      input: (text: string) => text,
    });

    const fnB = aiB.fn({
      model: 'test-model',
      system: 'Test.',
      schema,
      input: (text: string) => text,
    });

    await expect(fnA('go')).rejects.toThrow();
    expect(doGenerateA).toHaveBeenCalledTimes(1);

    const resultB = await fnB('go');
    expect(resultB).toEqual({ recovered: true });
    expect(doGenerateB).toHaveBeenCalledTimes(3);
  });

  it('instances have independent trace plugins', async () => {
    const wrapA = vi.fn((model) => model);
    const wrapB = vi.fn((model) => model);

    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    const model = new MockLanguageModelV3({ doGenerate });

    const aiA = createAiFn({
      provider: { model: () => model },
      trace: { wrap: wrapA },
      retries: 0,
    });

    const aiB = createAiFn({
      provider: { model: () => model },
      trace: { wrap: wrapB },
      retries: 0,
    });

    const schema = z.object({ ok: z.boolean() });

    const fnA = aiA.fn({
      model: 'test-model',
      system: 'Test.',
      schema,
      input: (text: string) => text,
    });

    const fnB = aiB.fn({
      model: 'test-model',
      system: 'Test.',
      schema,
      input: (text: string) => text,
    });

    await fnA('go');

    expect(wrapA).toHaveBeenCalledOnce();
    expect(wrapB).not.toHaveBeenCalled();

    await fnB('go');

    expect(wrapA).toHaveBeenCalledOnce();
    expect(wrapB).toHaveBeenCalledOnce();
  });

  it('definePrompt on one instance does not affect another', () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    const model = new MockLanguageModelV3({ doGenerate });

    const aiA = createAiFn({
      provider: { model: () => model },
      retries: 0,
    });

    const aiB = createAiFn({
      provider: { model: () => model },
      retries: 0,
    });

    const promptA = aiA.definePrompt({
      id: 'prompt-a',
      model: 'model-a',
      system: 'System A',
    });

    const promptB = aiB.definePrompt({
      id: 'prompt-b',
      model: 'model-b',
      system: 'System B',
    });

    expect(promptA.id).toBe('prompt-a');
    expect(promptA.model).toBe('model-a');
    expect(promptA.system).toBe('System A');

    expect(promptB.id).toBe('prompt-b');
    expect(promptB.model).toBe('model-b');
    expect(promptB.system).toBe('System B');
  });

  it('multiple fns from the same instance operate independently', async () => {
    const doGenerate = vi.fn();
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    doGenerate.mockResolvedValueOnce(mockResponse({ emotion: 'happy' }));

    const detectEmotion = ai.fn({
      model: 'test-model',
      system: 'Detect emotion.',
      schema: z.object({ emotion: z.string() }),
      input: (text: string) => text,
    });

    doGenerate.mockResolvedValueOnce(mockResponse({ language: 'english' }));

    const detectLanguage = ai.fn({
      model: 'test-model',
      system: 'Detect language.',
      schema: z.object({ language: z.string() }),
      input: (text: string) => text,
    });

    const emotionResult = await detectEmotion('I am so happy!');
    const languageResult = await detectLanguage('Hello world');

    expect(emotionResult).toEqual({ emotion: 'happy' });
    expect(languageResult).toEqual({ language: 'english' });
  });
});
