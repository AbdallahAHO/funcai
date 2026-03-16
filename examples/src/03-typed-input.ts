/**
 * 03 — Typed input: pass a structured object, not just a string.
 *
 * The input function transforms your domain type into the user message.
 * TypeScript infers TInput from the input function signature.
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm typed-input
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

type ReviewInput = {
  title: string;
  body: string;
  rating: number;
  productCategory: string;
};

const analyzeReview = ai.fn({
  model: 'openai/gpt-4o-mini',
  system:
    'Analyze product reviews for actionable insights. Focus on specific, implementable feedback.',
  schema: z.object({
    topics: z.array(z.string()),
    sentiment: z.enum(['positive', 'negative', 'mixed']),
    actionable: z.boolean(),
    suggestedAction: z.string().describe('Suggested action, or "none" if not actionable'),
  }),
  input: (review: ReviewInput) =>
    `Category: ${review.productCategory}
Rating: ${review.rating}/5
Title: ${review.title}

${review.body}`,
});

const analysis = await analyzeReview({
  title: 'Great features but loading is painful',
  body: 'The new dashboard is beautiful and the analytics are exactly what we needed. However, page load times have gotten noticeably worse since the last update. Some pages take 5+ seconds.',
  rating: 3,
  productCategory: 'SaaS Analytics',
});

console.log('Analysis:', analysis);
