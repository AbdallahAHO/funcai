# Ollama Provider

Use Ollama when you want funcai to call local models through the Ollama API.

## Import

```ts
import { createAiFn } from "funcai";
import { ollama } from "funcai/providers/ollama";

const ai = createAiFn({
  provider: ollama(),
});
```

## Configure Ollama

Install and start Ollama, then pull a model:

```bash
ollama pull gemma4:latest
```

The default base URL is:

```text
http://127.0.0.1:11434
```

Use the default local server:

```ts
const ai = createAiFn({
  provider: ollama(),
});
```

Or point at another host:

```ts
const ai = createAiFn({
  provider: ollama({
    baseURL: "http://192.168.2.188:11434",
  }),
});
```

Optional advanced fields:

```ts
ollama({
  baseURL: "http://127.0.0.1:11434",
  apiKey: "optional-proxy-key",
  headers: { "x-local-run": "dev" },
  fetch: customFetch,
});
```

## Model IDs

Ollama model IDs are local strings, so `OllamaModelId` is intentionally open:

```ts
const classify = ai.fn({
  model: "gemma4:latest",
  // ...
});
```

Set `OLLAMA_MODEL` in examples when your local model ID differs.

## Structured output

All funcai calls use schema-backed object generation. Model reliability depends on the local model and quantization. Strong instruction-following models with native JSON support are the best fit.

For multimodal examples, use a model that actually accepts image input through your installed Ollama version.

## Smoke test

Start Ollama, pull the model, then run:

Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL`, then run `pnpm exec vitest run --config vitest.e2e.config.ts tests/e2e/ollama-live.test.ts`.

Examples:

Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL`, then run `pnpm -C examples ollama:vision`.

## Troubleshooting

- Connection refused: start Ollama and confirm the base URL does not include `/v1`.
- Model not found: run `ollama pull <model>` or use an installed model from `ollama list`.
- Schema parse failures: use a stronger model, simplify the schema, add few-shots, or lower prompt ambiguity.
- Multimodal input fails: confirm the selected model and installed Ollama version support image input.
