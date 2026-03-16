import { AiFnError } from '@/core/errors';
import { calculateDelay, isRetryable, withRetry } from '@/core/retry';

// --------------------------------------------------------------------------
// isRetryable
// --------------------------------------------------------------------------

describe('isRetryable', () => {
  it('returns true for "fetch failed" network errors', () => {
    expect(isRetryable(new Error('fetch failed'))).toBe(true);
  });

  it('returns true for "ECONNREFUSED" network errors', () => {
    expect(isRetryable(new Error('ECONNREFUSED'))).toBe(true);
  });

  it.each([429, 500, 502, 503, 504])('returns true for statusCode %i', (code) => {
    const error = Object.assign(new Error('http error'), { statusCode: code });
    expect(isRetryable(error)).toBe(true);
  });

  it.each([
    429, 500, 502, 503, 504,
  ])('returns true for status %i (alternative property)', (code) => {
    const error = Object.assign(new Error('http error'), { status: code });
    expect(isRetryable(error)).toBe(true);
  });

  it.each([400, 401, 403, 404, 422])('returns false for non-retryable statusCode %i', (code) => {
    const error = Object.assign(new Error('http error'), { statusCode: code });
    expect(isRetryable(error)).toBe(false);
  });

  it('returns true for "rate limit" message', () => {
    expect(isRetryable(new Error('rate limit exceeded'))).toBe(true);
  });

  it('returns true for "rate_limit" with underscore', () => {
    expect(isRetryable(new Error('rate_limit'))).toBe(true);
  });

  it('returns true for "too many requests" message', () => {
    expect(isRetryable(new Error('Too Many Requests'))).toBe(true);
  });

  it('returns true for "timeout" message', () => {
    expect(isRetryable(new Error('Request timeout'))).toBe(true);
  });

  it('returns true for messages containing 5xx codes like "502"', () => {
    expect(isRetryable(new Error('upstream returned 502'))).toBe(true);
  });

  it('returns false for a generic error message', () => {
    expect(isRetryable(new Error('invalid JSON'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isRetryable('string error')).toBe(false);
    expect(isRetryable(42)).toBe(false);
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable(undefined)).toBe(false);
  });
});

// --------------------------------------------------------------------------
// calculateDelay
// --------------------------------------------------------------------------

describe('calculateDelay', () => {
  it('returns a value >= MIN_DELAY (500) for attempt 0', () => {
    for (let i = 0; i < 20; i++) {
      expect(calculateDelay(0)).toBeGreaterThanOrEqual(500);
    }
  });

  it('never exceeds MAX_DELAY (5000)', () => {
    for (let i = 0; i < 20; i++) {
      expect(calculateDelay(10)).toBeLessThanOrEqual(5000);
    }
  });

  it('increases with attempt number on average', () => {
    const samples = 50;
    let avgDelay0 = 0;
    let avgDelay3 = 0;
    for (let i = 0; i < samples; i++) {
      avgDelay0 += calculateDelay(0);
      avgDelay3 += calculateDelay(3);
    }
    avgDelay0 /= samples;
    avgDelay3 /= samples;
    expect(avgDelay3).toBeGreaterThan(avgDelay0);
  });

  it('caps at MAX_DELAY for very high attempt numbers', () => {
    expect(calculateDelay(100)).toBeLessThanOrEqual(5000);
  });
});

// --------------------------------------------------------------------------
// withRetry
// --------------------------------------------------------------------------

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const { result, model, attempts } = await withRetry({
      fn,
      primaryModel: 'model-a',
      retries: 2,
    });

    expect(result).toBe('ok');
    expect(model).toBe('model-a');
    expect(attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('model-a');
  });

  it('retries on retryable errors and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate limit'), { statusCode: 429 }))
      .mockResolvedValue('recovered');

    const { result, attempts } = await withRetry({
      fn,
      primaryModel: 'model-a',
      retries: 2,
    });

    expect(result).toBe('recovered');
    expect(attempts).toBe(2);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('invalid JSON'))
      .mockResolvedValue('should not reach');

    await expect(withRetry({ fn, primaryModel: 'model-a', retries: 3 })).rejects.toThrow(AiFnError);

    // Non-retryable: 1 attempt on primary, then moves to no fallback → done
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('falls back to next model when primary exhausts retries', async () => {
    const retryableError = Object.assign(new Error('server error'), { statusCode: 500 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(retryableError) // model-a attempt 1
      .mockRejectedValueOnce(retryableError) // model-a attempt 2
      .mockResolvedValue('fallback-ok'); // model-b attempt 1

    const { result, model, attempts } = await withRetry({
      fn,
      primaryModel: 'model-a',
      retries: 1,
      fallback: ['model-b'],
    });

    expect(result).toBe('fallback-ok');
    expect(model).toBe('model-b');
    expect(attempts).toBe(3);
  });

  it('throws AiFnError when all models and retries are exhausted', async () => {
    const retryableError = Object.assign(new Error('server error'), { statusCode: 500 });
    const fn = vi.fn().mockRejectedValue(retryableError);

    try {
      await withRetry({
        fn,
        primaryModel: 'model-a',
        retries: 1,
        fallback: ['model-b'],
      });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AiFnError);
      const aiFnError = error as AiFnError;
      expect(aiFnError.message).toContain('4 attempts');
      expect(aiFnError.message).toContain('2 model(s)');
      expect(aiFnError.attempts).toHaveLength(4);
    }
  });

  it('skips remaining retries on non-retryable error and tries fallback', async () => {
    const nonRetryableError = new Error('validation error');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(nonRetryableError) // model-a breaks immediately
      .mockResolvedValue('fallback-ok'); // model-b succeeds

    const { result, model, attempts } = await withRetry({
      fn,
      primaryModel: 'model-a',
      retries: 3,
      fallback: ['model-b'],
    });

    expect(result).toBe('fallback-ok');
    expect(model).toBe('model-b');
    // 1 attempt on model-a (broke, not retried) + 1 on model-b
    expect(attempts).toBe(2);
  });

  it('wraps non-Error thrown values in Error', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    try {
      await withRetry({ fn, primaryModel: 'model-a', retries: 0 });
      expect.unreachable('should have thrown');
    } catch (error) {
      const aiFnError = error as AiFnError;
      expect(aiFnError.attempts[0].error).toBeInstanceOf(Error);
      expect(aiFnError.attempts[0].error.message).toBe('string error');
    }
  });

  it('records model and duration for each attempt', async () => {
    const retryableError = Object.assign(new Error('timeout'), { statusCode: 503 });
    const fn = vi.fn().mockRejectedValue(retryableError);

    try {
      await withRetry({
        fn,
        primaryModel: 'model-a',
        retries: 1,
        fallback: ['model-b'],
      });
    } catch (error) {
      const aiFnError = error as AiFnError;
      expect(aiFnError.attempts[0].model).toBe('model-a');
      expect(aiFnError.attempts[1].model).toBe('model-a');
      expect(aiFnError.attempts[2].model).toBe('model-b');
      expect(aiFnError.attempts[3].model).toBe('model-b');
      for (const attempt of aiFnError.attempts) {
        expect(typeof attempt.durationMs).toBe('number');
        expect(attempt.durationMs).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('works with retries: 0 (single attempt per model)', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('bad input')).mockResolvedValue('ok');

    const { result, model } = await withRetry({
      fn,
      primaryModel: 'model-a',
      retries: 0,
      fallback: ['model-b'],
    });

    expect(result).toBe('ok');
    expect(model).toBe('model-b');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
