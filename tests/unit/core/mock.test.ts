import { z } from 'zod';
import { createFn } from '@/core/fn';
import type { AiFn, Provider } from '@/core/types';

// Minimal mock provider that throws if actually called (proves mocking bypasses real execution)
const throwingProvider: Provider = {
  model: () => {
    throw new Error('Real provider should not be called when mocked');
  },
};

const schema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number(),
});
type Output = z.infer<typeof schema>;

const makeFn = (): AiFn<string, Output> =>
  createFn(
    {
      schema,
      model: 'test/model',
      system: 'Classify sentiment',
      input: (text: string) => text,
    },
    { provider: throwingProvider, defaultRetries: 0 },
  );

describe('.mock() / .unmock() / .isMocked', () => {
  let classify: AiFn<string, Output>;

  beforeEach(() => {
    classify = makeFn();
  });

  it('returns a static mock value', async () => {
    classify.mock({ sentiment: 'positive', confidence: 0.95 });
    const result = await classify('great product!');
    expect(result).toEqual({ sentiment: 'positive', confidence: 0.95 });
  });

  it('returns synthetic DetailedResult from .detailed()', async () => {
    classify.mock({ sentiment: 'positive', confidence: 0.9 });
    const result = await classify.detailed('test');
    expect(result.output).toEqual({ sentiment: 'positive', confidence: 0.9 });
    expect(result.model).toBe('mock');
    expect(result.latencyMs).toBe(0);
    expect(result.attempts).toBe(0);
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(result.traceId).toBeDefined();
  });

  it('calls a dynamic mock function with the input', async () => {
    classify.mock((text) => ({
      sentiment: text.includes('love') ? 'positive' : 'negative',
      confidence: 0.8,
    }));
    expect(await classify('I love it')).toEqual({ sentiment: 'positive', confidence: 0.8 });
    expect(await classify('I hate it')).toEqual({ sentiment: 'negative', confidence: 0.8 });
  });

  it('resolves an async mock function', async () => {
    classify.mock(async (_text) => {
      return { sentiment: 'neutral', confidence: 0.5 };
    });
    const result = await classify('whatever');
    expect(result).toEqual({ sentiment: 'neutral', confidence: 0.5 });
  });

  it('sets isMocked to true when a permanent mock is active', () => {
    expect(classify.isMocked).toBe(false);
    classify.mock({ sentiment: 'positive', confidence: 1 });
    expect(classify.isMocked).toBe(true);
  });

  it('clears both permanent mock and once-queue on unmock()', () => {
    classify.mock({ sentiment: 'positive', confidence: 1 });
    classify.mockOnce({ sentiment: 'negative', confidence: 0 });
    expect(classify.isMocked).toBe(true);
    classify.unmock();
    expect(classify.isMocked).toBe(false);
  });

  it('sets isMocked to true when mockOnce queue is non-empty', () => {
    classify.mockOnce({ sentiment: 'positive', confidence: 1 });
    expect(classify.isMocked).toBe(true);
  });

  it('sets isMocked to false after unmock()', () => {
    classify.mock({ sentiment: 'positive', confidence: 1 });
    classify.unmock();
    expect(classify.isMocked).toBe(false);
  });

  it('respects traceId from options in mocked .detailed()', async () => {
    classify.mock({ sentiment: 'positive', confidence: 1 });
    const result = await classify.detailed('test', { traceId: 'custom-trace-123' });
    expect(result.traceId).toBe('custom-trace-123');
  });
});

describe('.mockOnce()', () => {
  let classify: AiFn<string, Output>;

  beforeEach(() => {
    classify = makeFn();
  });

  it('uses mock for first call only, then falls through to real execution', async () => {
    classify.mockOnce({ sentiment: 'positive', confidence: 1 });

    // First call — mocked
    const first = await classify('test');
    expect(first).toEqual({ sentiment: 'positive', confidence: 1 });

    // Second call — hits real provider (wrapped in AiFnError by retry logic)
    await expect(classify('test')).rejects.toThrow('All 1 attempts failed');
  });

  it('drains in FIFO order', async () => {
    classify.mockOnce({ sentiment: 'positive', confidence: 0.9 });
    classify.mockOnce({ sentiment: 'negative', confidence: 0.8 });
    classify.mockOnce({ sentiment: 'neutral', confidence: 0.7 });

    expect(await classify('a')).toEqual({ sentiment: 'positive', confidence: 0.9 });
    expect(await classify('b')).toEqual({ sentiment: 'negative', confidence: 0.8 });
    expect(await classify('c')).toEqual({ sentiment: 'neutral', confidence: 0.7 });
  });

  it('takes priority over permanent mock, then falls back to it', async () => {
    classify.mock({ sentiment: 'neutral', confidence: 0.5 });
    classify.mockOnce({ sentiment: 'positive', confidence: 1 });

    // First call — mockOnce
    expect(await classify('a')).toEqual({ sentiment: 'positive', confidence: 1 });
    // Second call — permanent mock
    expect(await classify('b')).toEqual({ sentiment: 'neutral', confidence: 0.5 });
    // Third call — still permanent mock
    expect(await classify('c')).toEqual({ sentiment: 'neutral', confidence: 0.5 });
  });

  it('supports dynamic mock functions', async () => {
    classify.mockOnce((text) => ({
      sentiment: text === 'yes' ? 'positive' : 'negative',
      confidence: 0.99,
    }));
    expect(await classify('yes')).toEqual({ sentiment: 'positive', confidence: 0.99 });
  });
});

describe('independent mocking', () => {
  it('mocking one function does not affect another', async () => {
    const fnA = makeFn();
    const fnB = makeFn();

    fnA.mock({ sentiment: 'positive', confidence: 1 });

    expect(fnA.isMocked).toBe(true);
    expect(fnB.isMocked).toBe(false);

    const result = await fnA('test');
    expect(result).toEqual({ sentiment: 'positive', confidence: 1 });

    // fnB should hit real provider (wrapped in AiFnError by retry logic)
    await expect(fnB('test')).rejects.toThrow('All 1 attempts failed');
  });
});
