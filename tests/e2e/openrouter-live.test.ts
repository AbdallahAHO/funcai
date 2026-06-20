import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/core/factory';
import { openrouter } from '@/provider/openrouter';

// Use cheapest reliable model with structured output support
const TEST_MODEL = 'google/gemini-3.1-flash-lite-preview';

describe.skipIf(!process.env.OPENROUTER_API_KEY)('OpenRouter E2E', () => {
  const ai = createAiFn({ provider: openrouter(), retries: 1 });

  it('returns structured output matching schema', async () => {
    const classify = ai.fn({
      model: TEST_MODEL,
      system:
        'Classify the intent as greeting, question, or command. Return only the structured output.',
      schema: z.object({
        intent: z.enum(['greeting', 'question', 'command']),
        confidence: z.number().min(0).max(1),
      }),
      input: (msg: string) => msg,
    });

    const result = await classify('Hello there!');
    expect(result.intent).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns detailed metadata via .detailed()', async () => {
    const classify = ai.fn({
      model: TEST_MODEL,
      system: 'Classify the intent as greeting, question, or command.',
      schema: z.object({
        intent: z.enum(['greeting', 'question', 'command']),
      }),
      input: (msg: string) => msg,
    });

    const detailed = await classify.detailed('What time is it?', {
      traceId: 'test-trace-123',
      userId: 'test-user',
    });

    expect(detailed.output.intent).toBe('question');
    expect(detailed.model).toBe(TEST_MODEL);
    expect(detailed.traceId).toBe('test-trace-123');
    expect(detailed.latencyMs).toBeGreaterThan(0);
    expect(detailed.attempts).toBe(1);
    expect(detailed.usage.inputTokens).toBeGreaterThan(0);
    expect(detailed.usage.outputTokens).toBeGreaterThan(0);

    // OpenRouter surfaces cost in providerMetadata
    expect(detailed.cost).toBeTypeOf('number');
    expect(detailed.cost).toBeGreaterThan(0);
    expect(detailed.providerMetadata).toBeDefined();
  });

  it('supports definePrompt + fn flow', async () => {
    const prompt = ai.definePrompt({
      id: 'e2e-classify',
      model: TEST_MODEL,
      temperature: 0,
      system: 'Extract the language of the input text.',
    });

    const detectLanguage = ai.fn({
      prompt,
      schema: z.object({
        language: z.string(),
        confidence: z.number(),
      }),
      input: (text: string) => text,
    });

    const result = await detectLanguage('Bonjour le monde');
    // Models may return "French", "french", or ISO code "fr"
    expect(['french', 'fr']).toContain(result.language.toLowerCase());
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('supports few-shot examples', async () => {
    const sentiment = ai.fn({
      model: TEST_MODEL,
      system: 'Classify the sentiment of the text.',
      schema: z.object({
        sentiment: z.enum(['positive', 'negative', 'neutral']),
      }),
      input: (text: string) => text,
      examples: [
        { input: 'I love this product!', output: { sentiment: 'positive' as const } },
        { input: 'This is terrible.', output: { sentiment: 'negative' as const } },
        { input: 'The meeting is at 3pm.', output: { sentiment: 'neutral' as const } },
      ],
    });

    const result = await sentiment('What an amazing day!');
    expect(result.sentiment).toBe('positive');
  });

  it('returns a stable nested standard object from a live endpoint', async () => {
    const parseIncident = ai.fn({
      id: 'e2e-incident-router',
      model: TEST_MODEL,
      temperature: 0,
      maxTokens: 500,
      system: [
        'Convert the incoming support note into the exact incident object requested.',
        'Use the explicit facts from the input only.',
        'Return a concise object with deterministic labels.',
      ].join('\n'),
      schema: z.object({
        incident: z.object({
          id: z.string(),
          severity: z.enum(['low', 'medium', 'high']),
          customerTier: z.enum(['free', 'pro', 'enterprise']),
          requiresHumanReview: z.boolean(),
          summary: z.string().min(10),
        }),
        routing: z.object({
          queue: z.enum(['billing', 'support', 'engineering']),
          tags: z.array(z.enum(['login', 'billing', 'outage', 'security', 'performance'])),
          priorityScore: z.number().min(0).max(100),
        }),
        nextAction: z.object({
          owner: z.enum(['support-agent', 'on-call-engineer', 'billing-specialist']),
          dueMinutes: z.number().int().positive(),
          customerMessage: z.string().min(10),
        }),
        confidence: z.number().min(0).max(1),
      }),
      input: (note: string) => note,
    });

    const detailed = await parseIncident.detailed(
      [
        'Incident INC-4821 from enterprise customer Northwind Legal.',
        'Users can sign in, but document search is timing out across multiple offices.',
        'No billing issue is mentioned. The customer is blocked on a filing deadline in 45 minutes.',
      ].join(' '),
      { traceId: 'e2e-openrouter-standard-object' },
    );

    expect(detailed.output).toStrictEqual(
      expect.objectContaining({
        incident: expect.objectContaining({
          id: 'INC-4821',
          severity: 'high',
          customerTier: 'enterprise',
          requiresHumanReview: true,
        }),
        routing: expect.objectContaining({
          queue: 'engineering',
        }),
        nextAction: expect.objectContaining({
          owner: 'on-call-engineer',
        }),
      }),
    );
    expect(detailed.output.routing.tags).toContain('performance');
    expect(detailed.output.routing.priorityScore).toBeGreaterThanOrEqual(70);
    expect(detailed.output.nextAction.dueMinutes).toBeLessThanOrEqual(45);
    expect(detailed.output.confidence).toBeGreaterThanOrEqual(0.7);

    expect(detailed.model).toBe(TEST_MODEL);
    expect(detailed.traceId).toBe('e2e-openrouter-standard-object');
    expect(detailed.attempts).toBe(1);
    expect(detailed.usage.inputTokens).toBeGreaterThan(0);
    expect(detailed.usage.outputTokens).toBeGreaterThan(0);
    expect(detailed.latencyMs).toBeGreaterThan(0);
    expect(detailed.cost).toBeTypeOf('number');
    expect(detailed.providerMetadata?.openrouter).toBeDefined();
  });
});
