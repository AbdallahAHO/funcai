import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AiFnError, createAiFn } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

describe('retry-fallback: retries exhausted, fallback model, AiFnError', () => {
  it('retries on retryable errors and succeeds within retry limit', async () => {
    const doGenerate = vi
      .fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValueOnce(mockResponse({ status: 'ok' }));

    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 1 });

    const check = ai.fn({
      model: 'primary-model',
      system: 'Check status.',
      schema: z.object({ status: z.string() }),
      input: (text: string) => text,
    });

    const result = await check('ping');

    expect(result).toEqual({ status: 'ok' });
    expect(doGenerate).toHaveBeenCalledTimes(2);
  });

  it('falls back to secondary model when primary exhausts retries', async () => {
    const primaryDoGenerate = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));
    const fallbackDoGenerate = vi.fn().mockResolvedValue(mockResponse({ result: 'from-fallback' }));

    const primaryModel = new MockLanguageModelV3({ doGenerate: primaryDoGenerate });
    const fallbackModel = new MockLanguageModelV3({ doGenerate: fallbackDoGenerate });

    const provider = {
      model: (config: { modelId: string }) => {
        if (config.modelId === 'fallback-model') return fallbackModel;
        return primaryModel;
      },
    };

    const ai = createAiFn({ provider, retries: 1 });

    const task = ai.fn({
      model: 'primary-model',
      system: 'Do a task.',
      schema: z.object({ result: z.string() }),
      fallback: ['fallback-model'],
      input: (text: string) => text,
    });

    const result = await task('go');

    expect(result).toEqual({ result: 'from-fallback' });
    // Primary: 2 attempts (1 initial + 1 retry), fallback: 1 attempt
    expect(primaryDoGenerate).toHaveBeenCalledTimes(2);
    expect(fallbackDoGenerate).toHaveBeenCalledTimes(1);
  });

  it('throws AiFnError with attempt details when all models fail', async () => {
    const primaryDoGenerate = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));
    const fallbackDoGenerate = vi.fn().mockRejectedValue(new Error('502 Bad Gateway'));

    const primaryModel = new MockLanguageModelV3({ doGenerate: primaryDoGenerate });
    const fallbackModel = new MockLanguageModelV3({ doGenerate: fallbackDoGenerate });

    const provider = {
      model: (config: { modelId: string }) => {
        if (config.modelId === 'fallback-model') return fallbackModel;
        return primaryModel;
      },
    };

    const ai = createAiFn({ provider, retries: 1 });

    const task = ai.fn({
      model: 'primary-model',
      system: 'Do something.',
      schema: z.object({ value: z.string() }),
      fallback: ['fallback-model'],
      input: (text: string) => text,
    });

    await expect(task('go')).rejects.toThrow(AiFnError);

    try {
      await task('go');
    } catch (error) {
      const aiFnError = error as InstanceType<typeof AiFnError>;

      expect(aiFnError.name).toBe('AiFnError');
      expect(aiFnError.attempts.length).toBeGreaterThanOrEqual(3);
      expect(aiFnError.lastError).toBeInstanceOf(Error);

      // Should have attempts from both models
      const primaryAttempts = aiFnError.attempts.filter((a) => a.model === 'primary-model');
      const fallbackAttempts = aiFnError.attempts.filter((a) => a.model === 'fallback-model');
      expect(primaryAttempts.length).toBe(2); // 1 initial + 1 retry
      expect(fallbackAttempts.length).toBe(2); // 1 initial + 1 retry

      // Each attempt has duration info
      for (const attempt of aiFnError.attempts) {
        expect(attempt.durationMs).toBeGreaterThanOrEqual(0);
        expect(attempt.error).toBeInstanceOf(Error);
      }
    }
  });

  it('does not retry on non-retryable errors', async () => {
    const doGenerate = vi.fn().mockRejectedValue(new Error('Invalid API key'));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 3 });

    const task = ai.fn({
      model: 'test-model',
      system: 'Do something.',
      schema: z.object({ done: z.boolean() }),
      input: (text: string) => text,
    });

    await expect(task('go')).rejects.toThrow(AiFnError);

    // Non-retryable error: only 1 attempt, no retries
    expect(doGenerate).toHaveBeenCalledTimes(1);
  });

  it('respects per-fn retries override instead of factory default', async () => {
    const doGenerate = vi
      .fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    // Factory default: 1 retry
    const ai = createAiFn({ provider, retries: 1 });

    // Fn override: 3 retries (4 attempts total)
    const task = ai.fn({
      model: 'test-model',
      system: 'Do something.',
      schema: z.object({ ok: z.boolean() }),
      retries: 3,
      input: (text: string) => text,
    });

    const result = await task('go');

    expect(result).toEqual({ ok: true });
    expect(doGenerate).toHaveBeenCalledTimes(4);
  });

  it('reports correct model name in detailed result after fallback', async () => {
    const primaryDoGenerate = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));
    const fallbackDoGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ value: 'fallback-result' }));

    const primaryModel = new MockLanguageModelV3({ doGenerate: primaryDoGenerate });
    const fallbackModel = new MockLanguageModelV3({ doGenerate: fallbackDoGenerate });

    const provider = {
      model: (config: { modelId: string }) => {
        if (config.modelId === 'backup-model') return fallbackModel;
        return primaryModel;
      },
    };

    const ai = createAiFn({ provider, retries: 0 });

    const task = ai.fn({
      model: 'main-model',
      system: 'Do something.',
      schema: z.object({ value: z.string() }),
      fallback: ['backup-model'],
      input: (text: string) => text,
    });

    const result = await task.detailed('go');

    expect(result.model).toBe('backup-model');
    expect(result.output).toEqual({ value: 'fallback-result' });
    expect(result.attempts).toBe(2); // 1 primary fail + 1 fallback success
  });
});
