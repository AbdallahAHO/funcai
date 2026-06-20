import { createRequire } from 'node:module';
import type { TelemetrySettings } from 'ai';
import type { TraceContext, TracePlugin } from '@/core/types';

const require = createRequire(import.meta.url);

type TelemetryMetadata = NonNullable<TelemetrySettings['metadata']>;
type TelemetryMetadataValue = TelemetryMetadata[string];

type LangfuseTraceConfig = {
  /**
   * Static metadata attached to every traced call. Per-call `properties` override
   * these values, while funcai's core trace metadata remains protected.
   */
  metadata?: Record<string, unknown>;
  /** Tags propagated to Langfuse observations created inside the AI call. */
  tags?: string[];
  /** Version propagated to Langfuse observations for release comparisons. */
  version?: string;
  /** Propagate Langfuse attributes through OpenTelemetry baggage. */
  asBaggage?: boolean;
  /** AI SDK telemetry input recording. Defaults to the AI SDK behavior. */
  recordInputs?: boolean;
  /** AI SDK telemetry output recording. Defaults to the AI SDK behavior. */
  recordOutputs?: boolean;
};

type LangfuseTelemetryConfig = {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  flushAt?: number;
  flushInterval?: number;
  environment?: string;
  release?: string;
  timeout?: number;
  additionalHeaders?: Record<string, string>;
  exportMode?: 'immediate' | 'batched';
  mask?: (params: { data: unknown }) => unknown | Promise<unknown>;
  shouldExportSpan?: (params: { otelSpan: unknown }) => boolean;
};

type StartLangfuseTelemetryConfig = LangfuseTelemetryConfig & {
  serviceName?: string;
};

type LangfuseSpanProcessorLike = {
  forceFlush: () => Promise<void>;
  shutdown: () => Promise<void>;
};

type LangfuseNodeSdkLike = {
  start: () => void;
  shutdown: () => Promise<void>;
};

type LangfuseTelemetryHandle = {
  sdk: LangfuseNodeSdkLike;
  spanProcessor: LangfuseSpanProcessorLike;
  forceFlush: () => Promise<void>;
  shutdown: () => Promise<void>;
};

type LangfuseObservationLike = {
  update?: (attributes: Record<string, unknown>) => unknown;
};

const INSTALL_HINT =
  'Langfuse trace integration requires "@langfuse/tracing", "@langfuse/otel", and "@opentelemetry/sdk-node". Install them: pnpm add @langfuse/tracing @langfuse/otel @opentelemetry/sdk-node';

const LANGFUSE_TRACE_ID_PATTERN = /^[a-f0-9]{32}$/;

function normalizeTelemetryValue(value: unknown): TelemetryMetadataValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    )
  ) {
    return value as TelemetryMetadataValue;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeTelemetryMetadata(input: Record<string, unknown>): TelemetryMetadata {
  const metadata: TelemetryMetadata = {};

  for (const [key, value] of Object.entries(input)) {
    const normalized = normalizeTelemetryValue(value);
    if (normalized !== undefined) metadata[key] = normalized;
  }

  return metadata;
}

function truncate(value: string): string {
  return value.length <= 200 ? value : value.slice(0, 197).concat('...');
}

function toPropagatedMetadata(metadata: TelemetryMetadata): Record<string, string> {
  const propagated: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const stringValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
    propagated[key] = truncate(stringValue);
  }

  return propagated;
}

function toObservationMetadata(metadata: TelemetryMetadata): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isLangfuseTraceId(value: string): boolean {
  return LANGFUSE_TRACE_ID_PATTERN.test(value) && value !== '0'.repeat(32);
}

function createSpanId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto?.getRandomValues?.(bytes);

  if (bytes.some((byte) => byte !== 0)) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const fallback = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return fallback === '0'.repeat(16) ? '0000000000000001' : fallback;
}

function buildMetadata(
  context: TraceContext,
  config: LangfuseTraceConfig,
  langfuseTraceId?: string,
): TelemetryMetadata {
  return normalizeTelemetryMetadata({
    ...config.metadata,
    ...context.properties,
    feature: context.feature,
    model: context.model,
    traceId: context.traceId,
    funcaiTraceId: context.traceId,
    ...(langfuseTraceId && { langfuseTraceId }),
    ...(context.userId && { userId: context.userId }),
    ...(context.sessionId && { sessionId: context.sessionId }),
  });
}

function extractOpenRouterCost(providerMetadata: unknown): number | undefined {
  if (!isRecord(providerMetadata)) return undefined;

  const openrouter = providerMetadata.openrouter;
  if (!isRecord(openrouter)) return undefined;

  const usage = openrouter.usage;
  if (!isRecord(usage)) return undefined;

  return toNumber(usage.cost);
}

function extractOpenRouterUpstreamCost(providerMetadata: unknown): number | undefined {
  if (!isRecord(providerMetadata)) return undefined;

  const openrouter = providerMetadata.openrouter;
  if (!isRecord(openrouter)) return undefined;

  const usage = openrouter.usage;
  if (!isRecord(usage)) return undefined;

  const costDetails = usage.costDetails;
  if (!isRecord(costDetails)) return undefined;

  return toNumber(costDetails.upstreamInferenceCost);
}

function buildResultMetadata(result: unknown): Record<string, unknown> {
  if (!isRecord(result)) return {};

  const usage = isRecord(result.usage) ? result.usage : undefined;
  const inputTokens = toNumber(usage?.inputTokens);
  const outputTokens = toNumber(usage?.outputTokens);
  const totalTokens =
    inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : undefined;
  const costUsd = extractOpenRouterCost(result.providerMetadata);
  const upstreamInferenceCostUsd = extractOpenRouterUpstreamCost(result.providerMetadata);

  return {
    ...(inputTokens !== undefined && { funcaiInputTokens: inputTokens }),
    ...(outputTokens !== undefined && { funcaiOutputTokens: outputTokens }),
    ...(totalTokens !== undefined && { funcaiTotalTokens: totalTokens }),
    ...(costUsd !== undefined && {
      funcaiCostUsd: costUsd,
      funcaiCostSource: 'providerMetadata.openrouter.usage.cost',
    }),
    ...(upstreamInferenceCostUsd !== undefined && {
      openrouterUpstreamInferenceCostUsd: upstreamInferenceCostUsd,
    }),
  };
}

function getResultOutput(result: unknown): unknown {
  return isRecord(result) && 'output' in result ? result.output : undefined;
}

function requireLangfuseTracing(): {
  propagateAttributes: <T>(
    params: Record<string, unknown>,
    operation: () => Promise<T>,
  ) => Promise<T>;
  startActiveObservation: <T>(
    name: string,
    operation: (observation: LangfuseObservationLike) => Promise<T>,
    options?: Record<string, unknown>,
  ) => Promise<T>;
  createTraceId: (seed?: string) => Promise<string>;
} {
  try {
    return require('@langfuse/tracing');
  } catch {
    throw new Error(INSTALL_HINT);
  }
}

function requireLangfuseOtel(): {
  LangfuseSpanProcessor: new (config?: LangfuseTelemetryConfig) => LangfuseSpanProcessorLike;
} {
  try {
    return require('@langfuse/otel');
  } catch {
    throw new Error(INSTALL_HINT);
  }
}

function requireNodeSdk(): {
  NodeSDK: new (config: {
    spanProcessors: LangfuseSpanProcessorLike[];
    serviceName?: string;
  }) => LangfuseNodeSdkLike;
} {
  try {
    return require('@opentelemetry/sdk-node');
  } catch {
    throw new Error(INSTALL_HINT);
  }
}

/**
 * Langfuse trace plugin for AI SDK telemetry.
 *
 * Enables per-call AI SDK telemetry and propagates Langfuse metadata before the
 * model call so user, session, tags, and custom properties attach to generated
 * spans. The plugin creates a parent Langfuse chain for the full funcai call
 * and lets AI SDK spans capture the model request underneath it.
 *
 * @example
 * ```ts
 * const telemetry = startLangfuseTelemetry();
 * const ai = createAiFn({ provider: openrouter(), trace: langfuse() });
 * await classify.detailed("hello", { userId: "user_123" });
 * await telemetry.shutdown();
 * ```
 */
export function langfuse(config: LangfuseTraceConfig = {}): TracePlugin {
  return {
    generateOptions: (context) => ({
      experimental_telemetry: {
        isEnabled: true,
        functionId: context.feature,
        ...(config.recordInputs !== undefined && { recordInputs: config.recordInputs }),
        ...(config.recordOutputs !== undefined && { recordOutputs: config.recordOutputs }),
        metadata: buildMetadata(
          context,
          config,
          isLangfuseTraceId(context.traceId) ? context.traceId : undefined,
        ),
      },
    }),
    run: async (context, operation) => {
      const { createTraceId, propagateAttributes, startActiveObservation } =
        requireLangfuseTracing();
      const langfuseTraceId = isLangfuseTraceId(context.traceId)
        ? context.traceId
        : await createTraceId(context.traceId);
      const metadata = buildMetadata(context, config, langfuseTraceId);

      return propagateAttributes(
        {
          traceName: context.feature,
          ...(context.userId && { userId: context.userId }),
          ...(context.sessionId && { sessionId: context.sessionId }),
          ...(config.tags && { tags: config.tags }),
          ...(config.version && { version: config.version }),
          ...(config.asBaggage !== undefined && { asBaggage: config.asBaggage }),
          metadata: toPropagatedMetadata(metadata),
        },
        () =>
          startActiveObservation(
            context.feature,
            async (observation) => {
              observation.update?.({
                model: context.model,
                metadata: toObservationMetadata(metadata),
              });

              try {
                const result = await operation();
                const resultMetadata = buildResultMetadata(result);

                observation.update?.({
                  model: context.model,
                  ...(config.recordOutputs !== false && { output: getResultOutput(result) }),
                  metadata: {
                    ...toObservationMetadata(metadata),
                    ...resultMetadata,
                  },
                });

                return result;
              } catch (error) {
                observation.update?.({
                  level: 'ERROR',
                  statusMessage: error instanceof Error ? error.message : String(error),
                  metadata: toObservationMetadata(metadata),
                });
                throw error;
              }
            },
            {
              asType: 'chain',
              parentSpanContext: {
                traceId: langfuseTraceId,
                spanId: createSpanId(),
                traceFlags: 1,
              },
            },
          ),
      );
    },
  };
}

/**
 * Creates a Langfuse span processor for apps that already own OpenTelemetry setup.
 *
 * @example
 * ```ts
 * const spanProcessor = createLangfuseSpanProcessor();
 * const sdk = new NodeSDK({ spanProcessors: [spanProcessor] });
 * sdk.start();
 * ```
 */
export function createLangfuseSpanProcessor(
  config: LangfuseTelemetryConfig = {},
): LangfuseSpanProcessorLike {
  const { LangfuseSpanProcessor } = requireLangfuseOtel();
  return new LangfuseSpanProcessor(config);
}

/**
 * Starts a minimal Node OpenTelemetry SDK configured with Langfuse export.
 *
 * Use this for scripts, CLIs, tests, and small Node services that do not already
 * initialize OpenTelemetry. The returned handle flushes and shuts down both the
 * Langfuse processor and Node SDK.
 *
 * @example
 * ```ts
 * const telemetry = startLangfuseTelemetry({ exportMode: "immediate" });
 * try {
 *   await runAiWorkflow();
 * } finally {
 *   await telemetry.shutdown();
 * }
 * ```
 */
export function startLangfuseTelemetry(
  config: StartLangfuseTelemetryConfig = {},
): LangfuseTelemetryHandle {
  const { NodeSDK } = requireNodeSdk();
  const { serviceName, ...spanProcessorConfig } = config;
  const spanProcessor = createLangfuseSpanProcessor(spanProcessorConfig);
  const sdk = new NodeSDK({
    spanProcessors: [spanProcessor],
    ...(serviceName && { serviceName }),
  });

  sdk.start();

  return {
    sdk,
    spanProcessor,
    forceFlush: () => spanProcessor.forceFlush(),
    shutdown: async () => {
      await spanProcessor.forceFlush();
      await sdk.shutdown();
    },
  };
}

export type {
  LangfuseSpanProcessorLike,
  LangfuseTelemetryConfig,
  LangfuseTelemetryHandle,
  LangfuseTraceConfig,
  StartLangfuseTelemetryConfig,
};
