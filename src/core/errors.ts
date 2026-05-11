export type AttemptRecord = {
  model: string;
  error: Error;
  durationMs: number;
};

export const FUNCAI_ERROR_HINTS = {
  FUNCAI_MISSING_API_KEY:
    'Set the provider environment variable or pass the key explicitly to the provider factory.',
  FUNCAI_MODEL_UNSUPPORTED_SCHEMA:
    'Choose a model from the structured-output registry or refresh the registry before using this model.',
  FUNCAI_SCHEMA_VALIDATION_FAILED:
    'Tighten the prompt, add few-shot examples, or relax the Zod schema if the output shape is valid for your use case.',
  FUNCAI_PROVIDER_RATE_LIMITED:
    'Lower concurrency, increase retries, add a fallback model, or choose a provider/model with more available quota.',
  FUNCAI_PROVIDER_UNAVAILABLE:
    'Check network access and provider status, then retry or configure a fallback model.',
  FUNCAI_ALL_FALLBACKS_FAILED:
    'Inspect the attempt history, then adjust retries, fallback models, provider credentials, or the schema.',
} as const;

export type FuncaiErrorCode = keyof typeof FUNCAI_ERROR_HINTS;

export type FuncaiErrorOptions = {
  code: FuncaiErrorCode;
  hint?: string;
  cause?: unknown;
};

export class FuncaiError extends Error {
  readonly code: FuncaiErrorCode;
  readonly hint: string;
  override readonly cause?: unknown;

  constructor(message: string, options: FuncaiErrorOptions) {
    super(message);
    this.name = 'FuncaiError';
    this.code = options.code;
    this.hint = options.hint ?? FUNCAI_ERROR_HINTS[options.code];
    this.cause = options.cause;
  }
}

export function isFuncaiError(error: unknown): error is FuncaiError {
  return error instanceof FuncaiError;
}

export function classifyProviderError(error: Error): FuncaiErrorCode {
  const statusCode =
    (error as unknown as Record<string, unknown>).statusCode ??
    (error as unknown as Record<string, unknown>).status;
  const message = error.message.toLowerCase();

  if (statusCode === 429 || /rate.?limit|too many requests/.test(message)) {
    return 'FUNCAI_PROVIDER_RATE_LIMITED';
  }

  if (
    (typeof statusCode === 'number' && [500, 502, 503, 504].includes(statusCode)) ||
    /fetch failed|econnrefused|timeout|5\d{2}|service unavailable|bad gateway/.test(message)
  ) {
    return 'FUNCAI_PROVIDER_UNAVAILABLE';
  }

  if (/schema|zod|validation|no object generated|invalid json|parse/.test(message)) {
    return 'FUNCAI_SCHEMA_VALIDATION_FAILED';
  }

  if (/model|structured output|response_format|unsupported/.test(message)) {
    return 'FUNCAI_MODEL_UNSUPPORTED_SCHEMA';
  }

  return 'FUNCAI_ALL_FALLBACKS_FAILED';
}

export class AiFnError extends FuncaiError {
  readonly attempts: AttemptRecord[];
  readonly lastError: Error;

  constructor(message: string, attempts: AttemptRecord[], options?: Partial<FuncaiErrorOptions>) {
    const last = attempts.at(-1);
    const code = options?.code ?? classifyProviderError(last?.error ?? new Error('Unknown error'));
    super(message, {
      code,
      hint: options?.hint,
      cause: options?.cause ?? last?.error,
    });
    this.name = 'AiFnError';
    this.attempts = attempts;
    this.lastError = last?.error ?? new Error('Unknown error');
  }
}
