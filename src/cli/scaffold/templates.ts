import { toCamelCase, toPascalCase } from '../utils';
import type { AiContent, ProviderKind, ScaffoldOptions } from './types';

function providerImportPath(provider: ProviderKind): string {
  if (provider === 'lmstudio') return 'funcai/providers/lmstudio';
  if (provider === 'ollama') return 'funcai/providers/ollama';
  if (provider === 'cloudflare') return 'funcai/providers/cloudflare';
  return 'funcai/providers/openrouter';
}

function providerFactory(provider: ProviderKind): string {
  if (provider === 'lmstudio') return 'lmstudio';
  if (provider === 'ollama') return 'ollama';
  if (provider === 'cloudflare') return 'cloudflareAiGateway';
  return 'openrouter';
}

function providerReadmeName(provider: ProviderKind): string {
  if (provider === 'lmstudio') return 'LM Studio';
  if (provider === 'ollama') return 'Ollama';
  if (provider === 'cloudflare') return 'Cloudflare AI Gateway';
  return 'OpenRouter';
}

function providerE2eEnv(provider: ProviderKind): { gate: string; envVars: string[] } {
  if (provider === 'lmstudio') {
    return {
      gate: 'process.env.LMSTUDIO_BASE_URL || process.env.LMSTUDIO_MODEL',
      envVars: ['LMSTUDIO_BASE_URL', 'LMSTUDIO_MODEL'],
    };
  }

  if (provider === 'ollama') {
    return {
      gate: 'process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL',
      envVars: ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'],
    };
  }

  if (provider === 'cloudflare') {
    return {
      gate: 'process.env.CLOUDFLARE_ACCOUNT_ID && (process.env.CLOUDFLARE_AI_GATEWAY_API_KEY || process.env.CLOUDFLARE_API_TOKEN)',
      envVars: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'],
    };
  }

  return {
    gate: 'process.env.OPENROUTER_API_KEY',
    envVars: ['OPENROUTER_API_KEY'],
  };
}

/**
 * Infers a Zod type string from a field name using common naming conventions.
 */
export function inferZodType(field: string): string {
  const f = field.toLowerCase();
  if (f === 'sentiment') return "z.enum(['positive', 'negative', 'neutral'])";
  if (f === 'urgency') return "z.enum(['high', 'medium', 'low'])";
  if (f === 'condition') return "z.enum(['new', 'good', 'fair', 'poor', 'unknown'])";
  if (f.includes('confidence') || f.includes('score') || f.includes('probability'))
    return 'z.number().min(0).max(1)';
  if (f.includes('count') || f.includes('amount') || f.includes('total')) return 'z.number()';
  if (f.includes('is') || f.includes('has') || f.includes('should') || f.includes('needs'))
    return 'z.boolean()';
  if (
    f.includes('tags') ||
    f.includes('items') ||
    f.includes('categories') ||
    f.includes('features')
  )
    return 'z.array(z.string())';
  return 'z.string()';
}

// -- Schema template ----------------------------------------------------------

export function schemaTemplate(opts: ScaffoldOptions, aiContent?: AiContent): string {
  const camel = toCamelCase(opts.name);
  const pascal = toPascalCase(opts.name);

  const fieldDescriptions: Record<string, string> = {
    sentiment: 'Detected sentiment classification',
    confidence: 'Model confidence score (0-1)',
    reason: 'Brief explanation for the classification',
    urgency: 'Operational urgency level',
    intent: 'Detected user intent',
    summary: 'Concise summary of the input',
    suggestedaction: 'Recommended next action',
    score: 'Numeric score',
    tags: 'Relevant tags or labels',
    items: 'Extracted items',
    categories: 'Assigned categories',
    notablefeatures: 'Important visible features',
    needshumanreview: 'Whether a human should review this result',
  };

  const fieldLines = opts.fields.map((field) => {
    const zodType = aiContent?.fieldTypes[field] ?? inferZodType(field);
    const desc = fieldDescriptions[field.toLowerCase()];
    const descSuffix = desc ? `.describe('${desc}')` : '';
    return `  ${toCamelCase(field)}: ${zodType}${descSuffix},`;
  });

  return `import { z } from 'zod';

/**
 * Output schema for the ${pascal} AI function.
 *
 * Each field is validated at runtime — the AI model's response
 * must conform to this shape or the call will fail with a parse error.
 */
export const ${camel}Schema = z.object({
${fieldLines.join('\n')}
});

/** Inferred TypeScript type from the Zod schema. */
export type ${pascal}Output = z.infer<typeof ${camel}Schema>;
`;
}

// -- Few-shots template -------------------------------------------------------

function defaultFewShots(opts: ScaffoldOptions): Array<{ input: string; output: string }> {
  if (opts.recipe === 'support-ticket') {
    return [
      {
        input: 'Our whole team cannot log in after the latest deploy. Production work is blocked.',
        output: `{ intent: 'bug-report', urgency: 'high', summary: 'Team-wide login failure after deploy', suggestedAction: 'Escalate to engineering and acknowledge outage impact' }`,
      },
      {
        input: 'Can you add monthly PDF exports to the reporting dashboard?',
        output: `{ intent: 'feature-request', urgency: 'low', summary: 'Customer wants monthly PDF exports', suggestedAction: 'Log product feedback and send acknowledgement' }`,
      },
    ];
  }

  if (opts.recipe === 'invoice-extractor') {
    return [
      {
        input: 'Invoice INV-100 from Acme Corp. Total due is 1250 USD by 2026-06-01.',
        output: `{ vendor: 'Acme Corp', invoiceNumber: 'INV-100', totalAmount: 1250, currency: 'USD', dueDate: '2026-06-01', lineItems: ['invoice total: 1250 USD'] }`,
      },
    ];
  }

  if (opts.recipe === 'image-inspection') {
    return [
      {
        input: 'Product image showing a used laptop with visible scratches.',
        output: `{ objectType: 'laptop', condition: 'fair', notableFeatures: ['visible scratches', 'used condition'], needsHumanReview: true }`,
      },
    ];
  }

  // Sentiment classifier defaults
  if (opts.name === 'classify-sentiment' || opts.fields.includes('sentiment')) {
    return [
      {
        input: 'The product quality is amazing, exceeded all my expectations!',
        output: `{ sentiment: 'positive', confidence: 0.95, reason: 'Strong positive language with enthusiasm' }`,
      },
      {
        input: 'Terrible experience, would not recommend to anyone.',
        output: `{ sentiment: 'negative', confidence: 0.92, reason: 'Clear negative sentiment with strong disapproval' }`,
      },
    ];
  }

  // Generic defaults based on field names
  const outputFields = opts.fields
    .map((field) => {
      const f = field.toLowerCase();
      if (f.includes('confidence') || f.includes('score')) return `${toCamelCase(field)}: 0.85`;
      if (f.includes('is') || f.includes('has')) return `${toCamelCase(field)}: true`;
      if (f.includes('count') || f.includes('amount')) return `${toCamelCase(field)}: 3`;
      if (f.includes('tags') || f.includes('items')) return `${toCamelCase(field)}: ['example']`;
      return `${toCamelCase(field)}: 'example'`;
    })
    .join(', ');

  return [
    { input: 'Example input text for analysis.', output: `{ ${outputFields} }` },
    { input: 'Another example with different characteristics.', output: `{ ${outputFields} }` },
  ];
}

export function fewShotsTemplate(opts: ScaffoldOptions, aiContent?: AiContent): string {
  const pascal = toPascalCase(opts.name);

  let examplesCode: string;

  if (aiContent?.fewShots.length) {
    const entries = aiContent.fewShots.map(
      (shot) =>
        `  {\n    input: ${JSON.stringify(shot.input)},\n    output: ${JSON.stringify(shot.output, null, 2).replace(/\n/g, '\n    ')},\n  }`,
    );
    examplesCode = entries.join(',\n');
  } else {
    const shots = defaultFewShots(opts);
    const entries = shots.map(
      (shot) => `  {\n    input: '${shot.input}',\n    output: ${shot.output},\n  }`,
    );
    examplesCode = entries.join(',\n');
  }

  return `import type { Example } from 'funcai';
import type { ${pascal}Output } from './schema';

/**
 * Few-shot examples for the ${pascal} AI function.
 *
 * These examples are injected into the system prompt at the {{FEW_SHOTS}}
 * placeholder. They teach the model the expected input/output format.
 *
 * Tips:
 * - Keep 2-4 examples covering diverse cases
 * - Match the exact schema shape — examples are validated in tests
 * - Order from simple to complex for best model performance
 */
export const examples: Example<${pascal}Output>[] = [
${examplesCode},
];
`;
}

// -- Prompt.md template -------------------------------------------------------

function defaultSystemPrompt(opts: ScaffoldOptions): string {
  if (opts.recipe === 'support-ticket') {
    return [
      'You route support tickets into structured operational fields.',
      '',
      '## Instructions',
      '',
      '1. Identify the customer intent',
      '2. Assign urgency based on business impact and user blocking level',
      '3. Write a concise summary a support teammate can scan quickly',
      '4. Recommend the next action',
      '',
      '## Examples',
      '',
      '{{FEW_SHOTS}}',
    ].join('\n');
  }

  if (opts.recipe === 'invoice-extractor') {
    return [
      'You extract invoice data from documents into structured accounting fields.',
      '',
      '## Instructions',
      '',
      '1. Extract vendor, invoice number, total amount, currency, due date, and line items',
      '2. Preserve values exactly when visible',
      '3. Use concise strings for uncertain or partial line items',
      '4. Set missing optional-looking values to an empty string rather than inventing data',
      '',
      '## Examples',
      '',
      '{{FEW_SHOTS}}',
    ].join('\n');
  }

  if (opts.recipe === 'image-inspection') {
    return [
      'You inspect images and return structured review fields.',
      '',
      '## Instructions',
      '',
      '1. Identify the primary visible object or scene type',
      '2. Estimate condition only from visible evidence',
      '3. List notable visible features',
      '4. Flag human review when the image is unclear, ambiguous, or safety-critical',
      '',
      '## Examples',
      '',
      '{{FEW_SHOTS}}',
    ].join('\n');
  }

  if (opts.name === 'classify-sentiment') {
    return [
      `You are a sentiment classifier. Analyze the given text and determine its emotional tone.`,
      '',
      '## Instructions',
      '',
      '1. Read the text carefully, considering context and nuance',
      '2. Determine the overall sentiment (positive, negative, or neutral)',
      '3. Assign a confidence score between 0 and 1',
      '4. Provide a brief reason for your classification',
      '',
      '## Examples',
      '',
      '{{FEW_SHOTS}}',
    ].join('\n');
  }

  return [
    `You are an AI function that performs: ${opts.description}.`,
    '',
    '## Instructions',
    '',
    '1. Analyze the input carefully',
    `2. Produce structured output with: ${opts.fields.join(', ')}`,
    '3. Be precise and consistent',
    '',
    '## Examples',
    '',
    '{{FEW_SHOTS}}',
  ].join('\n');
}

export function promptMdTemplate(opts: ScaffoldOptions, aiContent?: AiContent): string {
  const systemPrompt = aiContent?.systemPrompt ?? defaultSystemPrompt(opts);
  const modelId = opts.modelId.startsWith('@') ? JSON.stringify(opts.modelId) : opts.modelId;
  return `---
id: ${opts.name}
provider: ${opts.provider}
model: ${modelId}
temperature: 0
maxTokens: 500
---

${systemPrompt}
`;
}

// -- Index template -----------------------------------------------------------

export function indexTemplate(opts: ScaffoldOptions, aiContent?: AiContent): string {
  const camel = toCamelCase(opts.name);
  const pascal = toPascalCase(opts.name);
  const systemPrompt = aiContent?.systemPrompt ?? defaultSystemPrompt(opts);
  const firstField = toCamelCase(opts.fields[0] ?? 'output');

  // Escape backticks and template literals for embedding in template string
  const escapedPrompt = systemPrompt.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const providerName = providerFactory(opts.provider);
  const providerPackage = providerImportPath(opts.provider);
  const funcaiImports = ['createAiFn'];
  if (opts.cache) funcaiImports.push('createMemoryCache');
  if (opts.inputKind === 'image') funcaiImports.push('image', 'text');
  if (opts.inputKind === 'pdf') funcaiImports.push('pdf', 'text');
  const cacheConfig = opts.cache
    ? `
  cache: createMemoryCache(),
  cachePolicy: { namespace: '${opts.name}', ttlSeconds: 300 },`
    : '';
  const inputImplementation =
    opts.inputKind === 'image'
      ? `(imageUrl: string) => [text('Analyze this image.'), image(imageUrl)]`
      : opts.inputKind === 'pdf'
        ? `(documentUrl: string) => [text('Extract structured data from this PDF.'), pdf(documentUrl)]`
        : '(text: string) => text';
  const exampleInput =
    opts.inputKind === 'image'
      ? 'https://example.com/image.jpg'
      : opts.inputKind === 'pdf'
        ? 'https://example.com/invoice.pdf'
        : 'Your input text here';
  const fnConfigLines = [
    `  model: '${opts.modelId}',`,
    `  system: \`${escapedPrompt}\`,`,
    `  schema: ${camel}Schema,`,
    '  examples,',
    opts.fallback.length > 0 ? `  fallback: ${JSON.stringify(opts.fallback)},` : null,
    opts.cache ? "  cache: { ttlSeconds: 300, version: 'v1' }," : null,
    `  input: ${inputImplementation},`,
  ].filter((line): line is string => line !== null);

  const posthogImport = opts.posthog ? "import { posthog } from 'funcai/trace/posthog';\n" : '';
  const posthogTrace = opts.posthog ? `\n  trace: posthog(process.env.POSTHOG_API_KEY!),` : '';

  return `import { ${funcaiImports.join(', ')} } from 'funcai';
import { ${providerName} } from '${providerPackage}';
${posthogImport}import { examples } from './few-shots';
import { ${camel}Schema, type ${pascal}Output } from './schema';

const ai = createAiFn({
  provider: ${providerName}(),${cacheConfig}${posthogTrace}
});

/**
 * ${opts.description}
 *
 * Uses the ${opts.modelId} model with structured output validated
 * against ${camel}Schema. Returns a typed ${pascal}Output object.
 *
 * @example
 * \`\`\`ts
 * const result = await ${camel}('${exampleInput}');
 * console.log(result.${firstField});
 * \`\`\`
 *
 * @example Detailed result with metadata
 * \`\`\`ts
 * const { output, model, usage, latencyMs } = await ${camel}.detailed('${exampleInput}');
 * console.log(output.${firstField}, \`(\${latencyMs}ms)\`);
 * \`\`\`
 */
export const ${camel} = ai.fn({
${fnConfigLines.join('\n')}
});

export type { ${pascal}Output };
export { ${camel}Schema } from './schema';
`;
}

// -- README template ----------------------------------------------------------

export function readmeTemplate(opts: ScaffoldOptions): string {
  const camel = toCamelCase(opts.name);
  const pascal = toPascalCase(opts.name);
  const liveTest = providerE2eEnv(opts.provider);
  const fieldsTable = opts.fields
    .map((field) => {
      const type = inferZodType(field).replace(/^z\./, '').split('.')[0] ?? 'string';
      return `| \`${toCamelCase(field)}\` | \`${type}\` | ${field} |`;
    })
    .join('\n');

  return `# ${pascal}

${opts.description}

## Quick start

\`\`\`typescript
import { ${camel} } from '.';

const result = await ${camel}('Your input text here');
console.log(result);
\`\`\`

## Output schema

| Field | Type | Description |
|-------|------|-------------|
${fieldsTable}

## Detailed result

\`\`\`typescript
const { output, model, usage, latencyMs, traceId } = await ${camel}.detailed(
  'Your input text',
  { userId: 'user_123', sessionId: 'session_456' },
);
\`\`\`

${opts.cache ? 'This scaffold enables the built-in memory cache. Replace `createMemoryCache()` with Redis, KV, or another async cache provider in production.\n\n' : ''}${opts.fallback.length > 0 ? `Fallback models are configured in order: ${opts.fallback.map((model) => `\`${model}\``).join(', ')}.\n\n` : ''}${opts.inputKind !== 'text' ? `This recipe expects a ${opts.inputKind === 'image' ? 'public image URL' : 'PDF URL'} as input.\n\n` : ''}
## Files

| File | Purpose |
|------|---------|
| \`index.ts\` | Main export — callable AI function |
| \`schema.ts\` | Zod output schema + TypeScript type |
| \`few-shots.ts\` | Example input/output pairs for the model |
| \`${opts.name}.prompt.md\` | System prompt source (YAML frontmatter + markdown) |
| \`${opts.name}.prompt.ts\` | Auto-generated from prompt.md (do not edit) |
| \`tests/\` | Unit, integration, and E2E tests |

## Testing

\`\`\`bash
# Unit + integration (no API key needed)
npx vitest run tests/

# E2E with live API after setting ${liveTest.envVars.map((envVar) => `\`${envVar}\``).join(', ')}
npx vitest run tests/${opts.name}.e2e.test.ts
\`\`\`

## Customization

1. **Schema** — Edit \`schema.ts\` to add/remove/modify output fields
2. **Prompt** — Edit \`${opts.name}.prompt.md\`, then run \`funcai generate .\` to regenerate
3. **Examples** — Add more few-shots in \`few-shots.ts\` for better model accuracy
4. **Model** — Change the \`model\` field in \`index.ts\` or \`${opts.name}.prompt.md\`
5. **Provider** — This scaffold targets ${providerReadmeName(opts.provider)}
`;
}

// -- Test templates -----------------------------------------------------------

export function unitTestTemplate(opts: ScaffoldOptions): string {
  const camel = toCamelCase(opts.name);
  const pascal = toPascalCase(opts.name);

  return `import { validateExamples } from 'funcai/test';
import { describe, expect, it } from 'vitest';
import { examples } from '../few-shots';
import { ${camel}Schema } from '../schema';

describe('${pascal} — unit', () => {
  describe('schema', () => {
    it('accepts valid output', () => {
      const valid = ${validOutputForFields(opts)};
      expect(() => ${camel}Schema.parse(valid)).not.toThrow();
    });

    it('rejects empty object', () => {
      expect(() => ${camel}Schema.parse({})).toThrow();
    });
  });

  describe('few-shots', () => {
    it('all examples match the schema', () => {
      validateExamples(examples, ${camel}Schema);
    });

    it('has at least one example', () => {
      expect(examples.length).toBeGreaterThanOrEqual(1);
    });
  });
});
`;
}

export function integrationTestTemplate(opts: ScaffoldOptions): string {
  const camel = toCamelCase(opts.name);
  const pascal = toPascalCase(opts.name);

  return `import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { createAiFn } from 'funcai';
import { examples } from '../few-shots';
import { ${camel}Schema } from '../schema';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

describe('${pascal} — integration', () => {
  it('returns structured output matching the schema', async () => {
    const expected = ${validOutputForFields(opts)};
    const doGenerate = vi.fn().mockResolvedValue(mockResponse(expected));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const ${camel} = ai.fn({
      model: 'test-model',
      system: 'Test system prompt.',
      schema: ${camel}Schema,
      examples,
      input: (text: string) => text,
    });

    const result = await ${camel}('Test input');

    expect(() => ${camel}Schema.parse(result)).not.toThrow();
    expect(result).toEqual(expected);
    expect(doGenerate).toHaveBeenCalledOnce();
  });
});
`;
}

export function e2eTestTemplate(opts: ScaffoldOptions): string {
  const camel = toCamelCase(opts.name);
  const pascal = toPascalCase(opts.name);
  const providerName = providerReadmeName(opts.provider);
  const liveTest = providerE2eEnv(opts.provider);

  return `import { describe, expect, it } from 'vitest';
import { ${camel}Schema } from '../schema';
import { ${camel} } from '../index';

/**
 * E2E test — makes a real API call via ${providerName}.
 * Skipped automatically until ${providerName} env vars are configured.
 */
describe.skipIf(!(${liveTest.gate}))('${pascal} — e2e', () => {
  it(
    'returns valid output from a live API call',
    async () => {
      const result = await ${camel}('${sampleInputForOptions(opts)}');

      expect(() => ${camel}Schema.parse(result)).not.toThrow();
    },
    { timeout: 30_000 },
  );
});
`;
}

// -- Helpers ------------------------------------------------------------------

function sampleInputForOptions(opts: ScaffoldOptions): string {
  if (opts.inputKind === 'image') {
    return 'https://upload.wikimedia.org/wikipedia/commons/3/3f/JPEG_example_flower.jpg';
  }
  if (opts.inputKind === 'pdf') {
    return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  }
  return 'This is a great product, I love it!';
}

function validOutputForFields(opts: ScaffoldOptions): string {
  const fields = opts.fields.map((field) => {
    const f = field.toLowerCase();
    const key = toCamelCase(field);
    if (f === 'sentiment') return `${key}: 'positive'`;
    if (f === 'urgency') return `${key}: 'high'`;
    if (f === 'condition') return `${key}: 'good'`;
    if (f.includes('confidence') || f.includes('score') || f.includes('probability'))
      return `${key}: 0.9`;
    if (f.includes('count') || f.includes('amount') || f.includes('total')) return `${key}: 5`;
    if (f.includes('is') || f.includes('has') || f.includes('should') || f.includes('needs'))
      return `${key}: true`;
    if (
      f.includes('tags') ||
      f.includes('items') ||
      f.includes('categories') ||
      f.includes('features')
    )
      return `${key}: ['example']`;
    return `${key}: 'example value'`;
  });

  return `{ ${fields.join(', ')} }`;
}
