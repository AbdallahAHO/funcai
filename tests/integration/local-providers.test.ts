import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/index';
import { lmstudio } from '@/provider/lmstudio';
import { ollama } from '@/provider/ollama';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('local providers: createAiFn integration', () => {
  it('works with LM Studio via an OpenAI-compatible fetch adapter', async () => {
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
              content: '{"status":"reachable"}',
              reasoning_content: '',
              tool_calls: [],
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 5,
          total_tokens: 16,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      });
    });

    const ai = createAiFn({
      provider: lmstudio({
        baseURL: 'http://lmstudio.local/v1',
        fetch,
      }),
      retries: 0,
    });

    const run = ai.fn({
      model: 'google/gemma-4-26b-a4b',
      system: 'Return a JSON object with a status field.',
      schema: z.object({ status: z.string() }),
      input: (text: string) => text,
    });

    const result = await run('Check LM Studio');

    expect(result).toEqual({ status: 'reachable' });
    expect(calls).toEqual(['http://lmstudio.local/v1/chat/completions']);
  });

  it('works with Ollama via a custom fetch adapter', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(typeof input === 'string' ? input : input.toString());

      return jsonResponse({
        model: 'gemma4:latest',
        created_at: '2026-04-07T06:48:17.271882Z',
        message: {
          role: 'assistant',
          content: '{"status":"reachable"}',
        },
        done: true,
        done_reason: 'stop',
        total_duration: 1,
        load_duration: 1,
        prompt_eval_count: 10,
        prompt_eval_duration: 1,
        eval_count: 6,
        eval_duration: 1,
      });
    });

    const ai = createAiFn({
      provider: ollama({
        baseURL: 'http://ollama.local',
        fetch,
      }),
      retries: 0,
    });

    const run = ai.fn({
      model: 'gemma4:latest',
      system: 'Return a JSON object with a status field.',
      schema: z.object({ status: z.string() }),
      input: (text: string) => text,
    });

    const result = await run('Check Ollama');

    expect(result).toEqual({ status: 'reachable' });
    expect(calls).toEqual(['http://ollama.local:80/api/chat']);
  });
});
