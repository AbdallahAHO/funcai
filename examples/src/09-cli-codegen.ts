/**
 * 09 — CLI codegen demo: shows what the generated code looks like.
 *
 * In a real project you would:
 *   1. Create prompts/my-feature.prompt.md
 *   2. Run: npx funcai generate prompts/
 *   3. Import the generated module
 *
 * This example creates a temp prompt file, generates it, and shows the output.
 *
 * Run: pnpm codegen (no API key needed)
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const promptDir = join(import.meta.dirname, '../.tmp-prompts');

// Create sample prompt files
mkdirSync(promptDir, { recursive: true });

writeFileSync(
  join(promptDir, 'sentiment.prompt.md'),
  `---
id: sentiment
model: google/gemini-3.1-flash-lite-preview
temperature: 0.1
maxTokens: 200
---

You are a sentiment classifier. Analyze the given text and determine
its emotional tone. Be precise. Consider context, sarcasm, and nuance.
`,
);

writeFileSync(
  join(promptDir, 'sentiment.concise.prompt.md'),
  `---
id: sentiment
model: google/gemini-3.1-flash-lite-preview
temperature: 0
maxTokens: 50
---

Classify sentiment as positive, negative, or neutral. One word answer with confidence score.
`,
);

console.log('Sample .prompt.md files created.');
console.log('\nTo generate TypeScript from these:');
console.log('  npx funcai generate .tmp-prompts/');
console.log('\nThis produces:');
console.log('  .tmp-prompts/sentiment.prompt.ts       (default variant)');
console.log('  .tmp-prompts/sentiment.concise.prompt.ts (concise variant)');
console.log('  .tmp-prompts/sentiment.prompts.ts       (group index with getPrompt())');
console.log('\nGenerated code looks like:');
console.log(`
// AUTO-GENERATED from sentiment.prompt.md -- do not edit
import { definePrompt } from "funcai";

export const sentiment = definePrompt({
  id: "sentiment",
  model: "google/gemini-3.1-flash-lite-preview",
  temperature: 0.1,
  maxTokens: 200,
  system: \`You are a sentiment classifier...\`,
});

export default sentiment;
`);

console.log('Usage in your code:');
console.log(`
import { getPrompt } from "./prompts/sentiment.prompts";

// Default prompt
const fn = ai.fn({ prompt: getPrompt(), schema, input });

// A/B test with "concise" variant
const fn = ai.fn({ prompt: getPrompt("concise"), schema, input });
`);

// Cleanup
rmSync(promptDir, { recursive: true });
