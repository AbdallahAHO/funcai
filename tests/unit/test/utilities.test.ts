import { z } from 'zod';
import { createFn } from '@/core/fn';
import type { AiFn, Provider } from '@/core/types';
import { isMocked, track, unmockAll } from '../../../test/mock';

const throwingProvider: Provider = {
  model: () => {
    throw new Error('Real provider should not be called');
  },
};

const schema = z.object({ value: z.string() });
type Output = z.infer<typeof schema>;

const makeFn = (): AiFn<string, Output> =>
  createFn(
    {
      schema,
      model: 'test/model',
      system: 'Test',
      input: (text: string) => text,
    },
    { provider: throwingProvider, defaultRetries: 0 },
  );

describe('track / unmockAll', () => {
  afterEach(() => unmockAll());

  it('track() returns the function for chaining', () => {
    const fn = makeFn();
    const returned = track(fn);
    expect(returned).toBe(fn);
  });

  it('track().mock() works as a chained call', async () => {
    const fn = makeFn();
    track(fn).mock({ value: 'mocked' });
    expect(await fn('test')).toEqual({ value: 'mocked' });
  });

  it('unmockAll() unmocks all tracked functions', async () => {
    const fnA = makeFn();
    const fnB = makeFn();

    track(fnA).mock({ value: 'a' });
    track(fnB).mock({ value: 'b' });

    expect(fnA.isMocked).toBe(true);
    expect(fnB.isMocked).toBe(true);

    unmockAll();

    expect(fnA.isMocked).toBe(false);
    expect(fnB.isMocked).toBe(false);
  });

  it('unmockAll() clears the registry so re-tracking is fresh', () => {
    const fn = makeFn();
    track(fn).mock({ value: 'a' });
    unmockAll();

    // fn is unmocked and no longer tracked
    expect(fn.isMocked).toBe(false);
  });
});

describe('isMocked()', () => {
  it('reflects current mock state', () => {
    const fn = makeFn();
    expect(isMocked(fn)).toBe(false);
    fn.mock({ value: 'test' });
    expect(isMocked(fn)).toBe(true);
    fn.unmock();
    expect(isMocked(fn)).toBe(false);
  });
});
