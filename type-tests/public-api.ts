import {
  audio,
  type ContentPart,
  createAiFn,
  createMemoryCache,
  type DetailedResult,
  file,
  image,
  pdf,
  text,
} from 'funcai';
import { cloudflareAiGateway } from 'funcai/providers/cloudflare';
import { openrouter } from 'funcai/providers/openrouter';
import { validateExamples } from 'funcai/test';
import { posthog } from 'funcai/trace/posthog';
import { z } from 'zod';

const parts: ContentPart[] = [
  text('Analyze these files.'),
  image('https://example.com/photo.jpg'),
  pdf('https://example.com/invoice.pdf'),
  audio(new Uint8Array([1, 2, 3])),
  file('https://example.com/data.json', 'application/json', { filename: 'data.json' }),
];

const schema = z.object({ label: z.string(), confidence: z.number() });
const examples = [{ input: 'hello', output: { label: 'greeting', confidence: 0.9 } }];

validateExamples(examples, schema);

const ai = createAiFn({
  provider: openrouter({ apiKey: 'sk-test' }),
  trace: posthog({ apiKey: 'phc_test' }),
  cache: createMemoryCache(),
});

const prompt = ai.definePrompt({
  id: 'classify-message',
  model: 'google/gemini-3.1-flash-lite-preview',
  system: 'Classify the message.',
});

const classify = ai.fn({
  prompt,
  schema,
  examples,
  input: (value: string) => value,
  cache: true,
});

const outputPromise: Promise<{ label: string; confidence: number }> = classify('hello');
const detailedPromise: Promise<DetailedResult<{ label: string; confidence: number }>> =
  classify.detailed('hello');

const multimodal = ai.fn({
  model: 'google/gemini-3.1-flash-lite-preview',
  system: 'Classify multimodal input.',
  schema,
  input: () => parts,
});

const cloudflare = createAiFn({
  provider: cloudflareAiGateway({
    accountId: 'account',
    apiKey: 'token',
  }),
});

cloudflare.definePrompt({
  id: 'cloudflare-prompt',
  model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  system: 'Classify the message.',
});

cloudflare.definePrompt({
  id: 'bad-cloudflare-prompt',
  // @ts-expect-error Cloudflare provider only accepts the structured-output registry.
  model: '@cf/not-real/model',
  system: 'Classify the message.',
});

void outputPromise;
void detailedPromise;
void multimodal;
