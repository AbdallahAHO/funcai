import type { AiContent, ScaffoldOptions } from './types';

/**
 * Uses aifn itself (dogfooding) to generate tailored content for a scaffold.
 * Returns null on any failure — caller silently falls back to static templates.
 */
export async function generateWithAi(opts: ScaffoldOptions): Promise<AiContent | null> {
  try {
    const { createAiFn } = await import('@/core/factory');
    const { openrouter } = await import('@/provider/openrouter');
    const { z } = await import('zod');

    const ai = createAiFn({ provider: openrouter(), retries: 1 });

    const generateContent = ai.fn({
      model: 'openai/gpt-4o-mini',
      system: `You design AI function configurations. Given a feature description and output fields,
generate a precise system prompt, realistic few-shot examples, and Zod type strings for each field.

Rules:
- System prompt should be concise but complete (max 200 words)
- Include a {{FEW_SHOTS}} placeholder in the system prompt where examples should go
- Few-shot examples must be realistic and diverse (2-4 examples)
- Field types should use valid Zod syntax (e.g., "z.string()", "z.enum(['a', 'b'])", "z.number().min(0).max(1)")
- Each example output must have all the specified fields`,
      schema: z.object({
        systemPrompt: z.string(),
        fewShots: z
          .array(
            z.object({
              input: z.string(),
              output: z.record(z.unknown()),
            }),
          )
          .min(2)
          .max(4),
        fieldTypes: z.record(z.string()),
      }),
      input: (data: ScaffoldOptions) =>
        `Feature: ${data.name}\nDescription: ${data.description}\nOutput fields: ${data.fields.join(', ')}`,
    });

    return await generateContent(opts);
  } catch {
    return null;
  }
}
