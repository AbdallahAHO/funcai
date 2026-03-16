import type { z } from 'zod';
import { definePrompt } from '@/prompt/define';
import { injectVariables } from '@/prompt/format';
import { createFn } from './fn';
import type {
  AiFn,
  AiFnInstance,
  CreateAiFnConfig,
  FnConfig,
  ModelIdOf,
  PromptConfig,
  PromptInput,
  Provider,
} from './types';

const DEFAULT_RETRIES = 2;

/**
 * Factory that creates a typed AI function instance bound to a provider and trace config.
 *
 * @example
 * ```ts
 * const ai = createAiFn({
 *   provider: openrouter({ apiKey: "sk-..." }),
 *   trace: posthog("phc_..."),
 *   retries: 2,
 * });
 * ```
 */
export function createAiFn<P extends Provider>(
  config: CreateAiFnConfig<P>,
): AiFnInstance<ModelIdOf<P>> {
  type TModelId = ModelIdOf<P>;

  const context = {
    provider: config.provider,
    trace: config.trace,
    defaultRetries: config.retries ?? DEFAULT_RETRIES,
  };

  return {
    definePrompt: (input: PromptInput<TModelId>): PromptConfig => definePrompt(input),

    fn: <TSchema extends z.ZodType, TInput = string, TOutput = z.infer<TSchema>>(
      fnConfig: FnConfig<TSchema, TInput, TOutput, TModelId>,
    ): AiFn<TInput, TOutput> => createFn(fnConfig, context),

    injectVariables,
  };
}
