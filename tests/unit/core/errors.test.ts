import type { AttemptRecord } from '@/core/errors';
import { AiFnError } from '@/core/errors';

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
