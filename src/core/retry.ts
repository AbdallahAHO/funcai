import type { AttemptRecord, FuncaiErrorCode } from './errors';
import { AiFnError, classifyProviderError } from './errors';

const MIN_DELAY = 500;
const MAX_DELAY = 5000;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function nowMs(): number {
  return globalThis.performance?.now() ?? Date.now();
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return true;
    }
    // Check for status code in error properties
    const statusCode =
      (error as unknown as Record<string, unknown>).statusCode ??
      (error as unknown as Record<string, unknown>).status;
    if (typeof statusCode === 'number') {
      return RETRYABLE_STATUS_CODES.has(statusCode);
    }
    // Rate limit or server error messages
    if (/rate.?limit|too many requests|timeout|5\d{2}/i.test(error.message)) {
      return true;
    }
  }
  return false;
}

export function calculateDelay(attempt: number): number {
  const base = MIN_DELAY * 2 ** attempt;
  const jitter = Math.random() * MIN_DELAY;
  return Math.min(base + jitter, MAX_DELAY);
}

function classifyAttemptFailure(attempts: AttemptRecord[], modelCount: number): FuncaiErrorCode {
  const lastError = attempts.at(-1)?.error;
  if (!lastError) return 'FUNCAI_ALL_FALLBACKS_FAILED';

  const classified = classifyProviderError(lastError);
  if (classified !== 'FUNCAI_ALL_FALLBACKS_FAILED') return classified;

  return modelCount > 1 ? 'FUNCAI_ALL_FALLBACKS_FAILED' : classified;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryOptions<T> = {
  fn: (modelId: string) => Promise<T>;
  primaryModel: string;
  retries: number;
  fallback?: string[];
};

/**
 * Executes `fn` with retry logic and model fallback.
 * Each model (primary + fallbacks) gets `retries + 1` attempts.
 */
export async function withRetry<T>(
  options: RetryOptions<T>,
): Promise<{ result: T; model: string; attempts: number }> {
  const { fn, primaryModel, retries, fallback = [] } = options;
  const models = [primaryModel, ...fallback];
  const attempts: AttemptRecord[] = [];
  let totalAttempts = 0;

  for (const modelId of models) {
    const maxAttempts = retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      totalAttempts++;
      const start = nowMs();

      try {
        const result = await fn(modelId);
        return { result, model: modelId, attempts: totalAttempts };
      } catch (error) {
        const duration = nowMs() - start;
        const err = error instanceof Error ? error : new Error(String(error));
        attempts.push({ model: modelId, error: err, durationMs: duration });

        // Non-retryable → skip remaining attempts for this model
        if (!isRetryable(error)) break;

        // Last attempt for this model → move to next
        if (attempt === maxAttempts - 1) break;

        await sleep(calculateDelay(attempt));
      }
    }
  }

  throw new AiFnError(
    `All ${totalAttempts} attempts failed across ${models.length} model(s)`,
    attempts,
    { code: classifyAttemptFailure(attempts, models.length) },
  );
}
