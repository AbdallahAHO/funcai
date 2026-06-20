import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn, type TracePlugin } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 12 }, outputTokens: { total: 6 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

describe('trace plugins', () => {
  it('wraps models, contributes generate options, and surrounds execution', async () => {
    const doGenerate = vi.fn().mockResolvedValue(mockResponse({ answer: 'routed' }));
    const model = new MockLanguageModelV3({ doGenerate });
    const order: string[] = [];

    const trace: TracePlugin = {
      wrap: vi.fn((languageModel) => {
        order.push('wrap');
        return languageModel;
      }),
      generateOptions: vi.fn((context) => {
        order.push('generateOptions');
        return {
          experimental_telemetry: {
            isEnabled: true,
            functionId: context.feature,
            metadata: {
              traceId: context.traceId,
              model: context.model,
            },
          },
        };
      }),
      run: vi.fn(async (_context, operation) => {
        order.push('before');
        const result = await operation();
        order.push('after');
        return result;
      }),
    };

    const ai = createAiFn({
      provider: { id: 'mock-provider', model: () => model },
      trace,
      retries: 0,
    });

    const answer = ai.fn({
      id: 'route-ticket',
      model: 'primary-model',
      system: 'Route support tickets.',
      schema: z.object({ answer: z.string() }),
      input: (text: string) => text,
    });

    await expect(
      answer.detailed('Production search is slow', {
        traceId: 'trace-1',
        userId: 'user-1',
        sessionId: 'session-1',
        properties: { channel: 'support' },
      }),
    ).resolves.toMatchObject({
      output: { answer: 'routed' },
      traceId: 'trace-1',
    });

    const expectedContext = {
      traceId: 'trace-1',
      model: 'primary-model',
      feature: 'route-ticket',
      userId: 'user-1',
      sessionId: 'session-1',
      properties: { channel: 'support' },
    };

    expect(trace.wrap).toHaveBeenCalledWith(model, expectedContext);
    expect(trace.generateOptions).toHaveBeenCalledWith(expectedContext);
    expect(trace.run).toHaveBeenCalledWith(expectedContext, expect.any(Function));
    expect(order).toEqual(['wrap', 'generateOptions', 'before', 'after']);
    expect(doGenerate).toHaveBeenCalledTimes(1);
  });
});
