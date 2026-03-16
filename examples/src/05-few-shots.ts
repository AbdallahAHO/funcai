/**
 * 05 — Few-shot examples: guide the model with input/output pairs.
 *
 * Examples are formatted as markdown and appended to the system prompt.
 * Use {{FEW_SHOTS}} in your system prompt to control placement.
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm few-shots
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

const categorize = ai.fn({
  model: 'openai/gpt-4o-mini',
  system: 'Categorize support tickets by department and urgency level.',
  schema: z.object({
    department: z.enum(['billing', 'technical', 'general', 'security']),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
  }),
  examples: [
    {
      input: 'I was charged twice for my subscription',
      output: { department: 'billing' as const, urgency: 'high' as const },
    },
    {
      input: 'How do I change my password?',
      output: { department: 'general' as const, urgency: 'low' as const },
    },
    {
      input: 'The API returns 500 errors on every request',
      output: { department: 'technical' as const, urgency: 'critical' as const },
    },
    {
      input: 'Someone accessed my account from an unknown device',
      output: { department: 'security' as const, urgency: 'critical' as const },
    },
  ],
  input: (ticket: string) => ticket,
});

const tickets = [
  'My invoice shows the wrong amount',
  'Can I upgrade to the enterprise plan?',
  'Dashboard graphs are not loading since yesterday',
];

for (const ticket of tickets) {
  const result = await categorize(ticket);
  console.log(`"${ticket}"\n  -> ${result.department} (${result.urgency})\n`);
}
