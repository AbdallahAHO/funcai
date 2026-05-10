# funcai

AI as a Function — define a Zod schema, get validated structured output back. Retry, fallback, tracing, caching, multimodal, and cost tracking built in.

Built on the [Vercel AI SDK](https://sdk.vercel.ai/). Wraps `generateObject` into typed, callable functions.

## Install

```bash
pnpm add funcai zod
```

## Quick Start

```typescript
import { z } from "zod";
import { createAiFn } from "funcai";
import { openrouter } from "funcai/providers/openrouter";

const ai = createAiFn({ provider: openrouter() });

const classifySentiment = ai.fn({
  model: "anthropic/claude-sonnet-4",
  system: "Classify the sentiment of the given text.",
  schema: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    confidence: z.number().min(0).max(1),
  }),
  input: (text: string) => text,
});

await classifySentiment("This product exceeded all my expectations!");
// → { sentiment: "positive", confidence: 0.95 }
```

## Examples

### Typed input objects

Pass structured data instead of plain strings — the `input` function formats it for the model.

```typescript
const analyzeReview = ai.fn({
  model: "google/gemini-3.1-flash-lite-preview",
  system: "Analyze product reviews. Identify actionable feedback, sentiment, and suggest improvements.",
  schema: z.object({
    sentiment: z.enum(["positive", "negative", "mixed"]),
    topics: z.array(z.string()),
    actionable: z.boolean(),
    suggestedAction: z.string(),
  }),
  input: (review: { title: string; body: string; rating: number; category: string }) =>
    `Category: ${review.category}\nRating: ${review.rating}/5\nTitle: ${review.title}\n\n${review.body}`,
});

await analyzeReview({
  title: "Great features but slow loading",
  body: "The new dashboard is beautiful and the analytics are exactly what we needed. However, page load times have gotten noticeably worse since the last update.",
  rating: 3,
  category: "SaaS Analytics",
});
// → {
//     sentiment: "mixed",
//     topics: ["dashboard", "performance", "analytics"],
//     actionable: true,
//     suggestedAction: "Investigate page load regression in latest release"
//   }
```

### Multimodal — images, PDFs, audio

Return `ContentPart[]` from `input` to send images, files, or audio alongside text.

```typescript
const analyzeProductImage = ai.fn({
  model: "google/gemini-2.5-flash",
  system: "Analyze product images. Identify the product type, condition, and key visual features.",
  schema: z.object({
    productType: z.string(),
    condition: z.enum(["new", "like-new", "good", "fair", "poor"]),
    features: z.array(z.string()),
    backgroundQuality: z.enum(["professional", "decent", "poor"]),
  }),
  input: (photo: { url: string; productId: string }) => [
    { type: "text" as const, text: `Product ${photo.productId} — analyze this image:` },
    { type: "image" as const, image: photo.url },
  ],
});

await analyzeProductImage({ url: "https://example.com/products/42/photo.jpg", productId: "SKU-042" });
// → {
//     productType: "wireless headphones",
//     condition: "new",
//     features: ["noise cancelling", "over-ear", "foldable design"],
//     backgroundQuality: "professional"
//   }
```

<details>
<summary><strong>PDF extraction</strong> — parse invoices and documents</summary>

```typescript
const extractInvoice = ai.fn({
  model: "google/gemini-2.5-flash",
  system: "Extract structured data from invoice PDFs.",
  schema: z.object({
    vendor: z.string(),
    invoiceNumber: z.string(),
    date: z.string(),
    total: z.number(),
    currency: z.string(),
    lineItems: z.array(z.object({ description: z.string(), amount: z.number() })),
  }),
  input: (invoiceUrl: string) => [
    { type: "text" as const, text: "Extract all details from this invoice:" },
    { type: "file" as const, data: new URL(invoiceUrl), mediaType: "application/pdf" },
  ],
});

await extractInvoice("https://example.com/invoices/INV-2025-001.pdf");
// → {
//     vendor: "Acme Corp",
//     invoiceNumber: "INV-2025-001",
//     date: "2025-03-01",
//     total: 1250.00,
//     currency: "USD",
//     lineItems: [{ description: "Consulting services", amount: 1000 }, ...]
//   }
```

</details>

<details>
<summary><strong>Audio transcription</strong> — analyze support calls and recordings</summary>

```typescript
const analyzeCallRecording = ai.fn({
  model: "google/gemini-2.5-flash",
  system: "Transcribe and analyze customer support call recordings. Extract sentiment, key issues, and resolution status.",
  schema: z.object({
    transcript: z.string(),
    sentiment: z.enum(["very-positive", "positive", "neutral", "negative"]),
    keyIssues: z.array(z.string()),
    resolved: z.boolean(),
    followUpNeeded: z.boolean(),
  }),
  input: (recording: { audioUrl: string; ticketId: string }) => [
    { type: "text" as const, text: `Support call for ticket ${recording.ticketId}:` },
    { type: "file" as const, data: new URL(recording.audioUrl), mediaType: "audio/ogg" },
  ],
});

await analyzeCallRecording({
  audioUrl: "https://example.com/calls/ticket-8f3/recording.ogg",
  ticketId: "TKT-042",
});
// → {
//     transcript: "Customer reported login issues after the latest update...",
//     sentiment: "negative",
//     keyIssues: ["login failure", "password reset not working"],
//     resolved: false,
//     followUpNeeded: true
//   }
```

</details>

### Few-shot examples

Guide the model with input/output pairs. Injected into the system prompt automatically.

```typescript
const classifyEmail = ai.fn({
  model: "google/gemini-3.1-flash-lite-preview",
  system: "Classify incoming emails by intent and urgency for the support queue.",
  schema: z.object({
    intent: z.enum(["support", "billing", "feature-request", "bug-report", "spam", "other"]),
    urgency: z.enum(["high", "medium", "low"]),
    suggestedAction: z.string(),
  }),
  input: (message: string) => message,
  examples: [
    {
      input: "Our entire team can't log in since this morning. Production is blocked.",
      output: { intent: "bug-report", urgency: "high", suggestedAction: "Escalate to engineering immediately — service outage" },
    },
    {
      input: "Can you add dark mode to the dashboard?",
      output: { intent: "feature-request", urgency: "low", suggestedAction: "Add to feature backlog, send acknowledgement" },
    },
    {
      input: "I was charged twice on my last invoice.",
      output: { intent: "billing", urgency: "high", suggestedAction: "Forward to billing team, respond within 2 hours" },
    },
  ],
});

await classifyEmail("We'd like to upgrade to the enterprise plan. Can someone walk us through pricing?");
// → {
//     intent: "billing",
//     urgency: "medium",
//     suggestedAction: "Route to sales team — expansion opportunity"
//   }
```

#### Chain-of-thought reasoning

Add optional `reasoning` to examples to teach the model *why* — not just *what* — to output. Improves accuracy on ambiguous inputs.

```typescript
const parseSearch = ai.fn({
  model: "google/gemini-2.5-flash",
  system: "Extract structured search filters from natural language product queries.",
  schema: searchFiltersSchema,
  input: (query: string) => query,
  examples: [
    {
      input: "Cheap wireless headphones under $50 with noise cancelling",
      reasoning:
        '"Cheap" + "under $50" both indicate price constraint — map to maxPrice: 50. ' +
        '"Wireless" and "noise cancelling" are feature filters, not categories.',
      output: {
        categories: ["headphones"],
        filters: { wireless: true, noiseCancelling: true },
        priceRange: { max: 50 },
        queryText: { must: ["headphones"], should: ["wireless", "noise cancelling"], mustNot: [] },
      },
    },
  ],
});
```

Reasoning is rendered between **Input** and **Output** in the system prompt. Examples without `reasoning` work exactly as before — the field is fully optional.

### Reasoning mode

Enable extended thinking for models that support it. Control reasoning effort or set a max token budget.

```typescript
const analyzeContract = ai.fn({
  model: "anthropic/claude-opus-4",
  system: "Analyze complex legal contracts. Identify risks, obligations, and key terms.",
  schema: contractSchema,
  input: (doc: string) => doc,
  reasoning: { effort: "high" }, // extended thinking for complex tasks
});

// Or set a token budget for reasoning
const classify = ai.fn({
  model: "openai/o3",
  system: "Classify support tickets.",
  schema: ticketSchema,
  input: (text: string) => text,
  reasoning: { maxTokens: 2048 },
});
```

Effort levels: `xhigh`, `high`, `medium`, `low`, `minimal`, `none`. Passed through to the provider via `providerOptions` — models that don't support reasoning ignore it.

### Retry + fallback

Automatic retries with exponential backoff, then fallback to alternative models.

```typescript
const generateDescription = ai.fn({
  model: "anthropic/claude-sonnet-4",
  system: "Write compelling product descriptions. Be specific, highlight key features, avoid cliches.",
  schema: z.object({
    headline: z.string(),
    description: z.string(),
    highlights: z.array(z.string()).max(5),
  }),
  input: (product: { name: string; details: string }) =>
    `${product.name}\n\n${product.details}`,
  retries: 2,
  fallback: ["openai/gpt-4o", "google/gemini-2.5-pro"],
  // Claude fails → try gpt-4o (with retries) → try gemini (with retries) → AiFnError
});
```

<details>
<summary><strong>Error handling</strong> — inspect attempt history on failure</summary>

```typescript
import { AiFnError } from "funcai";

try {
  await generateDescription({ name: "Widget Pro", details: "..." });
} catch (error) {
  if (error instanceof AiFnError) {
    error.attempts;
    // → [
    //     { model: "anthropic/claude-sonnet-4", error: RateLimitError, durationMs: 1200 },
    //     { model: "openai/gpt-4o", error: TimeoutError, durationMs: 5000 },
    //     ...
    //   ]
  }
}
```

</details>

### Result caching

Cache repeatable AI functions with any async KV store. Caching is opt-in per function, and cache hits return before the provider or trace wrapper runs.

```typescript
import { createAiFn, createMemoryCache } from "funcai";
import { openrouter } from "funcai/providers/openrouter";

const ai = createAiFn({
  provider: openrouter(),
  cache: createMemoryCache(), // use Redis/KV/etc. in production
  cachePolicy: {
    namespace: "support-ai",
    ttlSeconds: 300,
  },
});

const classifyTicket = ai.fn({
  id: "classify-ticket",
  model: "anthropic/claude-sonnet-4",
  system: "Classify support tickets by intent and urgency.",
  schema: ticketSchema,
  input: (ticket: { subject: string; body: string }) =>
    `${ticket.subject}\n\n${ticket.body}`,
  cache: {
    ttlSeconds: 600,
    version: "schema-v1",
  },
});

await classifyTicket(ticket); // cache miss → provider call

const again = await classifyTicket.detailed(ticket);
again.cache?.hit; // true
again.usage; // { inputTokens: 0, outputTokens: 0 } on cache hits
```

The cache key hashes the effective generation request: function id, provider id, model, fallback list, final system prompt, full message chain, final user content, model params, provider options, and `cache.version`. It does not include trace IDs, user IDs, timestamps, latency, or retry metadata.

Use `version` as your cache-busting knob when the prompt meaning, output schema, or `transform` logic changes.

```typescript
await classifyTicket(ticket, {
  cacheControl: { bypass: true }, // skip cache read/write once
});
```

Cache hits skip PostHog AI tracing because no model call happens. Misses and bypassed calls trace normally.

### Detailed metadata

`.detailed()` returns output alongside usage, cost, latency, and trace context.

```typescript
const result = await classifyEmail.detailed("Our team can't access the API since this morning", {
  traceId: "req-abc-123",
  userId: "user_sarah",
  sessionId: "sess_8f3a1b",
  properties: { env: "production", feature: "email-triage", ticketId: "TKT-042" },
});
// → {
//     output: { intent: "bug-report", urgency: "high", suggestedAction: "Escalate..." },
//     model: "google/gemini-3.1-flash-lite-preview",
//     usage: { inputTokens: 142, outputTokens: 38 },
//     cost: 0.00018,
//     traceId: "req-abc-123",
//     latencyMs: 620,
//     attempts: 1,
//     cache: { hit: false, key: "support-ai:result:...", ttlSeconds: 600, ... },
//     providerMetadata: { ... },
//   }
```

<details>
<summary><strong>Post-process with transform</strong> — reshape or enrich output</summary>

`transform` receives the schema-validated output and original input. Can be async.

```typescript
const estimatePrice = ai.fn({
  model: "anthropic/claude-sonnet-4",
  system: "Estimate competitive market price based on product details and comparable items.",
  schema: z.object({
    estimatedPrice: z.number(),
    confidence: z.enum(["low", "medium", "high"]),
    reasoning: z.string(),
  }),
  input: (product: { name: string; msrp: number; category: string; condition: string }) =>
    `${product.name} — ${product.category}\nMSRP: $${product.msrp}\nCondition: ${product.condition}`,
  transform: (output, product) => ({
    ...output,
    productName: product.name,
    msrp: product.msrp,
    delta: output.estimatedPrice - product.msrp,
  }),
});

await estimatePrice({
  name: "Sony WH-1000XM5",
  msrp: 399,
  category: "Headphones",
  condition: "Like New",
});
// → {
//     estimatedPrice: 320,
//     confidence: "high",
//     reasoning: "Strong demand for XM5, like-new condition commands 80% of MSRP...",
//     productName: "Sony WH-1000XM5",
//     msrp: 399,
//     delta: -79
//   }
```

</details>

<details>
<summary><strong>Reusable prompts</strong> — <code>definePrompt()</code> with template variables</summary>

Separate prompt config from function logic. Supports `{{VARIABLE}}` injection — unresolved placeholders throw at runtime.

```typescript
const prompt = ai.definePrompt({
  id: "product-description",
  model: "google/gemini-3.1-flash-lite-preview",
  system: "Write a product description in {{LANGUAGE}} for the {{MARKET}} market. Tone: {{TONE}}.",
  temperature: 0.7,
});

const describeProduct = ai.fn({
  prompt,
  schema: z.object({ headline: z.string(), body: z.string(), callToAction: z.string() }),
  input: (details: string) => details,
});

const system = ai.injectVariables(prompt.system, { LANGUAGE: "English", MARKET: "US", TONE: "professional" });
// → "Write a product description in English for the US market. Tone: professional."
```

</details>

### Runnable demos

Full working examples in [`examples/`](./examples/):

| # | Script | What it shows |
|---|--------|---------------|
| 01 | `pnpm basic` | String in, structured output out |
| 02 | `pnpm prompt` | `definePrompt()` with template variables |
| 03 | `pnpm typed-input` | Typed complex input objects |
| 04 | `pnpm messages` | Multi-turn conversation history |
| 05 | `pnpm few-shots` | Few-shot examples for model guidance |
| 06 | `pnpm transform` | Post-process output with `transform()` |
| 07 | `pnpm detailed` | `.detailed()` with metadata, cost, tracing |
| 08 | `pnpm retry` | Retry, fallback, and `AiFnError` |
| 09 | `pnpm codegen` | CLI `generate` from `.prompt.md` files |
| 10 | `pnpm multimodal` | Images, PDFs, and `ContentPart[]` input |
| 11 | `pnpm scaffold` | CLI `scaffold` — bootstrap a feature folder |
| 12 | `pnpm lmstudio:vision` | LM Studio + Gemma 4 vision for handwritten recipe-card intake triage |
| 13 | `pnpm ollama:vision` | Ollama + Gemma 4 vision for bakery prep briefs |
| 14 | `pnpm local:multilingual` | Local Gemma 4 multilingual support triage |
| 17 | `pnpm cloudflare:basic` | Cloudflare AI Gateway + Workers AI structured ticket routing |
| 18 | `pnpm cloudflare:vision` | Cloudflare AI Gateway multimodal structured archive intake |

From `examples/`, set the relevant environment variables in your shell or CI,
then run the matching script:

```bash
pnpm basic              # most hosted examples need OPENROUTER_API_KEY
pnpm cloudflare:basic   # needs Cloudflare account credentials
pnpm lmstudio:vision    # needs LMSTUDIO_BASE_URL and LMSTUDIO_MODEL
pnpm ollama:vision      # needs OLLAMA_BASE_URL and OLLAMA_MODEL
pnpm local:multilingual # needs LOCAL_PROVIDER plus the selected local provider config
pnpm codegen            # no API key needed
pnpm scaffold           # no API key needed
```

For local-first workflows, the new examples are tuned around Gemma 4 because Google currently positions it for multimodal reasoning, agentic workflows, and multilingual experiences. See: [Gemma 4](https://deepmind.google/models/gemma/gemma-4/)

The easiest way to understand the new local providers is to run the three Gemma 4 examples in [`examples/`](./examples/). They are documented with exact commands, sample output from validated runs, and local-model caveats in [`examples/README.md`](./examples/README.md).

Validated local settings:

- LM Studio: `LMSTUDIO_BASE_URL=http://192.168.2.188:1234/v1`, `LMSTUDIO_MODEL=google/gemma-4-26b-a4b`, then `pnpm lmstudio:vision`.
- Ollama: `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=gemma4:latest`, then `pnpm ollama:vision`.
- Local multilingual: `LOCAL_PROVIDER=lmstudio` with the LM Studio settings above, then `pnpm local:multilingual`.

---

## CLI

### `funcai scaffold` — Generate a complete AI feature

Scaffolds a working feature folder with schema, prompt, few-shots, index, tests, and README.

```bash
npx funcai scaffold                    # interactive TUI (defaults work out of the box)
npx funcai scaffold --name invoice-parser --fields "vendor,amount,currency" -y
npx funcai scaffold --provider cloudflare --model @cf/meta/llama-3.3-70b-instruct-fp8-fast -y
npx funcai scaffold --provider ollama --model gemma4:latest -y
npx funcai scaffold -y                 # accept all defaults, no prompts
```

<details>
<summary><strong>Output structure</strong></summary>

```
classify-sentiment/
├── schema.ts                                  # Zod schema with .describe() annotations
├── few-shots.ts                               # Typed input/output examples
├── classify-sentiment.prompt.md               # System prompt (YAML frontmatter + markdown)
├── classify-sentiment.prompt.ts               # Auto-generated TypeScript from prompt.md
├── index.ts                                   # Callable ai.fn() with JSDoc
├── README.md                                  # Quick start guide
└── tests/
    ├── classify-sentiment.test.ts             # Unit: schema + few-shot validation
    ├── classify-sentiment.integration.test.ts # Integration: MockLanguageModelV3
    └── classify-sentiment.e2e.test.ts         # E2E: live API (skipped without key)
```

</details>

Flags: `--name`, `--provider`, `--fields`, `--model`, `--description`, `--posthog`, `--ai`, `-y`

### `funcai generate` — Prompt-as-code

Write system prompts in markdown, generate type-safe TypeScript modules.

```markdown
<!-- prompts/review-ticket.prompt.md -->
---
id: review-ticket
provider: openrouter
model: anthropic/claude-sonnet-4
temperature: 0.1
maxTokens: 200
---

You are a support ticket reviewer. Analyze the ticket for quality,
completeness, and urgency. Flag missing details and suggest next steps.
```

```bash
npx funcai generate prompts/           # one-time
npx funcai generate prompts/ --watch   # regenerate on save
```

```typescript
import { reviewTicket } from "./prompts/review-ticket.prompt";

const review = ai.fn({
  prompt: reviewTicket,
  schema: z.object({
    score: z.number().min(0).max(10),
    issues: z.array(z.string()),
    suggestion: z.string(),
  }),
  input: (description: string) => description,
});

await review("App crashes on login. Please fix.");
// → {
//     score: 3,
//     issues: ["No device/OS info", "No steps to reproduce", "No error message"],
//     suggestion: "Ask for device, OS version, and steps to reproduce the crash",
//   }
```

**Variants** for A/B testing: `review-ticket.concise.prompt.md` generates a group index with `getPrompt("concise")`.

---

## Testing

Built-in `.mock()` / `.unmock()` on every function. No test-runner dependency — works with Vitest, Jest, `node:test`.

```typescript
// Static mock — always returns this value
classifySentiment.mock({ sentiment: "positive", confidence: 0.95 });

await classifySentiment("anything");
// → { sentiment: "positive", confidence: 0.95 }

// Dynamic mock — output depends on input
classifySentiment.mock((text) => ({
  sentiment: text.includes("love") ? "positive" : "negative",
  confidence: 0.8,
}));

// Single-use queue — FIFO, then falls through to permanent mock or real call
classifySentiment.mockOnce({ sentiment: "positive", confidence: 1 });
classifySentiment.mockOnce({ sentiment: "negative", confidence: 0.9 });

await classifySentiment("a"); // → positive (from queue)
await classifySentiment("b"); // → negative (from queue)
await classifySentiment("c"); // → real LLM call (queue empty, no permanent mock)

// Cleanup
classifySentiment.unmock();
```

<details>
<summary><strong>Batch cleanup</strong> — track and unmock across tests</summary>

```typescript
import { track, unmockAll } from "funcai/test";

beforeEach(() => {
  track(classifySentiment).mock({ sentiment: "positive", confidence: 1 });
  track(analyzeReview).mock({ sentiment: "positive", topics: [], actionable: false, suggestedAction: "none" });
});

afterEach(() => unmockAll()); // unmocks all tracked functions, clears registry
```

</details>

<details>
<summary><strong>Validate few-shots</strong> — check examples against schema</summary>

```typescript
import { validateExamples } from "funcai/test";

validateExamples(examples, schema); // throws with descriptive error if any example mismatches
```

</details>

---

## Providers

Each provider has a focused setup guide:

- [OpenRouter](./src/provider/openrouter/README.md)
- [Cloudflare AI Gateway](./src/provider/cloudflare/README.md)
- [LM Studio](./src/provider/lmstudio/README.md)
- [Ollama](./src/provider/ollama/README.md)

**OpenRouter** ships built-in. Reads `OPENROUTER_API_KEY` from env or accepts it explicitly:

```typescript
import { openrouter } from "funcai/providers/openrouter";

createAiFn({ provider: openrouter() });
createAiFn({ provider: openrouter({ apiKey: "sk-or-..." }) });
```

<details>
<summary><strong>Response healing & usage accounting</strong> — enabled by default</summary>

- **Response healing** — auto-repairs malformed JSON responses before they reach your schema validation. Perfect for `generateObject` (all funcai calls are non-streaming).
- **Usage accounting** — surfaces cost, cached tokens, and reasoning tokens in `providerMetadata`. Extracted automatically by `.detailed()`.

Both can be opted out if needed:

```typescript
openrouter({ responseHealing: false, usage: false });
```

</details>

<details>
<summary><strong>Advanced options</strong> — headers, extraBody, provider features</summary>

```typescript
openrouter({
  headers: { "anthropic-beta": "fine-grained-tool-streaming-2025-05-14" },
  extraBody: { transforms: ["middle-out"] },
});
```

</details>

<details>
<summary><strong>Model registry</strong> — 55+ models with pricing and capabilities</summary>

Curated registry with typed IDs, pricing, modalities, and capabilities. The registry is baked into the package for deterministic DX, but arbitrary OpenRouter model IDs are still accepted at runtime. Use `pnpm update:models` to refresh from the OpenRouter API.

```typescript
import {
  OPENROUTER_MODELS,           // full registry with metadata
  OPENROUTER_MODEL_IDS,        // all model ID strings
  MULTIMODAL_IMAGE_MODELS,     // models accepting image input
  MULTIMODAL_FILE_MODELS,      // models accepting file/PDF input
  REASONING_MODELS,            // models with reasoning capabilities
} from "funcai/providers/openrouter";
```

</details>

**Cloudflare AI Gateway** ships built-in for Workers AI models that explicitly support structured output. Reads `CLOUDFLARE_ACCOUNT_ID` plus either `CLOUDFLARE_AI_GATEWAY_API_KEY` / `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_EMAIL` + `CLOUDFLARE_GLOBAL_API_KEY` from env. API tokens need `AI Gateway Read`, `AI Gateway Write`, `AI Gateway Run`, and `Workers AI Read`. Uses Cloudflare's auto-created `default` gateway unless you pass `gatewayId` or set `CLOUDFLARE_AI_GATEWAY_ID`.

```typescript
import { cloudflareAiGateway } from "funcai/providers/cloudflare";

createAiFn({ provider: cloudflareAiGateway() });
createAiFn({
  provider: cloudflareAiGateway({
    accountId: "your-account-id",
    gatewayId: "production",
    apiKey: "cf-token",
    gatewayOptions: {
      skipCache: false,
      cacheTtl: 3600,
      metadata: { feature: "classify-ticket" },
    },
  }),
});

createAiFn({
  provider: cloudflareAiGateway({
    accountId: "your-account-id",
    gatewayId: "production",
    email: "you@example.com",
    globalApiKey: "global-key",
  }),
});
```

Inside a Cloudflare Worker, pass the AI Gateway binding instead of account/token fields:

```typescript
createAiFn({
  provider: cloudflareAiGateway({
    binding: env.AI.gateway("production"),
  }),
});
```

The Cloudflare model type is strict: `CloudflareModelId` only includes non-deprecated Workers AI text-generation models whose Cloudflare docs explicitly document structured output through the JSON Mode supported-model list or model-page controls such as `response_format` and `guided_json`. Multimodal models are included when they pass that same structured-output gate.

```typescript
import {
  CLOUDFLARE_MODELS,
  CLOUDFLARE_MODEL_IDS,
  CLOUDFLARE_MULTIMODAL_IMAGE_MODELS,
  CLOUDFLARE_REASONING_MODELS,
  CLOUDFLARE_TOOL_CALLING_MODELS,
} from "funcai/providers/cloudflare";
```

Use `pnpm update:cloudflare-models --write` to refresh the generated registry from Cloudflare docs.

**LM Studio** ships built-in via the OpenAI-compatible local server:

```typescript
import { lmstudio } from "funcai/providers/lmstudio";

createAiFn({ provider: lmstudio() });
createAiFn({
  provider: lmstudio({
    baseURL: "http://192.168.2.188:1234/v1",
  }),
});
```

LM Studio structured output works with schema-based JSON responses. In local testing, the server accepted `response_format.type: "json_schema"` and rejected `"json_object"`, so `funcai` should continue to rely on schema-driven object generation instead of JSON-object mode shortcuts.

In local testing with Gemma 4 vision, smaller schemas were more reliable than OCR-heavy ones. See the local intake-triage example in [`examples/src/12-lmstudio-gemma4-vision.ts`](./examples/src/12-lmstudio-gemma4-vision.ts) and the full walkthrough in [`examples/README.md`](./examples/README.md).

**Ollama** ships built-in via the local Ollama API:

```typescript
import { ollama } from "funcai/providers/ollama";

createAiFn({ provider: ollama() });
createAiFn({
  provider: ollama({
    baseURL: "http://127.0.0.1:11434",
  }),
});
```

See the local Gemma 4 examples in [`examples/src/13-ollama-gemma4-vision.ts`](./examples/src/13-ollama-gemma4-vision.ts) and [`examples/src/14-local-gemma4-multilingual.ts`](./examples/src/14-local-gemma4-multilingual.ts), plus the exact commands and sample output in [`examples/README.md`](./examples/README.md).

<details>
<summary><strong>Custom provider</strong> — wrap any AI SDK-compatible model</summary>

```typescript
import { createProvider } from "funcai";
import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createProvider(({ modelId }) =>
  createAnthropic({ apiKey: "sk-ant-..." })(modelId)
);
createAiFn({ provider: anthropic });
```

</details>

---

## Tracing

### PostHog

```bash
pnpm add posthog-node @posthog/ai
```

```typescript
import { posthog } from "funcai/trace/posthog";

const ai = createAiFn({
  provider: openrouter(),
  trace: posthog("phc_your_project_key"),
});

// userId, sessionId, and properties from .detailed() flow into PostHog automatically
await classify.detailed("input", {
  userId: "user_2xK9mQ",       // → posthogDistinctId
  sessionId: "sess_8f3a1b",    // → $ai_session_id
  properties: { env: "prod" }, // → custom event properties
});
```

<details>
<summary><strong>Bring your own client</strong> — control flush/shutdown</summary>

By default, the plugin creates an internal PostHog client. Pass your own to control its lifecycle — useful in tests, serverless, or anywhere you need to guarantee events flush before exit.

```typescript
import { PostHog } from "posthog-node";
import { posthog } from "funcai/trace/posthog";

const ph = new PostHog("phc_your_project_key", { host: "https://eu.i.posthog.com" });

const ai = createAiFn({
  provider: openrouter(),
  trace: posthog({ apiKey: "phc_your_project_key", client: ph }),
});

// When done (e.g. afterAll in tests, or before process exit):
await ph.shutdown();
```

</details>

<details>
<summary><strong>Custom trace plugin</strong> — bring your own observability</summary>

```typescript
import type { TracePlugin } from "funcai";

const myTrace: TracePlugin = {
  wrap: (model, context) => {
    // context: { traceId, model, feature, userId?, sessionId?, properties? }
    return myObservabilityWrapper(model, context);
  },
};

createAiFn({ provider: openrouter(), trace: myTrace });
```

</details>

---

## API Reference

### `ai.fn(options)` — all options

`schema` and `input` are always required. Provide either `model` + `system` or `prompt` — not both.

<details>
<summary><strong>model + system + prompt</strong></summary>

#### `id` *(recommended)* — stable feature id

Used for tracing and cache keys when no `prompt` is provided.

```typescript
id: "classify-ticket"
```

#### `model` *(required\*)* — OpenRouter model ID

```typescript
model: "anthropic/claude-sonnet-4"
model: "google/gemini-3.1-flash-lite-preview"          // cheaper, faster
model: "google/gemini-2.5-flash"     // vision + PDF support
```

#### `system` *(required\*)* — System prompt

```typescript
system: "You are a product review analyst. Extract actionable insights from customer feedback."
```

> \* `model` and `system` are required unless you provide `prompt`, which bundles both.

#### `prompt` *(optional)* — Reusable prompt config (replaces `model` + `system`)

```typescript
const reviewPrompt = ai.definePrompt({
  id: "review-analysis",
  model: "google/gemini-3.1-flash-lite-preview",
  system: "Analyze customer reviews for the {{CATEGORY}} department.",
  temperature: 0.2,
  maxTokens: 500,
});

const analyze = ai.fn({ prompt: reviewPrompt, schema, input });
```

</details>

<details>
<summary><strong>schema</strong> — Zod output schema</summary>

```typescript
schema: z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
  topics: z.array(z.string()).max(5),
  actionable: z.boolean(),
})
```

</details>

<details>
<summary><strong>input</strong> — transform input data into a user message</summary>

String for text-only, `ContentPart[]` for multimodal:

```typescript
// Simple string
input: (text: string) => text

// Typed object → formatted string
input: (review: { title: string; body: string; rating: number }) =>
  `Title: ${review.title}\nRating: ${review.rating}/5\n\n${review.body}`

// Multimodal — image + text
input: (data: { imageUrl: string; notes: string }) => [
  { type: "text" as const, text: data.notes },
  { type: "image" as const, image: data.imageUrl },
]

// Multimodal — PDF
input: (pdfUrl: string) => [
  { type: "text" as const, text: "Extract key details:" },
  { type: "file" as const, data: new URL(pdfUrl), mediaType: "application/pdf" },
]
```

Part types: `TextPart`, `ImagePart`, `FilePart`, `AudioPart`. Binary input uses `Uint8Array | ArrayBuffer`; URL input uses `string | URL`.

</details>

<details>
<summary><strong>examples</strong> — few-shot input/output pairs with optional reasoning</summary>

Injected into the system prompt. Use `{{FEW_SHOTS}}` in the prompt to control placement. Add `reasoning` to teach the model *why* — rendered between Input and Output.

```typescript
examples: [
  {
    input: "App crashes every time I open settings on iOS 18.",
    reasoning: "Specific device/OS mentioned, reproducible steps — this is a high-urgency bug.",
    output: { category: "bug", urgency: "high", suggestedAction: "Escalate to mobile team" },
  },
  {
    input: "Would be nice to have dark mode.",
    output: { category: "feature-request", urgency: "low", suggestedAction: "Add to backlog" },
  },
]
```

</details>

<details>
<summary><strong>messages</strong> — conversation history</summary>

Static array or dynamic function. Prepended before the final user message.

```typescript
// Static context
messages: [
  { role: "user", content: "I'm looking at products in the electronics category." },
  { role: "assistant", content: "I'll focus on electronics pricing and features." },
]

// Dynamic — built from input
messages: (input: { history: Array<{ role: "user" | "assistant"; content: string }>; query: string }) =>
  input.history
```

</details>

<details>
<summary><strong>transform</strong> — post-process validated output</summary>

Receives the schema-validated output and the original input. Can be async.

```typescript
// Sort results by score
transform: (output, input) =>
  output.rankings.sort((a, b) => b.score - a.score)

// Enrich with input data
transform: (output, product) => ({
  ...output,
  productName: product.name,
  pricePerUnit: product.price / product.quantity,
})

// Async — fetch additional data
transform: async (output, input) => {
  const related = await fetchRelatedProducts(output.category);
  return { ...output, related };
}
```

</details>

<details>
<summary><strong>cache</strong> — opt-in result caching</summary>

Provide `cache` to `createAiFn`, then opt in per function.

```typescript
const ai = createAiFn({
  provider: openrouter(),
  cache: createMemoryCache(),
  cachePolicy: { namespace: "support-ai", ttlSeconds: 300 },
});

const classify = ai.fn({
  id: "classify-ticket",
  model,
  system,
  schema,
  input,
  cache: { ttlSeconds: 600, version: "v1" },
});
```

`cache: true` uses the factory policy. Function-level settings override factory settings. Per-call `cacheControl.ttlSeconds` overrides both for that write.

Only successful post-transform outputs are cached. Errors are never cached.

</details>

<details>
<summary><strong>reasoning</strong> — extended thinking mode</summary>

Enable reasoning/thinking for models that support it (Claude Opus, OpenAI o-series, DeepSeek R1, etc.).

```typescript
// By effort level
reasoning: { effort: "high" }   // xhigh | high | medium | low | minimal | none

// By token budget
reasoning: { maxTokens: 4096 }
```

Passed as `providerOptions.openrouter.reasoning` to `generateObject`. Models without reasoning support ignore it.

</details>

<details>
<summary><strong>retries + fallback</strong> — resilience options</summary>

#### `retries` — retry count per model

Exponential backoff with jitter (500ms–5s). Only retryable errors trigger retries (429, 5xx, network).

```typescript
retries: 3    // 3 retries = 4 total attempts per model
retries: 0    // no retries, fail immediately
```

#### `fallback` — fallback model IDs

Tried in order after the primary model exhausts all retries.

```typescript
fallback: ["openai/gpt-4o", "google/gemini-2.5-pro"]
// Primary fails → try gpt-4o (with retries) → try gemini (with retries) → AiFnError
```

</details>

### `.detailed()` — full generation metadata

Returns output alongside usage, cost, latency, cache status, and trace context. Trace fields flow into your tracing plugin (e.g. PostHog).

```typescript
const result = await classifySentiment.detailed("The customer service was incredibly helpful", {
  traceId: "req-abc-123",          // correlate with request logs
  userId: "user_2xK9mQ",           // → posthogDistinctId
  sessionId: "sess_8f3a1b",        // groups calls within a session
  properties: {                     // custom metadata for your trace
    env: "production",
    feature: "feedback-analysis",
  },
  cacheControl: { bypass: false },   // optional: bypass or override ttlSeconds
});
// → {
//     output: { sentiment: "positive", confidence: 0.92 },
//     model: "anthropic/claude-sonnet-4",
//     usage: { inputTokens: 38, outputTokens: 12 },
//     cost: 0.00042,              // USD — when provider reports it (e.g. OpenRouter)
//     traceId: "req-abc-123",
//     latencyMs: 740,
//     attempts: 1,
//     providerMetadata: { ... },  // raw provider data (OpenRouter cost breakdown, etc.)
//   }
```

`cost` is extracted from `providerMetadata` when available. OpenRouter always includes it; other providers return `undefined`.

---

## Exports

| Path | Exports |
|------|---------|
| `funcai` | `createAiFn`, `createMemoryCache`, `AiFnError`, `definePrompt`, `createProvider`, `buildSystemPrompt`, `formatExamples`, `injectVariables`, cache types |
| `funcai/providers/lmstudio` | `lmstudio` |
| `funcai/providers/ollama` | `ollama` |
| `funcai/providers/openrouter` | `openrouter` |
| `funcai/providers/cloudflare` | `cloudflareAiGateway`, `CloudflareModelId`, `CLOUDFLARE_MODELS`, `CLOUDFLARE_MODEL_IDS`, Cloudflare model subsets |
| `funcai/trace/posthog` | `posthog` |
| `funcai/test` | `track`, `unmockAll`, `isMocked`, `validateExamples` |

## Requirements

- Node.js >= 20
- zod >= 3.22 (peer dependency)
- posthog-node + @posthog/ai (optional, for tracing)
- ESM and CJS supported

For internals and design decisions, see [HOW-IT-WORKS.md](./HOW-IT-WORKS.md).
