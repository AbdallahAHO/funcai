import { generateObject } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { lmstudio } from '@/provider/lmstudio';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('lmstudio', () => {
  it('uses the default local base URL', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(typeof input === 'string' ? input : input.toString());

      return jsonResponse({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'google/gemma-4-26b-a4b',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '{"status":"ok"}',
              reasoning_content: '',
              tool_calls: [],
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      });
    });

    const provider = lmstudio({ fetch });

    const result = await generateObject({
      model: provider.model({ modelId: 'google/gemma-4-26b-a4b' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(result.object).toEqual({ status: 'ok' });
    expect(calls).toEqual(['http://127.0.0.1:1234/v1/chat/completions']);
  });

  it('uses a custom base URL when provided', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(typeof input === 'string' ? input : input.toString());

      return jsonResponse({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'custom-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '{"status":"ok"}',
              reasoning_content: '',
              tool_calls: [],
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      });
    });

    const provider = lmstudio({
      baseURL: 'http://lmstudio.test/v1',
      fetch,
    });

    await generateObject({
      model: provider.model({ modelId: 'custom-model' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(calls).toEqual(['http://lmstudio.test/v1/chat/completions']);
  });

  it('returns a Provider-compatible shape', () => {
    const provider = lmstudio();

    expect(typeof provider.model).toBe('function');
    expect(provider.buildGenerateOptions).toBeUndefined();
  });
});
