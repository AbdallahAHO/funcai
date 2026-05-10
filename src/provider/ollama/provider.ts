import type { LanguageModel } from 'ai';
import { createOllama } from 'ai-sdk-ollama';
import type { Provider } from '@/core/types';

export type OllamaModelId = string & {};

export type OllamaConfig = {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
};

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';

/**
 * Ollama provider using the local Ollama API.
 *
 * @example
 * ```ts
 * import { ollama } from 'funcai/providers/ollama';
 *
 * const provider = ollama();
 * ```
 */
export function ollama(config?: OllamaConfig): Provider<OllamaModelId> {
  let instance: ReturnType<typeof createOllama> | null = null;

  return {
    id: 'ollama',
    model: ({ modelId }): LanguageModel => {
      if (!instance) {
        instance = createOllama({
          baseURL: config?.baseURL ?? DEFAULT_BASE_URL,
          apiKey: config?.apiKey,
          ...(config?.headers && { headers: config.headers }),
          ...(config?.fetch && { fetch: config.fetch }),
        });
      }

      return instance.chat(modelId);
    },
  };
}
