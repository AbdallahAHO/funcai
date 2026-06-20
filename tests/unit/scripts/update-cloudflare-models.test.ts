import { describe, expect, it } from 'vitest';
import {
  extractJsonModeModels,
  extractModelSlugs,
  extractTaskLine,
  hasModelInfoFlag,
  hasStructuredOutputEvidence,
  parseModelPage,
  parsePrice,
} from '../../../scripts/update-cloudflare-models';

const currentDocsModelPage = `---
title: glm-4.7-flash
description: GLM-4.7-Flash is a fast and efficient multilingual text generation model.
---

# glm-4.7-flash

Text Generation • Zhipu AI

\`@cf/zai-org/glm-4.7-flash\`

| Model Info                                                                           |                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Context Window[ ↗](https://developers.cloudflare.com/workers-ai/glossary/)           | 131,072 tokens                                      |
| Function calling [ ↗](https://developers.cloudflare.com/workers-ai/function-calling) | Yes                                                 |
| Reasoning                                                                            | Yes                                                 |
| Unit Pricing                                                                         | $0.06 per M input tokens, $0.40 per M output tokens |

## Parameters

▶response\\_format

\`one of\`Specifies the format the model must output.
`;

const legacyModelPage = `---
title: legacy-model
description: Legacy model page shape.
---

# legacy-model

Text Generation • Example Provider • Cloudflare-hosted

\`@cf/example/legacy-model\`

| Model Info | |
| --- | --- |
| Vision | Yes |
| Batch | Yes |
| Unit Pricing | $0.10 per M input tokens, $0.20 per M output tokens |

guided_json{}
JSON schema that should be fulfilled for the response.
`;

describe('update-cloudflare-models parsing', () => {
  it('extracts model slugs from the current single-line model index', () => {
    const index = `[glm-4.7-flashText Generation • Zhipu AI](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)[gpt-oss-120bText Generation • OpenAI](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/)`;

    expect(extractModelSlugs(index)).toEqual(['glm-4.7-flash', 'gpt-oss-120b']);
  });

  it('extracts JSON Mode model IDs from the supported-models list', () => {
    const models = extractJsonModeModels(`
## Supported Models

* [@cf/meta/llama-3.1-8b-instruct-fast](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/)
* [@hf/nousresearch/hermes-2-pro-mistral-7b](https://developers.cloudflare.com/workers-ai/models/hermes-2-pro-mistral-7b/)
`);

    expect(models.get('llama-3.1-8b-instruct-fast')).toBe('@cf/meta/llama-3.1-8b-instruct-fast');
    expect(models.get('hermes-2-pro-mistral-7b')).toBe('@hf/nousresearch/hermes-2-pro-mistral-7b');
  });

  it('supports current and legacy task-line shapes', () => {
    expect(extractTaskLine(currentDocsModelPage)).toEqual({
      task: 'Text Generation',
      provider: 'Zhipu AI',
    });
    expect(extractTaskLine(legacyModelPage)).toEqual({
      task: 'Text Generation',
      provider: 'Example Provider',
    });
  });

  it('reads model capability and structured-output evidence from model pages', () => {
    expect(hasModelInfoFlag(currentDocsModelPage, 'Function calling')).toBe(true);
    expect(hasModelInfoFlag(currentDocsModelPage, 'Reasoning')).toBe(true);
    expect(hasStructuredOutputEvidence(currentDocsModelPage)).toBe(true);
    expect(hasStructuredOutputEvidence(legacyModelPage)).toBe(true);
  });

  it('parses current model pages into registry entries', () => {
    const parsed = parseModelPage('glm-4.7-flash', currentDocsModelPage, new Map());

    expect(parsed).toMatchObject({
      id: '@cf/zai-org/glm-4.7-flash',
      slug: 'glm-4.7-flash',
      provider: 'Zhipu AI',
      contextLength: 131_072,
      pricing: {
        promptPerMToken: 0.06,
        completionPerMToken: 0.4,
      },
      capabilities: {
        structuredOutput: true,
        tools: true,
        reasoning: true,
        vision: false,
      },
      structuredOutputSource: 'model-page',
    });
  });

  it('skips deprecated JSON Mode models before adding them to the registry', () => {
    const parsed = parseModelPage(
      'hermes-2-pro-mistral-7b',
      `${currentDocsModelPage}
| Deprecated | 5/30/2026 |
`,
      new Map([['hermes-2-pro-mistral-7b', '@hf/nousresearch/hermes-2-pro-mistral-7b']]),
    );

    expect(parsed).toEqual({
      slug: 'hermes-2-pro-mistral-7b',
      reason: 'deprecated or planned deprecation',
    });
  });

  it('parses pricing fields independently', () => {
    expect(parsePrice('$0.50 per M input tokens, $4.88 per M output tokens', 'input')).toBe(0.5);
    expect(parsePrice('$0.50 per M input tokens, $4.88 per M output tokens', 'output')).toBe(4.88);
  });
});
