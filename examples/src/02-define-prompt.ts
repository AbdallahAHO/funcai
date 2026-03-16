/**
 * 02 — Define a reusable prompt, then create a function from it.
 *
 * Separating prompt from function enables A/B testing, reuse across
 * multiple functions, and cleaner code organization.
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm prompt
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

// Define once — reuse across functions
const intentPrompt = ai.definePrompt({
  id: 'classify-intent',
  model: 'google/gemini-3.1-flash-lite-preview', // autocomplete from OpenRouter models
  temperature: 0,
  system: `You are an intent classifier for a customer support system.
Classify user messages into one of the predefined categories.
Be precise and consider context.`,
});

const classifyIntent = ai.fn({
  prompt: intentPrompt,
  schema: z.object({
    intent: z.enum(['billing', 'technical', 'general', 'cancellation']),
    confidence: z.number(),
    reasoning: z.string(),
  }),
  input: (message: string) => message,
});

const result = await classifyIntent('I was charged twice for my subscription last month');
console.log('Intent:', result);
// { intent: "billing", confidence: 0.95, reasoning: "..." }
