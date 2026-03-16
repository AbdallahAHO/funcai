import { describe, expect, it } from 'vitest';
import { parseScaffoldFlags } from '@/cli/scaffold/index';
import {
  e2eTestTemplate,
  fewShotsTemplate,
  indexTemplate,
  inferZodType,
  integrationTestTemplate,
  promptMdTemplate,
  readmeTemplate,
  schemaTemplate,
  unitTestTemplate,
} from '@/cli/scaffold/templates';
import { DEFAULTS, type ScaffoldOptions } from '@/cli/scaffold/types';

// -- Helpers ------------------------------------------------------------------

const defaultOpts = (): ScaffoldOptions => ({ ...DEFAULTS });

const customOpts = (overrides?: Partial<ScaffoldOptions>): ScaffoldOptions => ({
  ...DEFAULTS,
  name: 'invoice-parser',
  description: 'Extract invoice data from text',
  fields: ['vendor', 'amount', 'currency'],
  ...overrides,
});

// -- inferZodType -------------------------------------------------------------

describe('inferZodType', () => {
  it('maps "sentiment" to enum', () => {
    expect(inferZodType('sentiment')).toContain("z.enum(['positive', 'negative', 'neutral'])");
  });

  it('maps confidence-like fields to z.number().min(0).max(1)', () => {
    expect(inferZodType('confidence')).toContain('z.number().min(0).max(1)');
    expect(inferZodType('score')).toContain('z.number().min(0).max(1)');
    expect(inferZodType('probability')).toContain('z.number().min(0).max(1)');
  });

  it('maps count-like fields to z.number()', () => {
    expect(inferZodType('count')).toBe('z.number()');
    expect(inferZodType('totalAmount')).toBe('z.number()');
  });

  it('maps boolean-like fields to z.boolean()', () => {
    expect(inferZodType('isValid')).toBe('z.boolean()');
    expect(inferZodType('hasAttachments')).toBe('z.boolean()');
  });

  it('maps array-like fields to z.array(z.string())', () => {
    expect(inferZodType('tags')).toBe('z.array(z.string())');
    expect(inferZodType('items')).toBe('z.array(z.string())');
    expect(inferZodType('categories')).toBe('z.array(z.string())');
  });

  it('defaults to z.string() for unknown fields', () => {
    expect(inferZodType('vendor')).toBe('z.string()');
    expect(inferZodType('reason')).toBe('z.string()');
    expect(inferZodType('description')).toBe('z.string()');
  });
});

// -- schemaTemplate -----------------------------------------------------------

describe('schemaTemplate', () => {
  it('produces a valid schema with correct field types for defaults', () => {
    const result = schemaTemplate(defaultOpts());

    expect(result).toContain("import { z } from 'zod'");
    expect(result).toContain('classifySentimentSchema');
    expect(result).toContain('ClassifySentimentOutput');
    expect(result).toContain("z.enum(['positive', 'negative', 'neutral'])");
    expect(result).toContain('z.number().min(0).max(1)');
    expect(result).toContain('z.string()');
  });

  it('uses camelCase for field names', () => {
    const opts = customOpts({ fields: ['first-name', 'last-name'] });
    const result = schemaTemplate(opts);

    expect(result).toContain('firstName:');
    expect(result).toContain('lastName:');
  });

  it('uses PascalCase for the type name', () => {
    const opts = customOpts();
    const result = schemaTemplate(opts);

    expect(result).toContain('InvoiceParserOutput');
    expect(result).toContain('invoiceParserSchema');
  });

  it('uses AI-generated field types when provided', () => {
    const result = schemaTemplate(defaultOpts(), {
      systemPrompt: '',
      fewShots: [],
      fieldTypes: { sentiment: "z.enum(['happy', 'sad', 'angry'])" },
    });

    expect(result).toContain("z.enum(['happy', 'sad', 'angry'])");
  });
});

// -- fewShotsTemplate ---------------------------------------------------------

describe('fewShotsTemplate', () => {
  it('imports Example type and schema output type', () => {
    const result = fewShotsTemplate(defaultOpts());

    expect(result).toContain("import type { Example } from 'funcai'");
    expect(result).toContain("import type { ClassifySentimentOutput } from './schema'");
  });

  it('generates sentiment-specific examples for default opts', () => {
    const result = fewShotsTemplate(defaultOpts());

    expect(result).toContain('positive');
    expect(result).toContain('negative');
    expect(result).toContain('confidence');
  });

  it('generates generic examples for custom features', () => {
    const result = fewShotsTemplate(customOpts());

    expect(result).toContain('Example input');
    expect(result).toContain('examples');
  });

  it('uses AI-generated examples when provided', () => {
    const result = fewShotsTemplate(defaultOpts(), {
      systemPrompt: '',
      fewShots: [
        {
          input: 'AI generated input',
          output: { sentiment: 'positive', confidence: 0.9, reason: 'test' },
        },
      ],
      fieldTypes: {},
    });

    expect(result).toContain('AI generated input');
  });
});

// -- promptMdTemplate ---------------------------------------------------------

describe('promptMdTemplate', () => {
  it('includes YAML frontmatter with correct fields', () => {
    const result = promptMdTemplate(defaultOpts());

    expect(result).toContain('id: classify-sentiment');
    expect(result).toContain('model: google/gemini-3.1-flash-lite-preview');
    expect(result).toContain('temperature: 0');
    expect(result).toContain('maxTokens: 500');
  });

  it('includes {{FEW_SHOTS}} placeholder', () => {
    const result = promptMdTemplate(defaultOpts());

    expect(result).toContain('{{FEW_SHOTS}}');
  });

  it('uses AI-generated system prompt when provided', () => {
    const result = promptMdTemplate(defaultOpts(), {
      systemPrompt: 'Custom AI prompt content here',
      fewShots: [],
      fieldTypes: {},
    });

    expect(result).toContain('Custom AI prompt content here');
  });
});

// -- indexTemplate -------------------------------------------------------------

describe('indexTemplate', () => {
  it('imports from correct packages', () => {
    const result = indexTemplate(defaultOpts());

    expect(result).toContain("import { createAiFn } from 'funcai'");
    expect(result).toContain("import { openrouter } from 'funcai/providers/openrouter'");
    expect(result).toContain("import { examples } from './few-shots'");
    expect(result).toContain('import { classifySentimentSchema');
  });

  it('exports the function with correct name and type', () => {
    const result = indexTemplate(defaultOpts());

    expect(result).toContain('export const classifySentiment = ai.fn(');
    expect(result).toContain("model: 'google/gemini-3.1-flash-lite-preview'");
    expect(result).toContain('schema: classifySentimentSchema');
    expect(result).toContain('export type { ClassifySentimentOutput }');
  });

  it('escapes backticks in the system prompt', () => {
    const opts = customOpts();
    const result = indexTemplate(opts, {
      systemPrompt: 'Use `code` blocks for output',
      fewShots: [],
      fieldTypes: {},
    });

    expect(result).toContain('\\`code\\`');
  });

  it('escapes template expressions in the system prompt', () => {
    const opts = customOpts();
    const result = indexTemplate(opts, {
      systemPrompt: 'Value is ${var}',
      fewShots: [],
      fieldTypes: {},
    });

    expect(result).toContain('\\${var}');
  });

  it('includes JSDoc with description and multiple examples', () => {
    const result = indexTemplate(defaultOpts());

    expect(result).toContain('Classify text by sentiment and confidence');
    expect(result).toContain('@example');
    expect(result).toContain('Detailed result with metadata');
    expect(result).toContain('latencyMs');
  });
});

// -- README template ----------------------------------------------------------

describe('readmeTemplate', () => {
  it('includes feature name as heading', () => {
    const result = readmeTemplate(defaultOpts());

    expect(result).toContain('# ClassifySentiment');
  });

  it('includes description', () => {
    const result = readmeTemplate(defaultOpts());

    expect(result).toContain('Classify text by sentiment and confidence');
  });

  it('includes quick start with correct import', () => {
    const result = readmeTemplate(defaultOpts());

    expect(result).toContain("import { classifySentiment } from '.'");
  });

  it('includes output schema table with fields', () => {
    const result = readmeTemplate(defaultOpts());

    expect(result).toContain('`sentiment`');
    expect(result).toContain('`confidence`');
    expect(result).toContain('`reason`');
  });

  it('includes file structure table', () => {
    const result = readmeTemplate(defaultOpts());

    expect(result).toContain('index.ts');
    expect(result).toContain('schema.ts');
    expect(result).toContain('few-shots.ts');
    expect(result).toContain('classify-sentiment.prompt.md');
  });

  it('includes testing instructions', () => {
    const result = readmeTemplate(defaultOpts());

    expect(result).toContain('npx vitest run tests/');
    expect(result).toContain('OPENROUTER_API_KEY');
  });
});

// -- Test templates -----------------------------------------------------------

describe('unitTestTemplate', () => {
  it('imports validateExamples from test utils', () => {
    const result = unitTestTemplate(defaultOpts());

    expect(result).toContain("import { validateExamples } from 'funcai/test'");
  });

  it('validates schema and few-shots', () => {
    const result = unitTestTemplate(defaultOpts());

    expect(result).toContain('classifySentimentSchema.parse');
    expect(result).toContain('validateExamples(examples, classifySentimentSchema)');
    expect(result).toContain('rejects empty object');
    expect(result).toContain('all examples match the schema');
  });

  it('uses correct describe block name', () => {
    const result = unitTestTemplate(defaultOpts());

    expect(result).toContain("describe('ClassifySentiment — unit'");
  });
});

describe('integrationTestTemplate', () => {
  it('imports MockLanguageModelV3', () => {
    const result = integrationTestTemplate(defaultOpts());

    expect(result).toContain("import { MockLanguageModelV3 } from 'ai/test'");
  });

  it('creates a mock provider and tests pipeline', () => {
    const result = integrationTestTemplate(defaultOpts());

    expect(result).toContain('new MockLanguageModelV3');
    expect(result).toContain('createAiFn({ provider, retries: 0 })');
    expect(result).toContain('classifySentimentSchema.parse(result)');
  });
});

describe('e2eTestTemplate', () => {
  it('uses describe.skipIf for API key gate', () => {
    const result = e2eTestTemplate(defaultOpts());

    expect(result).toContain('describe.skipIf(!process.env.OPENROUTER_API_KEY)');
  });

  it('imports the function from index', () => {
    const result = e2eTestTemplate(defaultOpts());

    expect(result).toContain("import { classifySentiment } from '../index'");
  });

  it('sets 30s timeout', () => {
    const result = e2eTestTemplate(defaultOpts());

    expect(result).toContain('timeout: 30_000');
  });
});

// -- parseScaffoldFlags -------------------------------------------------------

describe('parseScaffoldFlags', () => {
  it('parses --name flag', () => {
    const flags = parseScaffoldFlags(['--name', 'my-feature']);

    expect(flags.name).toBe('my-feature');
  });

  it('parses positional argument as name', () => {
    const flags = parseScaffoldFlags(['my-feature']);

    expect(flags.name).toBe('my-feature');
  });

  it('parses --fields flag as comma-separated', () => {
    const flags = parseScaffoldFlags(['--fields', 'a, b, c']);

    expect(flags.fields).toEqual(['a', 'b', 'c']);
  });

  it('parses --model flag', () => {
    const flags = parseScaffoldFlags(['--model', 'google/gemini-2.5-flash']);

    expect(flags.modelId).toBe('google/gemini-2.5-flash');
  });

  it('parses -y flag as skipPrompts', () => {
    const flags = parseScaffoldFlags(['-y']);

    expect(flags.skipPrompts).toBe(true);
  });

  it('parses --yes flag as skipPrompts', () => {
    const flags = parseScaffoldFlags(['--yes']);

    expect(flags.skipPrompts).toBe(true);
  });

  it('parses --posthog flag', () => {
    expect(parseScaffoldFlags(['--posthog']).posthog).toBe(true);
    expect(parseScaffoldFlags(['--no-posthog']).posthog).toBe(false);
  });

  it('parses --ai and --no-ai flags', () => {
    expect(parseScaffoldFlags(['--ai']).aiGenerate).toBe(true);
    expect(parseScaffoldFlags(['--no-ai']).aiGenerate).toBe(false);
  });

  it('combines multiple flags', () => {
    const flags = parseScaffoldFlags([
      '--name',
      'invoice-parser',
      '--fields',
      'vendor,amount',
      '--model',
      'openai/gpt-4o',
      '-y',
    ]);

    expect(flags.name).toBe('invoice-parser');
    expect(flags.fields).toEqual(['vendor', 'amount']);
    expect(flags.modelId).toBe('openai/gpt-4o');
    expect(flags.skipPrompts).toBe(true);
  });
});

// -- Full output consistency --------------------------------------------------

describe('default options produce consistent file set', () => {
  const opts = defaultOpts();

  it('schema references the correct types', () => {
    const schema = schemaTemplate(opts);
    const fewShots = fewShotsTemplate(opts);
    const index = indexTemplate(opts);
    const unit = unitTestTemplate(opts);

    // All files reference the same schema name
    const schemaName = 'classifySentimentSchema';
    expect(schema).toContain(schemaName);
    expect(fewShots).toContain('ClassifySentimentOutput');
    expect(index).toContain(schemaName);
    expect(unit).toContain(schemaName);
  });

  it('function name is consistent across files', () => {
    const index = indexTemplate(opts);
    const e2e = e2eTestTemplate(opts);

    expect(index).toContain('export const classifySentiment');
    expect(e2e).toContain('import { classifySentiment }');
  });
});
