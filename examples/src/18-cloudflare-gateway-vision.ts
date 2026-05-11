/**
 * 18 — Cloudflare AI Gateway: multimodal structured output.
 *
 * Uses a Workers AI model that explicitly supports structured output and vision.
 *
 * Run: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your shell
 * or CI, then `pnpm cloudflare:vision`.
 */
import { createAiFn } from 'funcai';
import type { CloudflareModelId } from 'funcai/providers/cloudflare';
import { cloudflareAiGateway } from 'funcai/providers/cloudflare';
import { z } from 'zod';

const ai = createAiFn({ provider: cloudflareAiGateway() });

const RECIPE_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg/960px-200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg';
const model =
  (process.env.CLOUDFLARE_VISION_MODEL as CloudflareModelId | undefined) ??
  '@cf/meta/llama-4-scout-17b-16e-instruct';

const inspectRecipeCard = ai.fn({
  model,
  system:
    'Inspect the recipe-card image for an archive intake queue. Return operational metadata, not prose.',
  schema: z.object({
    documentType: z.enum(['recipe_card', 'letter', 'form', 'unknown']),
    isHandwritten: z.boolean(),
    visibleTitle: z.string(),
    needsHumanReview: z.boolean(),
    reviewReason: z.string(),
  }),
  input: (imageUrl: string) => [
    { type: 'text' as const, text: 'Inspect this archival image.' },
    { type: 'image' as const, image: imageUrl },
  ],
});

const result = await inspectRecipeCard(RECIPE_IMAGE);

console.log('Cloudflare Gateway vision result:', result);
