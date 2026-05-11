/**
 * 17 — Cloudflare AI Gateway: strict structured output with Workers AI.
 *
 * Run: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your shell
 * or CI, then `pnpm cloudflare:basic`.
 */
import { createAiFn } from 'funcai';
import type { CloudflareModelId } from 'funcai/providers/cloudflare';
import { cloudflareAiGateway } from 'funcai/providers/cloudflare';
import { z } from 'zod';

const ai = createAiFn({ provider: cloudflareAiGateway() });
const model =
  (process.env.CLOUDFLARE_MODEL as CloudflareModelId | undefined) ??
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const classifyIncident = ai.fn({
  model,
  system:
    'Classify a customer support incident for an operations team. Return only valid JSON matching the schema, without Markdown or prose.',
  schema: z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    category: z.enum(['billing', 'technical', 'account', 'security', 'other']),
    requiresHumanFollowUp: z.boolean(),
    routingNote: z.string(),
  }),
  input: (text: string) => text,
});

const result = await classifyIncident(
  'Several customers cannot upload invoices in the admin portal. The upload spinner never stops and month-end close is blocked.',
);

console.log('Cloudflare Gateway result:', result);
