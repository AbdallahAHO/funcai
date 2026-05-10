import type { z } from 'zod';
import { buildSystemPrompt } from '@/prompt/build';
import type { CachePolicy, CacheProvider } from './cache';
import {
  buildCacheKey,
  parseCachedDetailedResult,
  resolveCacheConfig,
  toCachedDetailedResult,
} from './cache';
import { execute } from './execute';
import { withRetry } from './retry';
import type {
  AiFn,
  CallOptions,
  ContentPart,
  DetailedResult,
  FnConfig,
  Message,
  MockImplementation,
  Provider,
  TracePlugin,
} from './types';

type FnContext = {
  provider: Provider;
  trace?: TracePlugin;
  defaultRetries: number;
  cache?: CacheProvider;
  cachePolicy?: CachePolicy;
};

function createTraceId(): string {
  const cryptoRef = globalThis.crypto;
  if (typeof cryptoRef?.randomUUID === 'function') return cryptoRef.randomUUID();

  const random = Math.random().toString(36).slice(2);
  return `trace_${Date.now().toString(36)}_${random}`;
}

function nowMs(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/** Extracts cost (USD) from provider metadata when available. */
function extractCost(metadata: Record<string, unknown> | undefined): number | undefined {
  if (!metadata) return undefined;

  // OpenRouter: providerMetadata.openrouter.usage.cost
  const openrouter = metadata.openrouter as Record<string, unknown> | undefined;
  const usage = openrouter?.usage as Record<string, unknown> | undefined;
  if (typeof usage?.cost === 'number') return usage.cost;

  return undefined;
}

/**
 * Creates a callable AI function from a config. This is the core implementation
 * behind `ai.fn()`.
 */
export function createFn<
  TSchema extends z.ZodType,
  TInput,
  TOutput,
  TModelId extends string = string,
>(config: FnConfig<TSchema, TInput, TOutput, TModelId>, context: FnContext): AiFn<TInput, TOutput> {
  // Resolve model and system from prompt or inline config
  const modelId = config.prompt?.model ?? config.model;
  const system = config.prompt?.system ?? config.system;
  const featureId = config.id ?? config.prompt?.id ?? 'anonymous';

  if (!modelId) throw new Error('ai.fn: "model" is required (via prompt config or inline)');
  if (!system) throw new Error('ai.fn: "system" is required (via prompt config or inline)');

  // Resolve params with priority: fn config > prompt config > defaults
  const temperature = config.temperature ?? config.prompt?.temperature;
  const maxTokens = config.maxTokens ?? config.prompt?.maxTokens;
  const reasoning = config.reasoning;
  const retries = config.retries ?? context.defaultRetries;
  const fallback = config.fallback ?? [];

  // Build the system prompt (with examples if provided)
  const systemPrompt = buildSystemPrompt({
    system,
    examples: config.examples,
  });

  // Mock state (closure-scoped)
  let mockImpl: MockImplementation<TInput, TOutput> | null = null;
  const mockOnceQueue: MockImplementation<TInput, TOutput>[] = [];

  const resolveMock = async (
    impl: MockImplementation<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput> =>
    typeof impl === 'function'
      ? (impl as (input: TInput) => TOutput | Promise<TOutput>)(input)
      : impl;

  // Core execution for a given input + options
  const run = async (input: TInput, options?: CallOptions): Promise<DetailedResult<TOutput>> => {
    const traceId = options?.traceId ?? createTraceId();

    // Check mock state: mockOnce queue takes priority, then permanent mock
    const activeMock = mockOnceQueue.length > 0 ? (mockOnceQueue.shift() ?? null) : mockImpl;
    if (activeMock !== null) {
      const output = await resolveMock(activeMock, input);
      return {
        output,
        model: 'mock',
        usage: { inputTokens: 0, outputTokens: 0 },
        traceId,
        latencyMs: 0,
        attempts: 0,
      };
    }

    const start = nowMs();

    // Build user content from input function
    const userContent = config.input(input);

    // Resolve messages (static or dynamic)
    let messages: Message[] = [];
    if (typeof config.messages === 'function') {
      messages = config.messages(input);
    } else if (config.messages) {
      messages = config.messages;
    }

    const generateOptions = context.provider.buildGenerateOptions?.({ reasoning }) ?? {};
    const cacheConfig = resolveCacheConfig({
      cacheProvider: context.cache,
      factoryPolicy: context.cachePolicy,
      fnCache: config.cache,
      callControl: options?.cacheControl,
    });
    const cacheKey =
      cacheConfig &&
      buildCacheKey({
        featureId,
        providerId: context.provider.id,
        primaryModel: modelId,
        fallback,
        systemPrompt,
        messages,
        userContent,
        params: {
          temperature,
          maxTokens,
          reasoning,
          providerOptions: generateOptions.providerOptions,
        },
        cache: cacheConfig,
      });

    if (cacheConfig && cacheKey) {
      try {
        const cached = parseCachedDetailedResult<TOutput>(await context.cache?.get(cacheKey));
        if (cached) {
          return {
            output: cached.output,
            model: cached.model,
            usage: { inputTokens: 0, outputTokens: 0 },
            traceId,
            latencyMs: nowMs() - start,
            attempts: 0,
            cache: {
              hit: true,
              key: cacheKey,
              namespace: cacheConfig.namespace,
              ttlSeconds: cacheConfig.ttlSeconds,
              ageMs: Date.now() - cached.createdAt,
            },
          };
        }
      } catch {
        // Cache read failures are treated as misses so generation still works.
      }
    }

    const {
      result,
      model: usedModel,
      attempts,
    } = await withRetry({
      fn: async (currentModelId) => {
        // Get base model from provider
        let model = context.provider.model({ modelId: currentModelId });

        // Wrap with tracing if configured
        if (context.trace) {
          model = context.trace.wrap(model, {
            traceId,
            model: currentModelId,
            feature: featureId,
            userId: options?.userId,
            sessionId: options?.sessionId,
            properties: options?.properties,
          });
        }

        return execute({
          model,
          systemPrompt,
          userContent: userContent as string | ContentPart[],
          messages,
          schema: config.schema,
          temperature,
          maxTokens,
          ...generateOptions,
        });
      },
      primaryModel: modelId,
      retries,
      fallback,
    });

    const latencyMs = nowMs() - start;

    // Apply transform if provided
    const output = config.transform
      ? await config.transform(result.output, input)
      : (result.output as TOutput);

    // Extract cost from provider metadata when available (e.g. OpenRouter)
    const cost = extractCost(result.providerMetadata);

    const detailed = {
      output,
      model: usedModel,
      usage: result.usage,
      ...(cost !== undefined && { cost }),
      traceId,
      latencyMs,
      attempts,
      ...(cacheConfig &&
        cacheKey && {
          cache: {
            hit: false,
            key: cacheKey,
            namespace: cacheConfig.namespace,
            ttlSeconds: cacheConfig.ttlSeconds,
          },
        }),
      ...(result.providerMetadata && { providerMetadata: result.providerMetadata }),
    };

    if (cacheConfig && cacheKey) {
      try {
        await context.cache?.set(cacheKey, toCachedDetailedResult(output, usedModel), {
          ttlSeconds: cacheConfig.ttlSeconds,
        });
      } catch {
        // Cache write failures should not fail a successful model call.
      }
    }

    return detailed;
  };

  // The simple callable — returns output directly
  const fn = async (input: TInput, options?: CallOptions): Promise<TOutput> => {
    const result = await run(input, options);
    return result.output;
  };

  // Attach .detailed() method
  fn.detailed = run;

  // Attach mock methods
  (fn as AiFn<TInput, TOutput>).mock = (impl) => {
    mockImpl = impl;
  };
  (fn as AiFn<TInput, TOutput>).mockOnce = (impl) => {
    mockOnceQueue.push(impl);
  };
  (fn as AiFn<TInput, TOutput>).unmock = () => {
    mockImpl = null;
    mockOnceQueue.length = 0;
  };
  Object.defineProperty(fn, 'isMocked', {
    get: () => mockImpl !== null || mockOnceQueue.length > 0,
    enumerable: true,
  });

  return fn as AiFn<TInput, TOutput>;
}
