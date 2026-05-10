# OpenRouter Provider

Use OpenRouter when you want a hosted model router with typed model metadata, response healing, usage accounting, multimodal model discovery, and provider-specific reasoning options.

## Import

```ts
import { createAiFn } from "funcai";
import { openrouter } from "funcai/providers/openrouter";

const ai = createAiFn({
  provider: openrouter(),
});
```

## Configure

Set an API key in the environment:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Or pass it explicitly:

```ts
const ai = createAiFn({
  provider: openrouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  }),
});
```

The provider initializes lazily on the first model call, so missing credentials fail when the function runs rather than at import time.

## Advanced options

```ts
const ai = createAiFn({
  provider: openrouter({
    headers: {
      "anthropic-beta": "fine-grained-tool-streaming-2025-05-14",
    },
    extraBody: {
      transforms: ["middle-out"],
    },
    responseHealing: true,
    usage: true,
  }),
});
```

`responseHealing` is enabled by default and asks OpenRouter to repair malformed structured JSON responses before funcai validates the schema. `usage` is also enabled by default and exposes provider cost and token metadata through `.detailed()`.

Disable either option only when you need to inspect raw provider behavior:

```ts
openrouter({ responseHealing: false, usage: false });
```

## Model IDs

OpenRouter accepts arbitrary runtime model IDs, but funcai also ships a typed registry for better discovery:

```ts
import {
  OPENROUTER_MODEL_IDS,
  OPENROUTER_MODELS,
  MULTIMODAL_FILE_MODELS,
  MULTIMODAL_IMAGE_MODELS,
  REASONING_MODELS,
} from "funcai/providers/openrouter";
```

Use `pnpm update:models` from this repo to refresh the generated registry from OpenRouter.

## Structured output

All funcai calls use schema-backed object generation. Pick models that support structured output reliably, especially for production workflows. Response healing helps with near-miss JSON, but it should not be treated as a substitute for a model that follows schemas well.

## Smoke test

```bash
OPENROUTER_API_KEY=sk-or-... pnpm exec vitest run --config vitest.e2e.config.ts tests/e2e/openrouter-live.test.ts
```

The examples package also includes OpenRouter examples:

```bash
OPENROUTER_API_KEY=sk-or-... pnpm -C examples all
```

## Troubleshooting

- `OPENROUTER_API_KEY is required`: set `OPENROUTER_API_KEY` or pass `openrouter({ apiKey })`.
- Schema parse failures: use a structured-output-capable model, keep the schema smaller, or keep response healing enabled.
- Missing cost metadata: keep `usage: true` and call `.detailed()` so provider metadata is surfaced.
