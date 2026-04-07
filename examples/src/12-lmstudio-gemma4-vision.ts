/**
 * 12 — LM Studio + Gemma 4 vision: triage a handwritten recipe card.
 *
 * Real-world use-case:
 * A food archive intake team needs to quickly classify scanned recipe cards
 * before a human archivist spends time on full transcription.
 *
 * Run:
 * LMSTUDIO_BASE_URL=http://192.168.2.188:1234/v1 \
 * LMSTUDIO_MODEL=google/gemma-4-26b-a4b \
 * pnpm lmstudio:vision
 *
 * Sample output from a validated run:
 * {
 *   "documentType": "handwritten_recipe_card",
 *   "recipeTitle": "200 year-old Pound-cake Recipe",
 *   "legibility": "clear",
 *   "needsHumanReview": false
 * }
 *
 * Caveat:
 * Gemma 4 through LM Studio was more reliable here with a compact schema and
 * short prompt. Larger OCR-heavy objects tended to produce truncated JSON.
 */
import { Buffer } from 'node:buffer';
import { createAiFn } from 'funcai';
import { lmstudio } from 'funcai/providers/lmstudio';
import { z } from 'zod';

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL ?? 'http://127.0.0.1:1234/v1';
const LMSTUDIO_MODEL = process.env.LMSTUDIO_MODEL ?? 'google/gemma-4-26b-a4b';

const RECIPE_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg/960px-200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg';

const recipeImageResponse = await fetch(RECIPE_IMAGE_URL);
if (!recipeImageResponse.ok) {
  throw new Error(`Failed to download recipe image: ${recipeImageResponse.status}`);
}

const recipeImage = Buffer.from(await recipeImageResponse.arrayBuffer());

const ai = createAiFn({
  provider: lmstudio({ baseURL: LMSTUDIO_BASE_URL }),
  retries: 0,
});

const triageRecipeCard = ai.fn({
  model: LMSTUDIO_MODEL,
  system: `You are doing archive intake for historical food documents.

Return one compact JSON object only.
Keep strings extremely short.
Do not quote or transcribe the full card.
`,
  schema: z.object({
    documentType: z.enum(['handwritten_recipe_card', 'other']),
    recipeTitle: z.string().describe('Short recipe title, 6 words or fewer'),
    legibility: z.enum(['clear', 'partially_clear', 'hard_to_read']),
    needsHumanReview: z.boolean(),
  }),
  temperature: 0,
  maxTokens: 80,
  input: () => [
    {
      type: 'text' as const,
      text: `Classify this image for archive intake.
If it is a recipe card, return the shortest visible title.
Prefer "needsHumanReview": true when uncertain.`,
    },
    { type: 'image' as const, image: recipeImage },
  ],
});

const result = await triageRecipeCard('');

console.log('LM Studio base URL:', LMSTUDIO_BASE_URL);
console.log('LM Studio model:', LMSTUDIO_MODEL);
console.log(JSON.stringify(result, null, 2));
