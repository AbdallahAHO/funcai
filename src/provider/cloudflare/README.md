# Cloudflare AI Gateway Provider

Use Cloudflare AI Gateway when you want funcai to call Workers AI through Gateway while keeping strict model IDs limited to models that explicitly support structured output.

The provider supports two runtime paths:

- OpenAI-compatible HTTP Gateway: works in Node.js, CLIs, servers, and local examples.
- Workers AI Gateway binding: works inside Cloudflare Workers with `env.AI.gateway(...)`.

## Import

```ts
import { createAiFn } from "funcai";
import { cloudflareAiGateway } from "funcai/providers/cloudflare";

const ai = createAiFn({
  provider: cloudflareAiGateway(),
});
```

## Configure with an API token

Set `CLOUDFLARE_ACCOUNT_ID`, optional `CLOUDFLARE_AI_GATEWAY_ID`, and
`CLOUDFLARE_API_TOKEN` in your shell, CI environment, or process manager.

`CLOUDFLARE_AI_GATEWAY_ID` is optional. The provider falls back to Cloudflare's `default` gateway.

API tokens should include these account-scoped permissions:

- `AI Gateway Read`
- `AI Gateway Write`
- `AI Gateway Run`
- `Workers AI Read`

Then configure:

```ts
const ai = createAiFn({
  provider: cloudflareAiGateway({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId: process.env.CLOUDFLARE_AI_GATEWAY_ID,
    apiKey: process.env.CLOUDFLARE_API_TOKEN,
  }),
});
```

The env fallback order for token auth is:

```text
CLOUDFLARE_AI_GATEWAY_API_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_AUTH_TOKEN
```

Blank env vars are ignored, so an empty higher-priority variable will not mask a valid lower-priority token.

## Configure with a Global API Key

The Cloudflare Global API Key is not a Bearer token. Use it with the account email:

Set `CLOUDFLARE_ACCOUNT_ID`, optional `CLOUDFLARE_AI_GATEWAY_ID`,
`CLOUDFLARE_EMAIL`, and `CLOUDFLARE_GLOBAL_API_KEY`.

```ts
const ai = createAiFn({
  provider: cloudflareAiGateway({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    gatewayId: process.env.CLOUDFLARE_AI_GATEWAY_ID,
    email: process.env.CLOUDFLARE_EMAIL,
    globalApiKey: process.env.CLOUDFLARE_GLOBAL_API_KEY,
  }),
});
```

The provider sends Global API Key runtime requests with `X-Auth-Email` and `X-Auth-Key`, matching Cloudflare's API authentication contract.

## Configure inside a Worker

Use the Workers AI Gateway binding instead of account credentials:

```ts
const ai = createAiFn({
  provider: cloudflareAiGateway({
    binding: env.AI.gateway("production"),
  }),
});
```

Binding mode is the right choice when the code already runs in Workers and has an `AI` binding available.

## Gateway options

```ts
const ai = createAiFn({
  provider: cloudflareAiGateway({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiKey: process.env.CLOUDFLARE_API_TOKEN,
    gatewayOptions: {
      skipCache: false,
      cacheTtl: 3600,
      metadata: { feature: "classify-ticket" },
      requestTimeoutMs: 5000,
      retries: {
        maxAttempts: 3,
        retryDelayMs: 100,
        backoff: "exponential",
      },
    },
  }),
});
```

`headers`, `queryParams`, and `providerApiKey` are also available for advanced Gateway or upstream-provider setups. Workers AI normally does not need a separate `providerApiKey`.

## Model IDs

`CloudflareModelId` is intentionally strict. It only includes non-deprecated Workers AI text-generation models whose Cloudflare docs explicitly document structured-output support through JSON Mode or model-page structured-output controls.

```ts
import {
  CLOUDFLARE_MODEL_IDS,
  CLOUDFLARE_MODELS,
  CLOUDFLARE_MULTIMODAL_IMAGE_MODELS,
  CLOUDFLARE_REASONING_MODELS,
  CLOUDFLARE_TOOL_CALLING_MODELS,
  type CloudflareModelId,
} from "funcai/providers/cloudflare";
```

Multimodal models are included only when they pass the same structured-output gate.

Refresh the generated registry from Cloudflare docs with:

```bash
pnpm update:cloudflare-models --write
```

## Structured output

All funcai Cloudflare calls go through schema-backed object generation. The HTTP Gateway path uses the OpenAI-compatible endpoint:

```text
https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/compat
```

Cloudflare may return structured responses with `message.content` already encoded as an object for some models. The provider normalizes that response shape before AI SDK validation so funcai still receives the schema-backed object.

## Smoke test

Token auth:

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and optional
`CLOUDFLARE_AI_GATEWAY_ID`, then run `pnpm -C examples cloudflare:basic`.

Global API Key auth:

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_EMAIL`, `CLOUDFLARE_GLOBAL_API_KEY`,
and optional `CLOUDFLARE_AI_GATEWAY_ID`, then run `pnpm -C examples cloudflare:basic`.

Multimodal structured-output smoke:

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and optional
`CLOUDFLARE_AI_GATEWAY_ID`, then run `pnpm -C examples cloudflare:vision`.

## Troubleshooting

- `CLOUDFLARE_ACCOUNT_ID is required`: set `CLOUDFLARE_ACCOUNT_ID` or pass `accountId`.
- `Cloudflare AI Gateway auth is required`: set an API token or both `CLOUDFLARE_EMAIL` and `CLOUDFLARE_GLOBAL_API_KEY`.
- `Authentication error` with a Global API Key: do not pass it as `apiKey`; pass `email` and `globalApiKey`.
- `Authentication error` with a freshly created API token: wait for Cloudflare token propagation and make sure `AI Gateway Run` and `Workers AI Read` are included.
- Schema parse failures: use a model from `CLOUDFLARE_MODEL_IDS`, prefer the Llama 3.3 JSON-mode default for text examples, and keep prompts explicit about returning only JSON.
