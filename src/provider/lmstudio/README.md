# LM Studio Provider

Use LM Studio when you want funcai to call a local OpenAI-compatible server running on your machine or LAN.

## Import

```ts
import { createAiFn } from "funcai";
import { lmstudio } from "funcai/providers/lmstudio";

const ai = createAiFn({
  provider: lmstudio(),
});
```

## Configure LM Studio

In LM Studio:

1. Download a model that supports structured JSON well.
2. Open the local server tab.
3. Start the OpenAI-compatible server.
4. Copy the model ID exactly as LM Studio exposes it.

The default base URL is:

```text
http://127.0.0.1:1234/v1
```

Use the default local server:

```ts
const ai = createAiFn({
  provider: lmstudio(),
});
```

Or point at another host:

```ts
const ai = createAiFn({
  provider: lmstudio({
    baseURL: "http://192.168.2.188:1234/v1",
  }),
});
```

Optional advanced fields:

```ts
lmstudio({
  baseURL: "http://127.0.0.1:1234/v1",
  apiKey: "not-required-by-default",
  headers: { "x-local-run": "dev" },
  queryParams: { source: "funcai" },
  fetch: customFetch,
});
```

## Model IDs

LM Studio model IDs are local strings, so `LMStudioModelId` is intentionally open:

```ts
const describeImage = ai.fn({
  model: "google/gemma-4-26b-a4b",
  // ...
});
```

Set `LMSTUDIO_MODEL` in examples when your local model ID differs.

## Structured output

The provider sets `supportsStructuredOutputs: true` and uses AI SDK schema-backed object generation. In local testing, LM Studio accepted JSON Schema style structured responses and rejected `response_format.type: "json_object"`, so funcai should keep using schema-backed object generation rather than JSON-object shortcuts.

Local models vary heavily. Smaller schemas and direct prompts are more reliable than broad extraction tasks, especially for OCR-heavy multimodal work.

## Smoke test

Start the LM Studio server, then run:

Set `LMSTUDIO_BASE_URL` and `LMSTUDIO_MODEL`, then run `pnpm exec vitest run --config vitest.e2e.config.ts tests/e2e/lmstudio-live.test.ts`.

Examples:

Set `LMSTUDIO_BASE_URL` and `LMSTUDIO_MODEL`, then run `pnpm -C examples lmstudio:vision`.

## Troubleshooting

- Connection refused: start the LM Studio local server and confirm the base URL includes `/v1`.
- Model not found: use the exact model ID shown by LM Studio.
- Schema parse failures: use a stronger local model, simplify the schema, reduce OCR-heavy prompts, or add narrower few-shot examples.
- Slow responses: use a smaller quantization, reduce context, or increase LM Studio server resources.
