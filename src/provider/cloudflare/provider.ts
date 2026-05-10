import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import {
  type AiGatewayBindingSettings,
  type AiGatewayOptions,
  type AiGatewayReties,
  createAiGateway,
  parseAiGatewayOptions,
} from 'ai-gateway-provider';
import { createUnified } from 'ai-gateway-provider/providers/unified';
import type { Provider } from '@/core/types';
import type { CloudflareModelId } from './models';

export type CloudflareAiGatewayRetries = AiGatewayReties;
export type CloudflareAiGatewayOptions = AiGatewayOptions;
export type CloudflareAiGatewayBinding = AiGatewayBindingSettings['binding'];

export type CloudflareAiGatewayConfig = {
  /** Cloudflare account ID. Defaults to CLOUDFLARE_ACCOUNT_ID. */
  accountId?: string;
  /** Cloudflare Workers AI Gateway binding. Prefer this inside Workers. */
  binding?: CloudflareAiGatewayBinding;
  /**
   * AI Gateway name. Defaults to CLOUDFLARE_AI_GATEWAY_ID,
   * CLOUDFLARE_AI_GATEWAY_NAME, then Cloudflare's auto-created "default" gateway.
   */
  gatewayId?: string;
  /**
   * Cloudflare API token for AI Gateway and Workers AI. Defaults to
   * CLOUDFLARE_AI_GATEWAY_API_KEY, CLOUDFLARE_API_TOKEN, then CLOUDFLARE_AUTH_TOKEN.
   */
  apiKey?: string;
  /** Cloudflare account email for Global API Key auth. Defaults to CLOUDFLARE_EMAIL, then CLOUDFLARE_API_EMAIL. */
  email?: string;
  /** Cloudflare Global API Key. Defaults to CLOUDFLARE_GLOBAL_API_KEY, then CLOUDFLARE_API_KEY. */
  globalApiKey?: string;
  /** Optional upstream provider key for Gateway BYOK routes. Workers AI usually does not need this. */
  providerApiKey?: string;
  /** Headers passed to the underlying OpenAI-compatible unified provider. */
  headers?: Record<string, string>;
  /** Query params passed to the underlying OpenAI-compatible unified provider. */
  queryParams?: Record<string, string>;
  /** Per-request AI Gateway controls such as cache, metadata, timeout, and retries. */
  gatewayOptions?: CloudflareAiGatewayOptions;
};

const DEFAULT_GATEWAY_ID = 'default';

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function gatewayOptionHeaders(options?: CloudflareAiGatewayOptions): Record<string, string> {
  if (!options) return {};
  return Object.fromEntries(parseAiGatewayOptions(options).entries());
}

async function cloudflareGatewayFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) return response;

  const payload = await response
    .clone()
    .json()
    .catch(() => null);
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray((payload as { choices?: unknown }).choices)
  ) {
    return response;
  }

  let changed = false;
  const normalized = {
    ...payload,
    choices: (payload as { choices: unknown[] }).choices.map((choice) => {
      if (!choice || typeof choice !== 'object' || !('message' in choice)) return choice;

      const message = (choice as { message?: { content?: unknown } }).message;
      if (!message || typeof message.content !== 'object' || message.content === null)
        return choice;

      changed = true;
      return {
        ...choice,
        message: {
          ...message,
          content: JSON.stringify(message.content),
        },
      };
    }),
  };

  if (!changed) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');

  return new Response(JSON.stringify(normalized), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function readConfig(config?: CloudflareAiGatewayConfig) {
  if (config?.binding) {
    return {
      kind: 'binding' as const,
      binding: config.binding,
    };
  }

  const accountId = firstNonEmpty([config?.accountId, process.env.CLOUDFLARE_ACCOUNT_ID]);
  const gatewayId =
    firstNonEmpty([
      config?.gatewayId,
      process.env.CLOUDFLARE_AI_GATEWAY_ID,
      process.env.CLOUDFLARE_AI_GATEWAY_NAME,
    ]) ?? DEFAULT_GATEWAY_ID;
  const apiKey = firstNonEmpty([
    config?.apiKey,
    process.env.CLOUDFLARE_AI_GATEWAY_API_KEY,
    process.env.CLOUDFLARE_API_TOKEN,
    process.env.CLOUDFLARE_AUTH_TOKEN,
  ]);
  const email = firstNonEmpty([
    config?.email,
    process.env.CLOUDFLARE_EMAIL,
    process.env.CLOUDFLARE_API_EMAIL,
  ]);
  const globalApiKey = firstNonEmpty([
    config?.globalApiKey,
    process.env.CLOUDFLARE_GLOBAL_API_KEY,
    process.env.CLOUDFLARE_API_KEY,
  ]);

  if (!accountId) {
    throw new Error(
      'CLOUDFLARE_ACCOUNT_ID is required. Pass it via cloudflareAiGateway({ accountId }) or set the environment variable.',
    );
  }
  const hasGlobalAuth = Boolean(email || globalApiKey);
  if (!apiKey && !hasGlobalAuth) {
    throw new Error(
      'Cloudflare AI Gateway auth is required. Pass cloudflareAiGateway({ apiKey }) or cloudflareAiGateway({ email, globalApiKey }), or set CLOUDFLARE_API_TOKEN/CLOUDFLARE_AI_GATEWAY_API_KEY or CLOUDFLARE_EMAIL plus CLOUDFLARE_GLOBAL_API_KEY.',
    );
  }
  if (!apiKey && (!email || !globalApiKey)) {
    throw new Error(
      'CLOUDFLARE_EMAIL and CLOUDFLARE_GLOBAL_API_KEY must be set together for Global API Key auth.',
    );
  }

  return {
    kind: 'api' as const,
    accountId,
    gatewayId,
    apiKey,
    email,
    globalApiKey,
  };
}

/**
 * Converts Workers AI model IDs into the Cloudflare AI Gateway Unified API
 * model shape while keeping the public funcai model type strict.
 */
export function toCloudflareGatewayModelId(modelId: string): string {
  if (modelId.startsWith('workers-ai/')) return modelId;
  if (modelId.startsWith('@')) return `workers-ai/${modelId}`;
  return modelId;
}

/**
 * Cloudflare AI Gateway provider backed by Gateway's OpenAI-compatible
 * endpoint or a Workers AI Gateway binding.
 *
 * The model type is intentionally strict: only Workers AI text-generation
 * models with explicit structured-output support are included.
 *
 * @example
 * ```ts
 * import { createAiFn } from "funcai";
 * import { cloudflareAiGateway } from "funcai/providers/cloudflare";
 *
 * const ai = createAiFn({
 *   provider: cloudflareAiGateway({
 *     accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
 *     apiKey: process.env.CLOUDFLARE_API_TOKEN,
 *   }),
 * });
 * ```
 */
export function cloudflareAiGateway(
  config?: CloudflareAiGatewayConfig,
): Provider<CloudflareModelId> {
  let gateway: ReturnType<typeof createAiGateway> | null = null;
  let unified: ReturnType<typeof createUnified> | null = null;
  let compatible: ReturnType<typeof createOpenAICompatible> | null = null;

  return {
    id: 'cloudflare-ai-gateway',
    model: ({ modelId }): LanguageModel => {
      if (!compatible && (!gateway || !unified)) {
        const resolved = readConfig(config);

        if (resolved.kind !== 'binding') {
          const authHeaders: Record<string, string> = resolved.apiKey
            ? { 'cf-aig-authorization': `Bearer ${resolved.apiKey}` }
            : {
                'X-Auth-Email': resolved.email as string,
                'X-Auth-Key': resolved.globalApiKey as string,
              };

          const apiProvider = createOpenAICompatible({
            baseURL: `https://gateway.ai.cloudflare.com/v1/${resolved.accountId}/${resolved.gatewayId}/compat`,
            name: 'Cloudflare AI Gateway',
            apiKey: config?.providerApiKey ?? resolved.apiKey,
            supportsStructuredOutputs: true,
            headers: {
              ...authHeaders,
              ...gatewayOptionHeaders(config?.gatewayOptions),
              ...config?.headers,
            },
            fetch: cloudflareGatewayFetch,
            ...(config?.queryParams && { queryParams: config.queryParams }),
          });
          compatible = apiProvider;
          return apiProvider(toCloudflareGatewayModelId(modelId)) as LanguageModel;
        }

        gateway = createAiGateway({
          binding: resolved.binding,
          ...(config?.gatewayOptions && { options: config.gatewayOptions }),
        });
        unified = createUnified({
          apiKey: config?.providerApiKey,
          supportsStructuredOutputs: true,
          ...(config?.headers && { headers: config.headers }),
          ...(config?.queryParams && { queryParams: config.queryParams }),
        });
      }

      if (compatible) {
        const apiProvider = compatible;
        return apiProvider(toCloudflareGatewayModelId(modelId)) as LanguageModel;
      }

      if (!gateway || !unified) {
        throw new Error('Cloudflare AI Gateway provider failed to initialize.');
      }

      return gateway(unified(toCloudflareGatewayModelId(modelId))) as LanguageModel;
    },
  };
}
