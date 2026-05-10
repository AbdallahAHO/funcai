import type { ScaffoldOptions, ScaffoldRecipeId } from './types';

type RecipeDefaults = Pick<
  ScaffoldOptions,
  'name' | 'description' | 'fields' | 'inputKind' | 'cache' | 'fallback'
>;

export const SCAFFOLD_RECIPES: Record<ScaffoldRecipeId, RecipeDefaults> = {
  'support-ticket': {
    name: 'classify-support-ticket',
    description: 'Route support tickets by intent, urgency, summary, and next action',
    fields: ['intent', 'urgency', 'summary', 'suggestedAction'],
    inputKind: 'text',
    cache: false,
    fallback: [],
  },
  'invoice-extractor': {
    name: 'extract-invoice',
    description: 'Extract invoice metadata, totals, currency, and line items',
    fields: ['vendor', 'invoiceNumber', 'totalAmount', 'currency', 'dueDate', 'lineItems'],
    inputKind: 'pdf',
    cache: false,
    fallback: [],
  },
  'image-inspection': {
    name: 'inspect-image',
    description: 'Inspect an image and return condition, notable features, and review status',
    fields: ['objectType', 'condition', 'notableFeatures', 'needsHumanReview'],
    inputKind: 'image',
    cache: false,
    fallback: [],
  },
  'cached-classifier': {
    name: 'cached-classifier',
    description: 'Classify repeatable inputs with an opt-in result cache',
    fields: ['label', 'confidence', 'reason'],
    inputKind: 'text',
    cache: true,
    fallback: [],
  },
  'fallback-chain': {
    name: 'fallback-chain',
    description: 'Run structured extraction with retry and fallback models',
    fields: ['outcome', 'confidence', 'reason'],
    inputKind: 'text',
    cache: false,
    fallback: ['anthropic/claude-haiku-4.5', 'google/gemini-2.5-flash'],
  },
};

export function isScaffoldRecipe(value: string | undefined): value is ScaffoldRecipeId {
  return value !== undefined && value in SCAFFOLD_RECIPES;
}

export function recipeDefaults(recipe: ScaffoldRecipeId): RecipeDefaults {
  return SCAFFOLD_RECIPES[recipe];
}
