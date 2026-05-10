/**
 * 14 — Local Gemma 4 multilingual triage: switch between LM Studio and Ollama.
 *
 * Real-world use-case:
 * A support team wants local-first triage for inbound tickets without sending
 * customer text to a hosted provider. Gemma 4 is marketed for multilingual
 * experiences, so this example uses a Spanish ticket and returns typed ops data.
 *
 * Run with LM Studio: set LOCAL_PROVIDER=lmstudio, LMSTUDIO_BASE_URL,
 * and LMSTUDIO_MODEL in your shell or CI, then `pnpm local:multilingual`.
 *
 * Run with Ollama: set LOCAL_PROVIDER=ollama, OLLAMA_BASE_URL,
 * and OLLAMA_MODEL in your shell or CI, then `pnpm local:multilingual`.
 *
 * Sample output from a validated LM Studio run:
 * {
 *   "detectedLanguage": "es",
 *   "intent": "technical",
 *   "severity": "high",
 *   "needsHumanResponseInOriginalLanguage": true,
 *   "suggestedQueue": "support-tech"
 * }
 *
 * Caveat:
 * This example is deliberately text-only so it stays stable across both LM
 * Studio and Ollama while still showing typed multilingual routing.
 */
import { createAiFn } from 'funcai';
import { lmstudio } from 'funcai/providers/lmstudio';
import { ollama } from 'funcai/providers/ollama';
import { z } from 'zod';

const LOCAL_PROVIDER = process.env.LOCAL_PROVIDER ?? 'lmstudio';
const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL ?? 'http://127.0.0.1:1234/v1';
const LMSTUDIO_MODEL = process.env.LMSTUDIO_MODEL ?? 'google/gemma-4-26b-a4b';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:latest';

const provider =
  LOCAL_PROVIDER === 'ollama'
    ? {
        name: 'ollama',
        model: OLLAMA_MODEL,
        instance: ollama({ baseURL: OLLAMA_BASE_URL }),
      }
    : {
        name: 'lmstudio',
        model: LMSTUDIO_MODEL,
        instance: lmstudio({ baseURL: LMSTUDIO_BASE_URL }),
      };

const ai = createAiFn({
  provider: provider.instance,
  retries: 0,
});

type SupportTicketInput = {
  customerTier: 'free' | 'pro' | 'enterprise';
  accountRegion: string;
  message: string;
};

const triageTicket = ai.fn({
  model: provider.model,
  system: `You are a support operations triage assistant.

Return a compact, structured routing decision.
Do not translate the user message unless needed to explain the issue internally.
`,
  schema: z.object({
    detectedLanguage: z.string(),
    intent: z.enum(['billing', 'technical', 'account', 'feature_request', 'other']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    needsHumanResponseInOriginalLanguage: z.boolean(),
    internalSummary: z.string(),
    suggestedQueue: z.enum(['support-billing', 'support-tech', 'support-account', 'product']),
  }),
  temperature: 0,
  input: (ticket: SupportTicketInput) => `Tier: ${ticket.customerTier}
Region: ${ticket.accountRegion}
Customer message:
${ticket.message}`,
});

const result = await triageTicket({
  customerTier: 'enterprise',
  accountRegion: 'ES',
  message: `Hola equipo, desde ayer no podemos subir facturas en el panel de administración.
La pantalla se queda cargando y varios clientes no pudieron cerrar el mes.
Necesitamos una solución hoy.`,
});

console.log('Local provider:', provider.name);
console.log('Model:', provider.model);
console.log(JSON.stringify(result, null, 2));
