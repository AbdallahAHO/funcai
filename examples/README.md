# funcai examples

Working examples for every `funcai` pattern. Each file is standalone and runnable.

## Setup

```bash
cd examples
pnpm install
export OPENROUTER_API_KEY=sk-or-your-key-here
```

## Run

```bash
pnpm basic           # 01 — String in, structured output
pnpm prompt          # 02 — definePrompt + fn
pnpm typed-input     # 03 — Typed object input
pnpm messages        # 04 — Message chains (static + dynamic)
pnpm few-shots       # 05 — Few-shot examples
pnpm transform       # 06 — Post-processing transforms
pnpm detailed        # 07 — .detailed() metadata output
pnpm retry           # 08 — Retry + fallback + AiFnError
pnpm codegen         # 09 — CLI codegen demo (no API key needed)
pnpm all             # Run examples 01-07 in sequence
```

## Examples

| # | File | Pattern | API Key |
|---|------|---------|---------|
| 01 | `01-basic.ts` | Minimal: string input, Zod schema, structured output | Yes |
| 02 | `02-define-prompt.ts` | Reusable prompt config with `definePrompt()` | Yes |
| 03 | `03-typed-input.ts` | Typed object input with `input:` function | Yes |
| 04 | `04-message-chain.ts` | Static and dynamic message chains | Yes |
| 05 | `05-few-shots.ts` | Few-shot examples for guided output | Yes |
| 06 | `06-transform.ts` | Sync and async post-processing | Yes |
| 07 | `07-detailed.ts` | `.detailed()` for usage, latency, model info | Yes |
| 08 | `08-retry-fallback.ts` | Retry logic, fallback models, `AiFnError` | Yes |
| 09 | `09-cli-codegen.ts` | CLI prompt codegen from markdown | No |
