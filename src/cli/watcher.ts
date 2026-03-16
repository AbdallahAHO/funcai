import { watch } from 'node:fs';
import { generatePrompts } from './generate';

/**
 * Watches a directory for `.prompt.md` changes and regenerates TypeScript files.
 */
export function watchPrompts(promptsDir: string): void {
  console.log(`Watching ${promptsDir} for prompt changes...`);

  // Initial generation
  const initial = generatePrompts(promptsDir);
  console.log(`Generated ${initial.files.length} file(s)`);

  watch(promptsDir, { recursive: true }, (event, filename) => {
    if (!filename?.endsWith('.prompt.md')) return;
    console.log(`[${event}] ${filename} — regenerating...`);
    try {
      const result = generatePrompts(promptsDir);
      console.log(`Regenerated ${result.files.length} file(s)`);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  });
}
