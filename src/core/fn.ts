import type { z } from 'zod';
import { buildSystemPrompt } from '@/prompt/build';
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
};

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
  const featureId = config.prompt?.id ?? 'anonymous';

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
    const traceId = options?.traceId ?? globalThis.crypto.randomUUID();

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

    const start = performance.now();

    // Build user content from input function
    const userContent = config.input(input);

    // Resolve messages (static or dynamic)
    let messages: Message[] = [];
    if (typeof config.messages === 'function') {
      messages = config.messages(input);
    } else if (config.messages) {
      messages = config.messages;
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
          ...context.provider.buildGenerateOptions?.({ reasoning }),
        });
      },
      primaryModel: modelId,
      retries,
      fallback,
    });

    const latencyMs = performance.now() - start;

    // Apply transform if provided
    const output = config.transform
      ? await config.transform(result.output, input)
      : (result.output as TOutput);

    // Extract cost from provider metadata when available (e.g. OpenRouter)
    const cost = extractCost(result.providerMetadata);

    return {
      output,
      model: usedModel,
      usage: result.usage,
      ...(cost !== undefined && { cost }),
      traceId,
      latencyMs,
      attempts,
      ...(result.providerMetadata && { providerMetadata: result.providerMetadata }),
    };
  };

  // The simple callable — returns output directly
  const fn = async (input: TInput): Promise<TOutput> => {
    const result = await run(input);
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
