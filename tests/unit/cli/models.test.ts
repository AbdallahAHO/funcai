import {
  cheapestModels,
  findCatalogModel,
  getModelCatalog,
  searchModelCatalog,
} from '@/cli/models';

describe('model catalog CLI helpers', () => {
  it('returns both provider catalogs by default', () => {
    const catalog = getModelCatalog();

    expect(catalog.some((model) => model.provider === 'openrouter')).toBe(true);
    expect(catalog.some((model) => model.provider === 'cloudflare')).toBe(true);
  });

  it('finds known structured-output models', () => {
    const model = findCatalogModel('google/gemini-3.1-flash-lite-preview', 'openrouter');

    expect(model?.structuredOutput).toBe(true);
    expect(model?.provider).toBe('openrouter');
  });

  it('searches by query and provider', () => {
    const results = searchModelCatalog({
      provider: 'openrouter',
      query: 'gemini',
      limit: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((model) => model.provider === 'openrouter')).toBe(true);
    expect(results.some((model) => model.id.includes('gemini'))).toBe(true);
  });

  it('sorts cheapest models by combined token cost', () => {
    const results = cheapestModels({ provider: 'openrouter', limit: 3 });
    const costs = results.map((model) => (model.promptCost ?? 0) + (model.completionCost ?? 0));

    expect(costs).toEqual([...costs].sort((left, right) => left - right));
  });
});
