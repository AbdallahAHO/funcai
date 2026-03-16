import type { AiFn } from '@/core/types';

const tracked = new Set<AiFn<unknown, unknown>>();

/**
 * Registers an AI function for batch unmocking. Returns the function for chaining.
 *
 * @example
 * beforeEach(() => {
 *   track(classify).mock({ sentiment: "positive" });
 * });
 * afterEach(() => unmockAll());
 */
export function track<TInput, TOutput>(fn: AiFn<TInput, TOutput>): AiFn<TInput, TOutput> {
  tracked.add(fn as AiFn<unknown, unknown>);
  return fn;
}

/**
 * Unmocks all tracked AI functions and clears the registry.
 */
export function unmockAll(): void {
  for (const fn of tracked) {
    fn.unmock();
  }
  tracked.clear();
}

/**
 * Returns whether an AI function is currently mocked.
 */
export function isMocked<TInput, TOutput>(fn: AiFn<TInput, TOutput>): boolean {
  return fn.isMocked;
}
