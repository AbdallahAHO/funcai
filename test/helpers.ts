import type { z } from 'zod';
import type { Example } from '@/core/types';

/**
 * Validates that all few-shot examples conform to the given Zod schema.
 * Throws on first invalid example with a descriptive error.
 */
export function validateExamples<TSchema extends z.ZodType>(
  examples: Example<z.infer<TSchema>>[],
  schema: TSchema,
): void {
  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    if (!ex) continue;
    const result = schema.safeParse(ex.output);
    if (!result.success) {
      throw new Error(`Example ${i + 1} output does not match schema:\n${result.error.message}`);
    }
  }
}
