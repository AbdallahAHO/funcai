import * as p from '@clack/prompts';
import { CLOUDFLARE_MODELS } from '@/provider/cloudflare/models';
import { OPENROUTER_MODELS } from '@/provider/openrouter/models';
import {
  DEFAULTS,
  getDefaultModelId,
  type ProviderKind,
  type ScaffoldOptions,
  type TestLevel,
} from './types';

const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const POPULAR_MODELS = [
  'google/gemini-3.1-flash-lite-preview',
  'anthropic/claude-sonnet-4.6',
  'google/gemini-2.5-flash',
  'deepseek/deepseek-v3.2',
  'google/gemini-3.1-flash-lite-preview',
] as const;

const MODEL_CHOICES = [
  ...POPULAR_MODELS.map((id) => {
    const info = OPENROUTER_MODELS[id];
    return {
      value: id as string,
      label: id,
      hint: `$${info.pricing.promptPerMToken}/$${info.pricing.completionPerMToken} per M tokens`,
    };
  }),
  { value: '_custom', label: 'Custom' },
] as const;

const CLOUDFLARE_MODEL_CHOICES = [
  ...Object.entries(CLOUDFLARE_MODELS).map(([id, info]) => ({
    value: id,
    label: id,
    hint:
      info.pricing.promptPerMToken === null || info.pricing.completionPerMToken === null
        ? info.structuredOutputSource
        : `$${info.pricing.promptPerMToken}/$${info.pricing.completionPerMToken} per M tokens`,
  })),
] as const;

const PROVIDER_CHOICES = [
  { value: 'openrouter' as const, label: 'OpenRouter', hint: 'Hosted models with curated picker' },
  {
    value: 'cloudflare' as const,
    label: 'Cloudflare AI Gateway',
    hint: 'Workers AI models with explicit structured output',
  },
  { value: 'lmstudio' as const, label: 'LM Studio', hint: 'Local OpenAI-compatible server' },
  { value: 'ollama' as const, label: 'Ollama', hint: 'Local Ollama API' },
] as const;

function cancelGuard<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
  return value;
}

export async function collectOptions(
  flags: Partial<ScaffoldOptions> & { skipPrompts?: boolean },
): Promise<ScaffoldOptions> {
  const opts: ScaffoldOptions = { ...DEFAULTS, ...flags };
  opts.modelId = flags.modelId ?? getDefaultModelId(opts.provider);

  if (flags.skipPrompts) return opts;

  p.intro('funcai scaffold');

  // Name
  if (!flags.name) {
    const name = cancelGuard(
      await p.text({
        message: 'Feature name (kebab-case)',
        placeholder: DEFAULTS.name,
        initialValue: DEFAULTS.name,
        validate: (v) => {
          if (!v) return 'Name is required';
          if (!KEBAB_CASE_REGEX.test(v)) return 'Must be kebab-case (e.g., my-feature)';
        },
      }),
    );
    opts.name = name;
  }

  // Description
  if (!flags.description) {
    const description = cancelGuard(
      await p.text({
        message: 'What does this AI function do?',
        placeholder: DEFAULTS.description,
        initialValue: DEFAULTS.description,
      }),
    );
    opts.description = description;
  }

  // Provider
  if (!flags.provider) {
    const provider = cancelGuard(
      await p.select<ProviderKind>({
        message: 'Provider',
        options: [...PROVIDER_CHOICES],
        initialValue: DEFAULTS.provider,
      }),
    );
    opts.provider = provider;
    if (!flags.modelId) {
      opts.modelId = getDefaultModelId(provider);
    }
  }

  // Model
  if (!flags.modelId) {
    if (opts.provider === 'openrouter') {
      const modelChoice = cancelGuard(
        await p.select({
          message: 'Model',
          options: [...MODEL_CHOICES],
          initialValue: getDefaultModelId(opts.provider),
        }),
      );

      if (modelChoice === '_custom') {
        const customModel = cancelGuard(
          await p.text({
            message: 'Custom model ID (e.g., meta-llama/llama-3.1-8b-instruct)',
            validate: (v) => {
              if (!v) return 'Model ID is required';
              if (!v.includes('/')) return 'Expected format: provider/model-name';
            },
          }),
        );
        opts.modelId = customModel;
      } else {
        opts.modelId = modelChoice;
      }
    } else if (opts.provider === 'cloudflare') {
      const modelChoice = cancelGuard(
        await p.select({
          message: 'Model',
          options: [...CLOUDFLARE_MODEL_CHOICES],
          initialValue: getDefaultModelId(opts.provider),
        }),
      );
      opts.modelId = modelChoice;
    } else {
      const placeholder = opts.provider === 'lmstudio' ? 'google/gemma-4-26b-a4b' : 'gemma4:latest';
      const customModel = cancelGuard(
        await p.text({
          message: 'Model ID',
          placeholder,
          initialValue: getDefaultModelId(opts.provider),
          validate: (v) => (!v ? 'Model ID is required' : undefined),
        }),
      );
      opts.modelId = customModel;
    }
  }

  // Fields
  if (!flags.fields) {
    const fieldsInput = cancelGuard(
      await p.text({
        message: 'Output fields (comma-separated)',
        placeholder: DEFAULTS.fields.join(', '),
        initialValue: DEFAULTS.fields.join(', '),
      }),
    );
    opts.fields = fieldsInput
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
  }

  // PostHog
  if (flags.posthog === undefined) {
    const posthog = cancelGuard(
      await p.confirm({
        message: 'Enable PostHog tracing?',
        initialValue: DEFAULTS.posthog,
      }),
    );
    opts.posthog = posthog;
  }

  // Test levels
  if (!flags.testLevels) {
    const testLevels = cancelGuard(
      await p.multiselect<TestLevel>({
        message: 'Test levels',
        options: [
          { value: 'unit' as TestLevel, label: 'Unit', hint: 'schema + few-shot validation' },
          {
            value: 'integration' as TestLevel,
            label: 'Integration',
            hint: 'MockLanguageModelV3 pipeline',
          },
          {
            value: 'e2e' as TestLevel,
            label: 'E2E',
            hint: 'live API call (skipped without API key)',
          },
        ],
        initialValues: [...DEFAULTS.testLevels],
        required: false,
      }),
    );
    opts.testLevels = testLevels;
  }

  // AI generation
  const hasApiKey = Boolean(process.env.OPENROUTER_API_KEY);
  if (flags.aiGenerate === undefined && hasApiKey) {
    const aiGenerate = cancelGuard(
      await p.confirm({
        message: 'Generate prompt & examples with AI?',
        initialValue: true,
      }),
    );
    opts.aiGenerate = aiGenerate;
  }

  return opts;
}
