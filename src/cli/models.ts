import { CLOUDFLARE_MODELS } from '@/provider/cloudflare/models';
import { OPENROUTER_MODELS } from '@/provider/openrouter/models';

export type ModelCatalogProvider = 'openrouter' | 'cloudflare';

export type CatalogModel = {
  id: string;
  provider: ModelCatalogProvider;
  name: string;
  owner: string;
  description: string;
  promptCost: number | null;
  completionCost: number | null;
  contextLength: number | null;
  modalities: readonly string[];
  structuredOutput: boolean;
  reasoning: boolean;
  tools: boolean;
};

type ModelSearchOptions = {
  provider?: ModelCatalogProvider;
  query?: string;
  limit?: number;
  vision?: boolean;
  reasoning?: boolean;
};

function openrouterCatalog(): CatalogModel[] {
  return Object.entries(OPENROUTER_MODELS).map(([id, model]) => ({
    id,
    provider: 'openrouter',
    name: model.name,
    owner: model.provider,
    description: model.description,
    promptCost: model.pricing.promptPerMToken,
    completionCost: model.pricing.completionPerMToken,
    contextLength: model.contextLength,
    modalities: model.modalities,
    structuredOutput: model.capabilities.structuredOutput,
    reasoning: model.capabilities.reasoning,
    tools: model.capabilities.tools,
  }));
}

function cloudflareCatalog(): CatalogModel[] {
  return Object.entries(CLOUDFLARE_MODELS).map(([id, model]) => ({
    id,
    provider: 'cloudflare',
    name: model.name,
    owner: model.provider,
    description: model.description,
    promptCost: model.pricing.promptPerMToken,
    completionCost: model.pricing.completionPerMToken,
    contextLength: model.contextLength,
    modalities: model.modalities,
    structuredOutput: model.capabilities.structuredOutput,
    reasoning: model.capabilities.reasoning,
    tools: model.capabilities.tools,
  }));
}

export function getModelCatalog(provider?: ModelCatalogProvider): CatalogModel[] {
  if (provider === 'openrouter') return openrouterCatalog();
  if (provider === 'cloudflare') return cloudflareCatalog();
  return [...openrouterCatalog(), ...cloudflareCatalog()];
}

export function findCatalogModel(
  id: string,
  provider?: ModelCatalogProvider,
): CatalogModel | undefined {
  return getModelCatalog(provider).find((model) => model.id === id);
}

export function searchModelCatalog(options: ModelSearchOptions = {}): CatalogModel[] {
  const query = options.query?.toLowerCase().trim();

  return getModelCatalog(options.provider)
    .filter((model) => {
      if (options.vision && !model.modalities.includes('image')) return false;
      if (options.reasoning && !model.reasoning) return false;
      if (!query) return true;

      const haystack = [model.id, model.name, model.owner, model.description]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, options.limit ?? 20);
}

export function cheapestModels(options: Omit<ModelSearchOptions, 'query'> = {}): CatalogModel[] {
  return getModelCatalog(options.provider)
    .filter((model) => {
      if (options.vision && !model.modalities.includes('image')) return false;
      if (options.reasoning && !model.reasoning) return false;
      return model.promptCost !== null && model.completionCost !== null;
    })
    .sort((left, right) => {
      const leftCost = (left.promptCost ?? 0) + (left.completionCost ?? 0);
      const rightCost = (right.promptCost ?? 0) + (right.completionCost ?? 0);
      return leftCost - rightCost;
    })
    .slice(0, options.limit ?? 10);
}

function parseProvider(value: string | undefined): ModelCatalogProvider | undefined {
  if (value === 'openrouter' || value === 'cloudflare') return value;
  return undefined;
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function firstCommandArgument(args: string[]): string | undefined {
  const flagsWithValues = new Set(['--provider', '--limit']);

  for (let index = 1; index < args.length; index++) {
    const arg = args[index];
    if (!arg) continue;
    if (flagsWithValues.has(arg)) {
      index++;
      continue;
    }
    if (!arg.startsWith('--')) return arg;
  }

  return undefined;
}

function formatCost(model: CatalogModel): string {
  if (model.promptCost === null || model.completionCost === null) return 'pricing unavailable';
  return `$${model.promptCost}/$${model.completionCost} per M tokens`;
}

function printModels(models: CatalogModel[]): void {
  if (models.length === 0) {
    console.log('No models matched.');
    return;
  }

  for (const model of models) {
    console.log(`${model.id}`);
    console.log(`  provider: ${model.provider} / ${model.owner}`);
    console.log(`  cost: ${formatCost(model)}`);
    console.log(`  modalities: ${model.modalities.join(', ')}`);
    console.log(`  context: ${model.contextLength ?? 'unknown'}`);
  }
}

const USAGE = `Usage:
  funcai models search <query> [--provider openrouter|cloudflare] [--limit 10] [--vision] [--reasoning]
  funcai models cheapest [--provider openrouter|cloudflare] [--limit 10] [--vision] [--reasoning]
  funcai models validate <model-id> [--provider openrouter|cloudflare]`;

export function runModels(args: string[]): void {
  const command = args[0];
  const provider = parseProvider(readFlag(args, '--provider'));
  const limit = Number(readFlag(args, '--limit') ?? 10);
  const vision = hasFlag(args, '--vision');
  const reasoning = hasFlag(args, '--reasoning');

  if (command === 'search') {
    const query = firstCommandArgument(args);
    printModels(searchModelCatalog({ provider, query, limit, vision, reasoning }));
    return;
  }

  if (command === 'cheapest') {
    printModels(cheapestModels({ provider, limit, vision, reasoning }));
    return;
  }

  if (command === 'validate') {
    const modelId = firstCommandArgument(args);
    if (!modelId) {
      console.error('Error: model id is required.');
      console.log(USAGE);
      process.exit(1);
    }

    const model = findCatalogModel(modelId, provider);
    if (!model) {
      console.error(`Unknown structured-output model: ${modelId}`);
      process.exit(1);
    }

    console.log(`${model.id} is available in the ${model.provider} structured-output registry.`);
    console.log(`Cost: ${formatCost(model)}`);
    console.log(`Modalities: ${model.modalities.join(', ')}`);
    return;
  }

  console.log(USAGE);
  if (command) process.exit(1);
}
