import type { Example } from '@/core/types';

/**
 * Replaces `{{KEY}}` placeholders in a template with values from the variables map.
 * Throws if any `{{UPPERCASE}}` placeholders remain after substitution.
 */
export function injectVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }

  const remaining = result.match(/\{\{[A-Z_]+\}\}/g);
  if (remaining?.length) {
    throw new Error(`Unresolved template variables: ${remaining.join(', ')}`);
  }

  return result;
}

/**
 * Formats few-shot examples as a markdown block for injection into system prompts.
 */
export function formatExamples<TOutput>(examples: Example<TOutput>[]): string {
  if (examples.length === 0) return '';

  const lines = examples.map((ex, i) => {
    let block = `### Example ${i + 1}\n**Input:** ${ex.input}`;
    if (ex.reasoning) {
      block += `\n**Reasoning:** ${ex.reasoning}`;
    }
    block += `\n**Output:**\n\`\`\`json\n${JSON.stringify(ex.output, null, 2)}\n\`\`\``;
    return block;
  });

  return `## Examples\n\n${lines.join('\n\n')}`;
}
