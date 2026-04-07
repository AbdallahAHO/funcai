# funcai examples

Working examples for every `funcai` pattern. Each file is standalone and runnable.

## Setup

```bash
cd examples
pnpm install
export OPENROUTER_API_KEY=sk-or-your-key-here
export LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
export LMSTUDIO_MODEL=google/gemma-4-26b-a4b
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=gemma4:latest
```

Local Gemma 4 examples target the new built-in providers:
- `lmstudio()` for LM Studio's OpenAI-compatible server
- `ollama()` for Ollama's local API

These examples are designed to validate two things in realistic flows:
- vision + structured object generation from a real image
- multilingual local-first ticket triage without a hosted provider

## Quick local run

Use these exact commands if your setup matches the one we validated against:

```bash
cd examples
LMSTUDIO_BASE_URL=http://192.168.2.188:1234/v1 \
LMSTUDIO_MODEL=google/gemma-4-26b-a4b \
pnpm lmstudio:vision

OLLAMA_BASE_URL=http://127.0.0.1:11434 \
OLLAMA_MODEL=gemma4:latest \
pnpm ollama:vision

LOCAL_PROVIDER=lmstudio \
LMSTUDIO_BASE_URL=http://192.168.2.188:1234/v1 \
LMSTUDIO_MODEL=google/gemma-4-26b-a4b \
pnpm local:multilingual
```

If your servers are bound to localhost instead, replace the base URLs with:
- `http://127.0.0.1:1234/v1` for LM Studio
- `http://127.0.0.1:11434` for Ollama

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
pnpm multimodal      # 10 — Hosted multimodal demo
pnpm scaffold        # 11 — CLI scaffold demo
pnpm lmstudio:vision # 12 — LM Studio + Gemma 4 archive OCR from image
pnpm ollama:vision   # 13 — Ollama + Gemma 4 production brief from image
pnpm local:multilingual # 14 — Local Gemma 4 multilingual ticket triage
pnpm local:all       # Run the local-provider examples in sequence
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
| 10 | `10-multimodal.ts` | Hosted multimodal extraction with images and PDFs | Yes |
| 11 | `11-scaffold.ts` | Scaffold command walkthrough | No |
| 12 | `12-lmstudio-gemma4-vision.ts` | LM Studio + Gemma 4 vision for archival recipe-card intake triage | Local LM Studio |
| 13 | `13-ollama-gemma4-vision.ts` | Ollama + Gemma 4 vision for bakery prep briefs | Local Ollama |
| 14 | `14-local-gemma4-multilingual.ts` | Switchable local Gemma 4 multilingual support triage | Local LM Studio or Ollama |

## Gemma 4 local workflows

Google positions Gemma 4 around multimodal reasoning, agentic workflows, and support for 140 languages. These local examples focus on the parts `funcai` is best suited to today:
- vision input with structured object generation
- multilingual text understanding into typed operational output

See the model overview here: [Gemma 4](https://deepmind.google/models/gemma/gemma-4/)

## Exact use-cases

### 12. LM Studio + Gemma 4 vision

Use-case:
A food archive intake team wants a fast decision about whether a scanned recipe
card is readable enough to archive now or should be queued for manual review.

Run:

```bash
LMSTUDIO_BASE_URL=http://192.168.2.188:1234/v1 \
LMSTUDIO_MODEL=google/gemma-4-26b-a4b \
pnpm lmstudio:vision
```

Sample output from a validated run:

```json
{
  "documentType": "handwritten_recipe_card",
  "recipeTitle": "200 year-old Pound-cake Recipe",
  "legibility": "clear",
  "needsHumanReview": false
}
```

What this demonstrates:
- `funcai` can send image input to LM Studio's OpenAI-compatible endpoint.
- The response is validated against a Zod schema and returned as typed JSON.
- A local Gemma 4 model can power archive intake without a hosted provider.

### 13. Ollama + Gemma 4 vision

Use-case:
A bakery operations team wants a production brief from a handwritten recipe
before a baker recreates it for a live batch.

Run:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 \
OLLAMA_MODEL=gemma4:latest \
pnpm ollama:vision
```

Sample output from a validated run:

```json
{
  "recipeName": "200 Year-Old Pound Cake Recipe",
  "coreIngredients": [
    "1 lb. of sugar",
    "1 lb. of flour",
    "1 lb. of butter (scant)",
    "9 large eggs"
  ],
  "operatorSummary": "Mix sugar and butter until creamy. Beat in the eggs. Gradually mix in the flour. Finally, add stiffly beaten egg whites, flavoring with lemon extract. Bake in a fluted cake pan for at least one hour. Ice and cover with English walnut halves.",
  "possibleRisks": [
    "The term '(scant)' for butter needs clarification (weight vs. visual measurement).",
    "The mixing process order is detailed, but precise creaming/beating times are not specified."
  ],
  "needsHumanReview": true
}
```

What this demonstrates:
- Ollama works with the same `createAiFn()` flow as hosted providers.
- Gemma 4 can do richer vision extraction locally and still produce typed output.
- The schema makes the "human review" handoff explicit instead of burying it in prose.

### 14. Local Gemma 4 multilingual triage

Use-case:
A support team wants to classify inbound tickets locally and preserve the
customer's original language in the response workflow.

Run with LM Studio:

```bash
LOCAL_PROVIDER=lmstudio \
LMSTUDIO_BASE_URL=http://192.168.2.188:1234/v1 \
LMSTUDIO_MODEL=google/gemma-4-26b-a4b \
pnpm local:multilingual
```

Run with Ollama:

```bash
LOCAL_PROVIDER=ollama \
OLLAMA_BASE_URL=http://127.0.0.1:11434 \
OLLAMA_MODEL=gemma4:latest \
pnpm local:multilingual
```

Sample output from a validated LM Studio run:

```json
{
  "detectedLanguage": "es",
  "intent": "technical",
  "severity": "high",
  "needsHumanResponseInOriginalLanguage": true,
  "internalSummary": "Customer is unable to upload invoices in the admin panel; loading screen hangs. Impacting month-end closing for multiple clients. Critical urgency.",
  "suggestedQueue": "support-tech"
}
```

What this demonstrates:
- The same `funcai` feature can switch providers with an env var.
- Gemma 4 can do multilingual routing into a strict operational schema.
- Local-first support triage works without shipping customer text to a remote API.

## Local LLM caveats and what we learned

- LM Studio on this machine exposed both a native API and an OpenAI-compatible API. `funcai` uses the OpenAI-compatible base URL: `http://192.168.2.188:1234/v1`.
- LM Studio accepted schema-based structured output and rejected JSON-object mode in our validation. In practice, that means local LM Studio examples should stay on schema-driven object generation.
- LM Studio + Gemma 4 vision was more reliable with compact schemas and short prompts. The first, more OCR-heavy version produced truncated malformed JSON. The final intake-triage version passed consistently.
- Ollama + Gemma 4 handled a larger vision extraction schema cleanly in local testing, but handwriting ambiguity still made `needsHumanReview` the right operational outcome.
- Local multimodal runs are more sensitive to token limits and image complexity than most hosted APIs. If a schema is too ambitious, reduce fields first before blaming the provider wiring.
- Sample output can vary slightly between runs even when the schema is stable, especially on local models. Treat the JSON shape as the contract and the prose fields as representative.
- The vLLM Gemma 4 recipe documents dynamic vision resolution, structured outputs via JSON Schema, thinking mode, and tool calling. That suggests a clear next step for advanced local setups: if you serve Gemma 4 through a vLLM OpenAI-compatible endpoint, higher vision token budgets can help detailed image understanding, and JSON Schema remains the right constraint mechanism. Source: [Gemma 4 Usage Guide - vLLM Recipes](https://docs.vllm.ai/projects/recipes/en/latest/Google/Gemma4.html)
