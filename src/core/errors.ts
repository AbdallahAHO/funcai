export type AttemptRecord = {
  model: string;
  error: Error;
  durationMs: number;
};

export class AiFnError extends Error {
  readonly attempts: AttemptRecord[];
  readonly lastError: Error;

  constructor(message: string, attempts: AttemptRecord[]) {
    const last = attempts.at(-1);
    super(message);
    this.name = 'AiFnError';
    this.attempts = attempts;
    this.lastError = last?.error ?? new Error('Unknown error');
  }
}
