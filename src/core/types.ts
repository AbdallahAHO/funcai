import type { LanguageModel, ProviderMetadata } from 'ai';
import type { z } from 'zod';
import type {
  CacheControl,
  CacheMetadata,
  CachePolicy,
  CacheProvider,
  FnCacheConfig,
} from './cache';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type Provider<TModelId extends string = string> = {
  id?: string;
  model: (config: { modelId: string }) => LanguageModel;
  buildGenerateOptions?: (config: { reasoning?: ReasoningConfig }) => {
    providerOptions?: Record<string, Record<string, unknown>>;
  };
  /** Phantom field for model ID type propagation — never set at runtime */
  __modelId?: TModelId;
};

export type ModelIdOf<P> = P extends Provider<infer M> ? M : string;

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

export type TraceContext = {
  traceId: string;
  model: string;
  feature: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
};

export type TracePlugin = {
  wrap: (model: LanguageModel, context: TraceContext) => LanguageModel;
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export type PromptConfig = {
  id: string;
  model: string;
  system: string;
  temperature?: number;
  maxTokens?: number;
};

export type PromptInput<TModelId extends string> = {
  id: string;
  model: TModelId;
  system: string;
  temperature?: number;
  maxTokens?: number;
};

// ---------------------------------------------------------------------------
// Content parts (AI SDK compatible)
// ---------------------------------------------------------------------------

export type TextPart = { type: 'text'; text: string };
export type BinaryData = Uint8Array | ArrayBuffer;
export type ImagePart = { type: 'image'; image: string | URL | BinaryData };
export type AudioPart = { type: 'audio'; audio: BinaryData | string };
export type FilePart = {
  type: 'file';
  data: string | URL | BinaryData;
  mediaType: string;
  filename?: string;
};
export type ContentPart = TextPart | ImagePart | AudioPart | FilePart;

export type Message = {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
};

// ---------------------------------------------------------------------------
// Examples (few-shots)
// ---------------------------------------------------------------------------

export type Example<TOutput> = {
  input: string;
  output: TOutput;
  reasoning?: string;
};

// ---------------------------------------------------------------------------
// Reasoning
// ---------------------------------------------------------------------------

export type ReasoningConfig =
  | { effort: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none' }
  | { maxTokens: number };

// ---------------------------------------------------------------------------
// Call options (passed at invocation time)
// ---------------------------------------------------------------------------

export type CallOptions = {
  traceId?: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  cacheControl?: CacheControl;
};

// ---------------------------------------------------------------------------
// Detailed result
// ---------------------------------------------------------------------------

export type DetailedResult<T> = {
  output: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  /** Cost in USD when available from the provider (e.g. OpenRouter) */
  cost?: number;
  traceId: string;
  latencyMs: number;
  attempts: number;
  /** Present when this invocation used an enabled cache policy */
  cache?: CacheMetadata;
  /** Raw provider-specific metadata passed through from the AI SDK */
  providerMetadata?: ProviderMetadata;
};

// ---------------------------------------------------------------------------
// Function config
// ---------------------------------------------------------------------------

export type FnConfig<
  TSchema extends z.ZodType,
  TInput = string,
  TOutput = z.infer<TSchema>,
  TModelId extends string = string,
> = {
  /**
   * Stable feature id used for tracing and cache keys when no prompt config is provided.
   *
   * @example
   * ```ts
   * ai.fn({ id: "classify-ticket", model, system, schema, input })
   * ```
   */
  id?: string;
  schema: TSchema;

  // Prompt: either a PromptConfig or inline
  prompt?: PromptConfig;
  model?: TModelId;
  system?: string;

  // Input → user message
  input: (data: TInput) => string | ContentPart[];

  // Message chain (static or dynamic)
  messages?: Message[] | ((input: TInput) => Message[]);

  // Few-shot examples
  examples?: Example<z.infer<TSchema>>[];

  // Model params (override prompt config)
  temperature?: number;
  maxTokens?: number;

  // Reasoning mode (passed to provider via providerOptions)
  reasoning?: ReasoningConfig;

  // Retry + fallback
  retries?: number;
  fallback?: TModelId[];

  // Opt-in result caching
  cache?: FnCacheConfig;

  // Post-processing
  transform?: (output: z.infer<TSchema>, input: TInput) => TOutput | Promise<TOutput>;
};

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

export type MockImplementation<TInput, TOutput> =
  | TOutput
  | ((input: TInput) => TOutput | Promise<TOutput>);

// ---------------------------------------------------------------------------
// The callable AI function
// ---------------------------------------------------------------------------

export type AiFn<TInput, TOutput> = {
  (input: TInput, options?: CallOptions): Promise<TOutput>;
  detailed: (input: TInput, options?: CallOptions) => Promise<DetailedResult<TOutput>>;
  mock: (implementation: MockImplementation<TInput, TOutput>) => void;
  mockOnce: (implementation: MockImplementation<TInput, TOutput>) => void;
  unmock: () => void;
  isMocked: boolean;
};

// ---------------------------------------------------------------------------
// Factory config
// ---------------------------------------------------------------------------

export type CreateAiFnConfig<P extends Provider> = {
  provider: P;
  trace?: TracePlugin;
  retries?: number;
  cache?: CacheProvider;
  cachePolicy?: CachePolicy;
};

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

export type AiFnInstance<TModelId extends string> = {
  definePrompt: (config: PromptInput<TModelId>) => PromptConfig;
  fn: <TSchema extends z.ZodType, TInput = string, TOutput = z.infer<TSchema>>(
    config: FnConfig<TSchema, TInput, TOutput, TModelId>,
  ) => AiFn<TInput, TOutput>;
  injectVariables: (template: string, variables: Record<string, string>) => string;
};
