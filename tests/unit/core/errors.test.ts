import type { AttemptRecord } from '@/core/errors';
import { AiFnError, FUNCAI_ERROR_HINTS, FuncaiError, isFuncaiError } from '@/core/errors';

describe('FuncaiError', () => {
  it('stores product error metadata', () => {
    const err = new FuncaiError('Missing key', { code: 'FUNCAI_MISSING_API_KEY' });

    expect(err.name).toBe('FuncaiError');
    expect(err.code).toBe('FUNCAI_MISSING_API_KEY');
    expect(err.hint).toBe(FUNCAI_ERROR_HINTS.FUNCAI_MISSING_API_KEY);
    expect(isFuncaiError(err)).toBe(true);
  });

  it('allows custom hints and causes', () => {
    const cause = new Error('root');
    const err = new FuncaiError('Provider failed', {
      code: 'FUNCAI_PROVIDER_UNAVAILABLE',
      hint: 'try later',
      cause,
    });

    expect(err.hint).toBe('try later');
    expect(err.cause).toBe(cause);
  });
});

describe('AiFnError', () => {
  const makeAttempt = (overrides?: Partial<AttemptRecord>): AttemptRecord => ({
    model: 'openai/gpt-4o',
    error: new Error('something broke'),
    durationMs: 120,
    ...overrides,
  });

  it('sets name to "AiFnError"', () => {
    const err = new AiFnError('fail', [makeAttempt()]);
    expect(err.name).toBe('AiFnError');
  });

  it('extends Error', () => {
    const err = new AiFnError('fail', [makeAttempt()]);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AiFnError);
  });

  it('stores the message', () => {
    const err = new AiFnError('All 3 attempts failed', [makeAttempt()]);
    expect(err.message).toBe('All 3 attempts failed');
  });

  it('defaults to a classified product error code', () => {
    const err = new AiFnError('fail', [makeAttempt({ error: new Error('Too Many Requests') })]);
    expect(err.code).toBe('FUNCAI_PROVIDER_RATE_LIMITED');
    expect(err.hint).toBe(FUNCAI_ERROR_HINTS.FUNCAI_PROVIDER_RATE_LIMITED);
  });

  it('accepts an explicit product error code', () => {
    const err = new AiFnError('fail', [makeAttempt()], {
      code: 'FUNCAI_ALL_FALLBACKS_FAILED',
    });

    expect(err.code).toBe('FUNCAI_ALL_FALLBACKS_FAILED');
  });

  it('stores all attempt records', () => {
    const attempts = [
      makeAttempt({ model: 'model-a', durationMs: 100 }),
      makeAttempt({ model: 'model-b', durationMs: 200 }),
      makeAttempt({ model: 'model-c', durationMs: 300 }),
    ];
    const err = new AiFnError('fail', attempts);
    expect(err.attempts).toHaveLength(3);
    expect(err.attempts).toBe(attempts);
  });

  it('sets lastError to the final attempt error', () => {
    const firstError = new Error('first');
    const lastError = new Error('last');
    const attempts = [makeAttempt({ error: firstError }), makeAttempt({ error: lastError })];
    const err = new AiFnError('fail', attempts);
    expect(err.lastError).toBe(lastError);
  });

  it('sets lastError to "Unknown error" when attempts array is empty', () => {
    const err = new AiFnError('fail', []);
    expect(err.lastError).toBeInstanceOf(Error);
    expect(err.lastError.message).toBe('Unknown error');
  });

  it('has a stack trace', () => {
    const err = new AiFnError('fail', [makeAttempt()]);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AiFnError');
  });
});
