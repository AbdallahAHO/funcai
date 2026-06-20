import type { LanguageModel, ModelMessage, ProviderMetadata } from 'ai';
import { generateObject } from 'ai';
import type { z } from 'zod';
import type { ContentPart, Message } from './types';

type ExecuteOptions<TSchema extends z.ZodType> = {
  model: LanguageModel;
  systemPrompt: string;
  userContent: string | ContentPart[];
  messages?: Message[];
  schema: TSchema;
  temperature?: number;
  maxTokens?: number;
  providerOptions?: Record<string, Record<string, unknown>>;
};

type ExecuteResult<T> = {
  output: T;
  usage: { inputTokens: number; outputTokens: number };
  providerMetadata?: ProviderMetadata;
};

/**
 * Converts our Message type to AI SDK's ModelMessage format.
 */
function toSdkMessage(msg: {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
}): ModelMessage {
  if (msg.role === 'user') {
    return { role: 'user', content: msg.content } as ModelMessage;
  }
  return { role: 'assistant', content: msg.content } as ModelMessage;
}

/**
 * Assembles the message chain and calls AI SDK's `generateObject`.
 *
 * Message ordering:
 *   1. System prompt (injected via `system` param)
 *   2. messages chain (if provided)
 *   3. Final user message (from `input:` function)
 */
export async function execute<TSchema extends z.ZodType>(
  options: ExecuteOptions<TSchema>,
): Promise<ExecuteResult<z.output<TSchema>>> {
  const {
    model,
    systemPrompt,
    userContent,
    messages = [],
    schema,
    temperature,
    maxTokens,
  } = options;

  // Build the messages array for AI SDK
  const sdkMessages: ModelMessage[] = [];

  // Add message chain
  for (const msg of messages) {
    sdkMessages.push(toSdkMessage(msg));
  }

  // Add final user message
  sdkMessages.push(toSdkMessage({ role: 'user', content: userContent }));

  const result = await generateObject<TSchema, 'object', z.output<TSchema>>({
    model,
    system: systemPrompt,
    messages: sdkMessages,
    schema,
    temperature,
    maxOutputTokens: maxTokens,
    maxRetries: 0,
    ...(options.providerOptions && { providerOptions: options.providerOptions as never }),
  });

  return {
    output: result.object,
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    },
    providerMetadata: result.providerMetadata ?? undefined,
  };
}
