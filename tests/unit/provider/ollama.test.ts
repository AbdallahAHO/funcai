import { generateObject } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ollama } from '@/provider/ollama';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ollama', () => {
  it('uses the default local base URL', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(typeof input === 'string' ? input : input.toString());

      return jsonResponse({
        model: 'gemma4:latest',
        created_at: '2026-04-07T06:48:17.271882Z',
        message: { role: 'assistant', content: '{"status":"ok"}' },
        done: true,
        done_reason: 'stop',
        total_duration: 1,
        load_duration: 1,
        prompt_eval_count: 10,
        prompt_eval_duration: 1,
        eval_count: 5,
        eval_duration: 1,
      });
    });

    const provider = ollama({ fetch });

    const result = await generateObject({
      model: provider.model({ modelId: 'gemma4:latest' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(result.object).toEqual({ status: 'ok' });
    expect(calls).toEqual(['http://127.0.0.1:11434/api/chat']);
  });

  it('uses a custom base URL when provided', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(typeof input === 'string' ? input : input.toString());

      return jsonResponse({
        model: 'gemma4:latest',
        created_at: '2026-04-07T06:48:17.271882Z',
        message: { role: 'assistant', content: '{"status":"ok"}' },
        done: true,
        done_reason: 'stop',
        total_duration: 1,
        load_duration: 1,
        prompt_eval_count: 10,
        prompt_eval_duration: 1,
        eval_count: 5,
        eval_duration: 1,
      });
    });

    const provider = ollama({
      baseURL: 'http://ollama.test',
      fetch,
    });

    await generateObject({
      model: provider.model({ modelId: 'gemma4:latest' }),
      prompt: 'ping',
      schema: z.object({ status: z.string() }),
    });

    expect(calls).toEqual(['http://ollama.test:80/api/chat']);
  });

  it('returns a Provider-compatible shape', () => {
    const provider = ollama();

    expect(typeof provider.model).toBe('function');
    expect(provider.buildGenerateOptions).toBeUndefined();
  });
});
