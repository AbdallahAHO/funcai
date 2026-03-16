/**
 * 06 — Transform: post-process the AI output before returning.
 *
 * The transform function receives the validated schema output and
 * the original input. It can be sync or async (e.g., for API calls).
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm transform
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

// Sync transform: normalize tags to lowercase
const extractTags = ai.fn({
  model: 'google/gemini-3.1-flash-lite-preview',
  system: 'Extract relevant tags from the given text. Return 3-5 tags.',
  schema: z.object({ tags: z.array(z.string()) }),
  input: (text: string) => text,
  transform: (output) => output.tags.map((t) => t.toLowerCase().trim()),
});

const tags = await extractTags(
  'Building a real-time analytics dashboard with Next.js 16, WebSockets, and PostgreSQL time-series data',
);
console.log('Tags:', tags);
// ["next.js", "websockets", "postgresql", "analytics", "real-time"]

// Async transform: enrich with external data
const extractEntities = ai.fn({
  model: 'google/gemini-3.1-flash-lite-preview',
  system: 'Extract company names and people mentioned in the text.',
  schema: z.object({
    companies: z.array(z.string()),
    people: z.array(z.string()),
  }),
  input: (text: string) => text,
  transform: async (output, originalText) => ({
    ...output,
    sourceLength: originalText.length,
    extractedAt: new Date().toISOString(),
  }),
});

const entities = await extractEntities(
  'Satya Nadella announced that Microsoft will partner with OpenAI on a new developer platform.',
);
console.log('Entities:', entities);
