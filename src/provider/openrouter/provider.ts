import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import type { Provider } from '@/core/types';
import type { OpenRouterModelId } from './models';

type OpenRouterConfig = {
  apiKey?: string;
  /** Custom headers for all requests (e.g. Anthropic beta features, BYOK keys) */
  headers?: Record<string, string>;
  /** Extra body fields merged into every request */
  extraBody?: Record<string, unknown>;
  /**
   * Enable response healing plugin — auto-repairs malformed JSON responses.
   * Only applies to non-streaming calls (generateObject), which is all aifn uses.
   * @default true
   * @see https://openrouter.ai/docs/guides/features/plugins/response-healing
   */
  responseHealing?: boolean;
  /**
   * Enable usage accounting — surfaces cost, cached tokens, and reasoning tokens
   * in providerMetadata. Extracted automatically by `.detailed()`.
   * @default true
   * @see https://openrouter.ai/docs/use-cases/usage-accounting
   */
  usage?: boolean;
};

/**
 * OpenRouter provider — reads `OPENROUTER_API_KEY` from env if not provided.
 * Lazy-initializes the SDK instance on first `model()` call.
 *
 * By default enables response healing (auto-repair malformed JSON) and
 * usage accounting (cost tracking in providerMetadata).
 *
 * @example
 * ```ts
 * import { openrouter } from "funcai/providers/openrouter";
 *
 * const provider = openrouter();
 * // or with explicit key:
 * const provider = openrouter({ apiKey: "sk-or-..." });
 * // or with Anthropic beta features:
 * const provider = openrouter({
 *   headers: { 'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14' },
 * });
 * ```
 */
export function openrouter(config?: OpenRouterConfig): Provider<OpenRouterModelId> {
  let instance: ReturnType<typeof createOpenRouter> | null = null;

  // Per-model settings applied to every .chat() call
  const modelSettings: Parameters<ReturnType<typeof createOpenRouter>['chat']>[1] = {};

  if (config?.responseHealing !== false) {
    modelSettings.plugins = [{ id: 'response-healing' }];
  }
  if (config?.usage !== false) {
    modelSettings.usage = { include: true };
  }

  return {
    buildGenerateOptions: ({ reasoning }) =>
      reasoning
        ? {
            providerOptions: {
              openrouter: {
                reasoning:
                  'maxTokens' in reasoning
                    ? { max_tokens: reasoning.maxTokens }
                    : { effort: reasoning.effort },
              },
            },
          }
        : {},
    model: ({ modelId }): LanguageModel => {
      if (!instance) {
        const apiKey = config?.apiKey ?? process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error(
            'OPENROUTER_API_KEY is required. Pass it via openrouter({ apiKey }) or set the environment variable.',
          );
        }
        instance = createOpenRouter({
          apiKey,
          ...(config?.headers && { headers: config.headers }),
          ...(config?.extraBody && { extraBody: config.extraBody }),
        });
      }
      return instance.chat(modelId, modelSettings);
    },
  };
}
