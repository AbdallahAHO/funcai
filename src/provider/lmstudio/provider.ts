import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import type { Provider } from '@/core/types';

export type LMStudioModelId = string & {};

export type LMStudioConfig = {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
};

const DEFAULT_BASE_URL = 'http://127.0.0.1:1234/v1';

/**
 * LM Studio provider using the OpenAI-compatible local API.
 *
 * @example
 * ```ts
 * import { lmstudio } from 'funcai/providers/lmstudio';
 *
 * const provider = lmstudio();
 * ```
 */
export function lmstudio(config?: LMStudioConfig): Provider<LMStudioModelId> {
  let instance: ReturnType<
    typeof createOpenAICompatible<LMStudioModelId, string, string, string>
  > | null = null;

  return {
    id: 'lmstudio',
    model: ({ modelId }): LanguageModel => {
      if (!instance) {
        instance = createOpenAICompatible<LMStudioModelId, string, string, string>({
          name: 'lmstudio',
          baseURL: config?.baseURL ?? DEFAULT_BASE_URL,
          apiKey: config?.apiKey,
          supportsStructuredOutputs: true,
          ...(config?.headers && { headers: config.headers }),
          ...(config?.queryParams && { queryParams: config.queryParams }),
          ...(config?.fetch && { fetch: config.fetch }),
        });
      }

      return instance.chatModel(modelId);
    },
  };
}
