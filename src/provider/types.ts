import type { LanguageModel } from 'ai';
import type { Provider } from '@/core/types';

/**
 * Creates a custom provider from any AI SDK-compatible model factory.
 *
 * @example
 * ```ts
 * import { createProvider } from "funcai";
 * import { createAzure } from "@ai-sdk/azure";
 *
 * const azure = createProvider(({ modelId }) =>
 *   createAzure({ resourceName: "my-resource" })(modelId)
 * );
 * ```
 */
export function createProvider(factory: (config: { modelId: string }) => LanguageModel): Provider {
  return {
    model: factory,
  };
}
