import { generateObject } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  CLOUDFLARE_MODEL_IDS,
  CLOUDFLARE_MODELS,
  CLOUDFLARE_MULTIMODAL_IMAGE_MODELS,
  cloudflareAiGateway,
  toCloudflareGatewayModelId,
} from '@/provider/cloudflare';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'cf-aig-step': '0',
    },
  });
}

describe('cloudflareAiGateway', () => {
  const originalEnv = {
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_AI_GATEWAY_ID: process.env.CLOUDFLARE_AI_GATEWAY_ID,
    CLOUDFLARE_AI_GATEWAY_NAME: process.env.CLOUDFLARE_AI_GATEWAY_NAME,
    CLOUDFLARE_AI_GATEWAY_API_KEY: process.env.CLOUDFLARE_AI_GATEWAY_API_KEY,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_AUTH_TOKEN: process.env.CLOUDFLARE_AUTH_TOKEN,
    CLOUDFLARE_EMAIL: process.env.CLOUDFLARE_EMAIL,
    CLOUDFLARE_API_EMAIL: process.env.CLOUDFLARE_API_EMAIL,
    CLOUDFLARE_GLOBAL_API_KEY: process.env.CLOUDFLARE_GLOBAL_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  it('throws lazily when required config is missing', () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_AI_GATEWAY_API_KEY;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_AUTH_TOKEN;
    delete process.env.CLOUDFLARE_EMAIL;
    delete process.env.CLOUDFLARE_API_EMAIL;
    delete process.env.CLOUDFLARE_GLOBAL_API_KEY;
    delete process.env.CLOUDFLARE_API_KEY;

    const provider = cloudflareAiGateway();

    expect(() => provider.model({ modelId: '@cf/zai-org/glm-4.7-flash' })).toThrow(
      'CLOUDFLARE_ACCOUNT_ID is required',
    );
  });

  it('normalizes Workers AI model IDs for the Gateway Unified API', () => {
    expect(toCloudflareGatewayModelId('@cf/zai-org/glm-4.7-flash')).toBe(
      'workers-ai/@cf/zai-org/glm-4.7-flash',
    );
    expect(toCloudflareGatewayModelId('@hf/nousresearch/hermes-2-pro-mistral-7b')).toBe(
      'workers-ai/@hf/nousresearch/hermes-2-pro-mistral-7b',
    );
    expect(toCloudflareGatewayModelId('workers-ai/@cf/zai-org/glm-4.7-flash')).toBe(
      'workers-ai/@cf/zai-org/glm-4.7-flash',
    );
  });

  it('routes structured object generation through Cloudflare AI Gateway', async () => {
    const calls: Array<{ url: string; body: unknown; headers: Headers }> = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: input.toString(),
        body: JSON.parse(String(init?.body)),
        headers: new Headers(init?.headers),
      });

      return jsonResponse({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'workers-ai/@cf/zai-org/glm-4.7-flash',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"status":"ok"}' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
        },
      });
    });
    vi.stubGlobal('fetch', fetch);

    const provider = cloudflareAiGateway({
      accountId: 'account-test',
      gatewayId: 'production',
      apiKey: 'cf-aig-test',
    });

    const result = await generateObject({
      model: provider.model({ modelId: '@cf/zai-org/glm-4.7-flash' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(result.object).toEqual({ status: 'ok' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      'https://gateway.ai.cloudflare.com/v1/account-test/production/compat/chat/completions',
    );
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer cf-aig-test');
    expect(calls[0]?.headers.get('cf-aig-authorization')).toBe('Bearer cf-aig-test');

    const body = calls[0]?.body as Record<string, unknown>;
    expect(body.model).toBe('workers-ai/@cf/zai-org/glm-4.7-flash');
    expect(body.response_format).toBeDefined();
  });

  it('normalizes Gateway responses that return object content directly', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: {
                documentType: 'recipe_card',
                needsHumanReview: false,
              },
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    const provider = cloudflareAiGateway({
      accountId: 'account-test',
      gatewayId: 'production',
      email: 'user@example.com',
      globalApiKey: 'global-key-test',
    });

    const result = await generateObject({
      model: provider.model({ modelId: '@cf/meta/llama-4-scout-17b-16e-instruct' }),
      prompt: 'read the archive card',
      schema: z.object({
        documentType: z.string(),
        needsHumanReview: z.boolean(),
      }),
    });

    expect(result.object).toEqual({
      documentType: 'recipe_card',
      needsHumanReview: false,
    });
  });

  it('uses env defaults and Gateway request options', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account';
    process.env.CLOUDFLARE_AI_GATEWAY_ID = 'env-gateway';
    process.env.CLOUDFLARE_AI_GATEWAY_API_KEY = '';
    process.env.CLOUDFLARE_API_TOKEN = 'env-token';

    const calls: Array<{ url: string; headers: Headers }> = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: input.toString(),
        headers: new Headers(init?.headers),
      });

      return jsonResponse({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'workers-ai/@cf/zai-org/glm-4.7-flash',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"status":"ok"}' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
        },
      });
    });
    vi.stubGlobal('fetch', fetch);

    const provider = cloudflareAiGateway({
      gatewayOptions: {
        skipCache: true,
        cacheTtl: 3600,
        metadata: { feature: 'unit-test' },
        requestTimeoutMs: 5000,
        retries: { maxAttempts: 3, retryDelayMs: 100, backoff: 'exponential' },
      },
    });

    await generateObject({
      model: provider.model({ modelId: '@cf/zai-org/glm-4.7-flash' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(calls[0]?.url).toBe(
      'https://gateway.ai.cloudflare.com/v1/env-account/env-gateway/compat/chat/completions',
    );
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer env-token');
    expect(calls[0]?.headers.get('cf-aig-authorization')).toBe('Bearer env-token');
    expect(calls[0]?.headers.get('cf-skip-cache')).toBe('true');
    expect(calls[0]?.headers.get('cf-cache-ttl')).toBe('3600');
    expect(calls[0]?.headers.get('cf-aig-metadata')).toBe('{"feature":"unit-test"}');
    expect(calls[0]?.headers.get('cf-aig-request-timeout')).toBe('5000');
    expect(calls[0]?.headers.get('cf-aig-max-attempts')).toBe('3');
    expect(calls[0]?.headers.get('cf-aig-retry-delay')).toBe('100');
    expect(calls[0]?.headers.get('cf-aig-backoff')).toBe('exponential');
  });

  it('supports Cloudflare Global API Key auth for Gateway runtime requests', async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: input.toString(),
        headers: new Headers(init?.headers),
      });

      return jsonResponse({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'workers-ai/@cf/zai-org/glm-4.7-flash',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"status":"ok"}' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
        },
      });
    });
    vi.stubGlobal('fetch', fetch);

    const provider = cloudflareAiGateway({
      accountId: 'account-test',
      gatewayId: 'production',
      email: 'user@example.com',
      globalApiKey: 'global-key-test',
    });

    await generateObject({
      model: provider.model({ modelId: '@cf/zai-org/glm-4.7-flash' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(calls[0]?.url).toBe(
      'https://gateway.ai.cloudflare.com/v1/account-test/production/compat/chat/completions',
    );
    expect(calls[0]?.headers.get('x-auth-email')).toBe('user@example.com');
    expect(calls[0]?.headers.get('x-auth-key')).toBe('global-key-test');
    expect(calls[0]?.headers.get('authorization')).toBeNull();
    expect(calls[0]?.headers.get('cf-aig-authorization')).toBeNull();
  });

  it('can use a Cloudflare Workers AI Gateway binding without an API token', async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_AI_GATEWAY_API_KEY;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_AUTH_TOKEN;
    delete process.env.CLOUDFLARE_EMAIL;
    delete process.env.CLOUDFLARE_API_EMAIL;
    delete process.env.CLOUDFLARE_GLOBAL_API_KEY;
    delete process.env.CLOUDFLARE_API_KEY;

    const bindingCalls: Array<{ body: unknown; hasSignal: boolean }> = [];
    const binding = {
      run: vi.fn(async (body: unknown, options?: { signal?: AbortSignal }) => {
        bindingCalls.push({ body, hasSignal: options?.signal instanceof AbortSignal });
        return jsonResponse({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: 0,
          model: 'workers-ai/@cf/zai-org/glm-4.7-flash',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: '{"status":"ok"}' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 4,
            total_tokens: 14,
          },
        });
      }),
    };

    const provider = cloudflareAiGateway({ binding });

    const result = await generateObject({
      model: provider.model({ modelId: '@cf/zai-org/glm-4.7-flash' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(result.object).toEqual({ status: 'ok' });
    expect(binding.run).toHaveBeenCalledOnce();
    expect(bindingCalls[0]?.hasSignal).toBe(false);

    const body = bindingCalls[0]?.body as Array<{
      provider: string;
      query: Record<string, unknown>;
    }>;
    expect(body[0]?.provider).toBe('compat');
    expect(body[0]?.query.model).toBe('workers-ai/@cf/zai-org/glm-4.7-flash');
  });
});

describe('Cloudflare model registry', () => {
  it('only includes explicit structured-output model entries', () => {
    expect(CLOUDFLARE_MODEL_IDS.length).toBeGreaterThan(0);

    for (const modelId of CLOUDFLARE_MODEL_IDS) {
      expect(modelId.startsWith('@')).toBe(true);
      expect(CLOUDFLARE_MODELS[modelId].capabilities.structuredOutput).toBe(true);
    }

    expect('@cf/baai/bge-base-en-v1.5' in CLOUDFLARE_MODELS).toBe(false);
    expect('@cf/openai/whisper' in CLOUDFLARE_MODELS).toBe(false);
    expect('@cf/meta/llama-3.1-70b-instruct' in CLOUDFLARE_MODELS).toBe(false);
  });

  it('includes explicit JSON Mode supported models without allowing stale docs entries', () => {
    expect(CLOUDFLARE_MODELS['@cf/meta/llama-3.3-70b-instruct-fp8-fast']).toMatchObject({
      structuredOutputSource: 'json-mode',
      capabilities: { structuredOutput: true },
    });
    expect('@hf/thebloke/deepseek-coder-6.7b-instruct-awq' in CLOUDFLARE_MODELS).toBe(false);
  });

  it('marks multimodal models without allowing non-structured models', () => {
    expect(CLOUDFLARE_MULTIMODAL_IMAGE_MODELS).toContain('@cf/meta/llama-4-scout-17b-16e-instruct');

    for (const modelId of CLOUDFLARE_MULTIMODAL_IMAGE_MODELS) {
      expect(CLOUDFLARE_MODELS[modelId].modalities).toContain('image');
      expect(CLOUDFLARE_MODELS[modelId].capabilities.structuredOutput).toBe(true);
    }
  });
});
