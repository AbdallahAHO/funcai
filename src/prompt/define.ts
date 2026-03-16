import type { PromptConfig, PromptInput } from '@/core/types';

/**
 * Creates a prompt config from input. Used both by `ai.definePrompt()` (bound to
 * provider model type) and as a standalone export for codegen.
 */
export function definePrompt<TModelId extends string>(input: PromptInput<TModelId>): PromptConfig {
  if (!input.id) throw new Error('definePrompt: "id" is required');
  if (!input.model) throw new Error('definePrompt: "model" is required');
  if (!input.system) throw new Error('definePrompt: "system" is required');

  return {
    id: input.id,
    model: input.model,
    system: input.system,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  };
}
