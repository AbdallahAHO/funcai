/**
 * 13 — Ollama + Gemma 4 vision: turn a handwritten recipe into a prep brief.
 *
 * Real-world use-case:
 * A small bakery receives legacy handwritten recipes and needs a structured
 * production handoff before a human finalizes the batch plan.
 *
 * Run:
 * OLLAMA_BASE_URL=http://127.0.0.1:11434 \
 * OLLAMA_MODEL=gemma4:latest \
 * pnpm ollama:vision
 *
 * Sample output from a validated run:
 * {
 *   "recipeName": "200 Year-Old Pound Cake Recipe",
 *   "coreIngredients": [
 *     "1 lb. of sugar",
 *     "1 lb. of flour",
 *     "1 lb. of butter (scant)",
 *     "9 large eggs"
 *   ],
 *   "needsHumanReview": true
 * }
 *
 * Caveat:
 * Ollama handled the richer extraction schema well in local testing, but the
 * handwriting still leaves some process details ambiguous, so human review is
 * intentionally part of the workflow.
 */
import { Buffer } from 'node:buffer';
import { createAiFn } from 'funcai';
import { ollama } from 'funcai/providers/ollama';
import { z } from 'zod';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:latest';

const RECIPE_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg/960px-200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg';

const recipeImageResponse = await fetch(RECIPE_IMAGE_URL);
if (!recipeImageResponse.ok) {
  throw new Error(`Failed to download recipe image: ${recipeImageResponse.status}`);
}

const recipeImage = Buffer.from(await recipeImageResponse.arrayBuffer());

const ai = createAiFn({
  provider: ollama({ baseURL: OLLAMA_BASE_URL }),
  retries: 0,
});

const createPrepBrief = ai.fn({
  model: OLLAMA_MODEL,
  system: `You are preparing a bakery operations handoff from a handwritten recipe image.

Focus on extraction that helps a baker quickly decide whether the recipe is ready
for production or still needs a human review pass.
`,
  schema: z.object({
    recipeName: z.string(),
    coreIngredients: z.array(z.string()).describe('Main ingredients normalized for prep'),
    operatorSummary: z
      .string()
      .describe('One short summary a baker can read before recreating the recipe'),
    possibleRisks: z.array(z.string()).describe('Missing quantities, unclear handwriting, or gaps'),
    needsHumanReview: z.boolean(),
  }),
  temperature: 0,
  input: () => [
    {
      type: 'text' as const,
      text: 'Turn this handwritten recipe image into a production prep brief.',
    },
    { type: 'image' as const, image: recipeImage },
  ],
});

const result = await createPrepBrief('');

console.log('Ollama base URL:', OLLAMA_BASE_URL);
console.log('Ollama model:', OLLAMA_MODEL);
console.log(JSON.stringify(result, null, 2));
