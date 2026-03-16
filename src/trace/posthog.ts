import { createRequire } from 'node:module';
import type { LanguageModel } from 'ai';
import type { TraceContext, TracePlugin } from '@/core/types';

const require = createRequire(import.meta.url);

type PostHogConfig = {
  apiKey: string;
  host?: string;
  /** Bring your own PostHog client — you own its lifecycle (flush/shutdown). */
  client?: unknown;
};

/**
 * PostHog trace plugin — wraps AI models with PostHog observability.
 * Requires `posthog-node` and `@posthog/ai` as peer dependencies.
 *
 * @example
 * ```ts
 * // Shorthand — just API key (plugin creates an internal client)
 * const ai = createAiFn({ trace: posthog("phc_...") });
 *
 * // Full config
 * const ai = createAiFn({ trace: posthog({ apiKey: "phc_...", host: "https://eu.i.posthog.com" }) });
 *
 * // Bring your own client — you control flush/shutdown
 * const ph = new PostHog("phc_...", { host: "https://eu.i.posthog.com" });
 * const ai = createAiFn({ trace: posthog({ apiKey: "phc_...", client: ph }) });
 * // Later: await ph.shutdown();
 * ```
 */
export function posthog(configOrKey: string | PostHogConfig): TracePlugin {
  const config = typeof configOrKey === 'string' ? { apiKey: configOrKey } : configOrKey;

  // biome-ignore lint/suspicious/noExplicitAny: lazy-loaded PostHog client
  let client: any = config.client ?? null;

  return {
    wrap: (model: LanguageModel, context: TraceContext): LanguageModel => {
      if (!client) {
        try {
          const { PostHog } = require('posthog-node');
          client = new PostHog(config.apiKey, {
            ...(config.host && { host: config.host }),
          });
        } catch {
          throw new Error(
            'PostHog trace plugin requires "posthog-node" and "@posthog/ai" packages. Install them: pnpm add posthog-node @posthog/ai',
          );
        }
      }

      try {
        const { withTracing } = require('@posthog/ai');
        return withTracing(model, client, {
          posthogDistinctId: context.userId,
          posthogTraceId: context.traceId,
          posthogProperties: {
            $ai_span_name: context.feature,
            $ai_model: context.model,
            ...(context.sessionId && { $ai_session_id: context.sessionId }),
            feature: context.feature,
            ...context.properties,
          },
        });
      } catch {
        throw new Error(
          'PostHog trace plugin requires "@posthog/ai" package. Install it: pnpm add @posthog/ai',
        );
      }
    },
  };
}
