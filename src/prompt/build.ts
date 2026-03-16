import type { Example } from '@/core/types';
import { formatExamples, injectVariables } from './format';

type BuildOptions<TOutput> = {
  system: string;
  examples?: Example<TOutput>[];
  variables?: Record<string, string>;
};

/**
 * Assembles the final system prompt from a base system string, optional examples,
 * and optional template variables. Handles `{{FEW_SHOTS}}` placeholder automatically
 * if present, otherwise appends examples at the end.
 */
export function buildSystemPrompt<TOutput>(options: BuildOptions<TOutput>): string {
  const { system, examples = [], variables = {} } = options;

  const formattedExamples = formatExamples(examples);

  // If the system prompt has a {{FEW_SHOTS}} placeholder, inject there
  const hasFewShotsPlaceholder = system.includes('{{FEW_SHOTS}}');
  let assembled: string;

  if (hasFewShotsPlaceholder) {
    assembled = injectVariables(system, {
      FEW_SHOTS: formattedExamples,
      ...variables,
    });
  } else {
    // Inject any other variables first
    assembled = Object.keys(variables).length > 0 ? injectVariables(system, variables) : system;

    // Append examples at the end if they exist
    if (formattedExamples) {
      assembled = `${assembled}\n\n${formattedExamples}`;
    }
  }

  return assembled;
}
