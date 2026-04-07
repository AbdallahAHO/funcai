import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generatePrompts, parsePromptFile } from '@/cli/generate';

// -- Helpers ------------------------------------------------------------------

let tempDir: string;

const validPromptFile = (overrides?: {
  id?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  content?: string;
}) => {
  const id = overrides?.id ?? 'test-prompt';
  const model = overrides?.model ?? 'openai/gpt-4o';
  const frontmatter = [`id: ${id}`, `model: ${model}`];
  if (overrides?.temperature !== undefined)
    frontmatter.push(`temperature: ${overrides.temperature}`);
  if (overrides?.maxTokens !== undefined) frontmatter.push(`maxTokens: ${overrides.maxTokens}`);
  const content = overrides?.content ?? 'You are a helpful assistant.';
  return `---\n${frontmatter.join('\n')}\n---\n\n${content}`;
};

const writePrompt = (filename: string, content: string, subdir?: string) => {
  const dir = subdir ? join(tempDir, subdir) : tempDir;
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
};

const readGenerated = (filename: string, subdir?: string) => {
  const dir = subdir ? join(tempDir, subdir) : tempDir;
  return readFileSync(join(dir, filename), 'utf-8');
};

beforeEach(() => {
  tempDir = join(tmpdir(), `aifn-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// -- Tests --------------------------------------------------------------------

describe('parsePromptFile', () => {
  describe('happy path', () => {
    it('parses a prompt with all frontmatter fields', () => {
      const filePath = writePrompt(
        'classify.prompt.md',
        validPromptFile({
          id: 'classify',
          model: 'openai/gpt-4o',
          temperature: 0.7,
          maxTokens: 1024,
          content: 'Classify the input.',
        }),
      );

      const result = parsePromptFile(filePath);

      expect(result.frontmatter).toEqual({
        id: 'classify',
        model: 'openai/gpt-4o',
        temperature: 0.7,
        maxTokens: 1024,
      });
      expect(result.content).toBe('Classify the input.');
      expect(result.filename).toBe('classify.prompt.md');
      expect(result.variant).toBeUndefined();
    });

    it('parses a prompt with only required fields', () => {
      const filePath = writePrompt(
        'simple.prompt.md',
        validPromptFile({
          id: 'simple',
          model: 'anthropic/claude-3.5-sonnet',
        }),
      );

      const result = parsePromptFile(filePath);

      expect(result.frontmatter.id).toBe('simple');
      expect(result.frontmatter.model).toBe('anthropic/claude-3.5-sonnet');
      expect(result.frontmatter.temperature).toBeUndefined();
      expect(result.frontmatter.maxTokens).toBeUndefined();
    });

    it('extracts variant from filename like base.variant.prompt.md', () => {
      const filePath = writePrompt(
        'search-filters.exp.prompt.md',
        validPromptFile({
          id: 'search-filters',
        }),
      );

      const result = parsePromptFile(filePath);

      expect(result.variant).toBe('exp');
      expect(result.filename).toBe('search-filters.exp.prompt.md');
    });

    it('returns no variant for default prompt files', () => {
      const filePath = writePrompt(
        'search-filters.prompt.md',
        validPromptFile({
          id: 'search-filters',
        }),
      );

      const result = parsePromptFile(filePath);

      expect(result.variant).toBeUndefined();
    });

    it('trims whitespace from system prompt content', () => {
      const filePath = writePrompt(
        'trim.prompt.md',
        '---\nid: trim\nmodel: openai/gpt-4o\n---\n\n  Some content with leading spaces  \n\n',
      );

      const result = parsePromptFile(filePath);

      expect(result.content).toBe('Some content with leading spaces');
    });

    it('ignores extra unknown fields in frontmatter', () => {
      const filePath = writePrompt(
        'extra.prompt.md',
        '---\nid: extra\nmodel: openai/gpt-4o\ncustom: value\ntags: [a, b]\n---\n\nContent.',
      );

      const result = parsePromptFile(filePath);

      expect(result.frontmatter.id).toBe('extra');
      expect(result.frontmatter.model).toBe('openai/gpt-4o');
      expect(result.content).toBe('Content.');
    });

    it('parses provider when present in frontmatter', () => {
      const filePath = writePrompt(
        'provider.prompt.md',
        '---\nid: provider\nprovider: ollama\nmodel: gemma4:latest\n---\n\nContent.',
      );

      const result = parsePromptFile(filePath);

      expect(result.frontmatter.provider).toBe('ollama');
      expect(result.frontmatter.model).toBe('gemma4:latest');
    });
  });

  describe('error handling - bad frontmatter', () => {
    it('throws with helpful message when id is missing', () => {
      const filePath = writePrompt('no-id.prompt.md', '---\nmodel: openai/gpt-4o\n---\n\nContent.');

      expect(() => parsePromptFile(filePath)).toThrow(/Missing required "id" field/);
      expect(() => parsePromptFile(filePath)).toThrow(/no-id\.prompt\.md/);
      expect(() => parsePromptFile(filePath)).toThrow(/Found fields: model/);
    });

    it('throws with helpful message when model is missing', () => {
      const filePath = writePrompt('no-model.prompt.md', '---\nid: no-model\n---\n\nContent.');

      expect(() => parsePromptFile(filePath)).toThrow(/Missing required "model" field/);
      expect(() => parsePromptFile(filePath)).toThrow(/no-model\.prompt\.md/);
      expect(() => parsePromptFile(filePath)).toThrow(/Found fields: id/);
    });

    it('throws when frontmatter is empty (--- only)', () => {
      const filePath = writePrompt('empty-fm.prompt.md', '---\n---\n\nContent.');

      expect(() => parsePromptFile(filePath)).toThrow(/No frontmatter found/);
      expect(() => parsePromptFile(filePath)).toThrow(/Expected YAML frontmatter/);
    });

    it('throws when file has no frontmatter at all', () => {
      const filePath = writePrompt('plain.prompt.md', 'Just plain text without frontmatter.');

      expect(() => parsePromptFile(filePath)).toThrow(/No frontmatter found/);
    });

    it('throws YAMLException on invalid YAML in frontmatter', () => {
      const filePath = writePrompt('bad-yaml.prompt.md', '---\n: invalid: yaml:\n---\n\nContent.');

      expect(() => parsePromptFile(filePath)).toThrow();
    });
  });

  describe('content edge cases', () => {
    it('handles frontmatter with no content body (empty system prompt)', () => {
      const filePath = writePrompt(
        'no-body.prompt.md',
        '---\nid: no-body\nmodel: openai/gpt-4o\n---\n',
      );

      const result = parsePromptFile(filePath);

      expect(result.content).toBe('');
    });

    it('handles content that is only whitespace', () => {
      const filePath = writePrompt(
        'whitespace.prompt.md',
        '---\nid: whitespace\nmodel: openai/gpt-4o\n---\n\n   \n  \n',
      );

      const result = parsePromptFile(filePath);

      expect(result.content).toBe('');
    });

    it('preserves multiline system prompt content', () => {
      const multiline = [
        'You are a classifier.',
        '',
        'Rules:',
        '1. Be precise',
        '2. Be concise',
        '',
        'Output JSON.',
      ].join('\n');

      const filePath = writePrompt(
        'multi.prompt.md',
        `---\nid: multi\nmodel: openai/gpt-4o\n---\n\n${multiline}`,
      );

      const result = parsePromptFile(filePath);

      expect(result.content).toBe(multiline);
    });
  });

  describe('variant parsing edge cases', () => {
    it('parses hyphenated variant names', () => {
      const filePath = writePrompt(
        'search.my-variant.prompt.md',
        validPromptFile({ id: 'search' }),
      );

      const result = parsePromptFile(filePath);

      expect(result.variant).toBe('my-variant');
    });

    it('returns no variant for single-segment base names', () => {
      const filePath = writePrompt('search.prompt.md', validPromptFile({ id: 'search' }));

      const result = parsePromptFile(filePath);

      expect(result.variant).toBeUndefined();
    });
  });
});

describe('generatePrompts', () => {
  describe('happy path - single prompt', () => {
    it('generates a TypeScript file for a single prompt', () => {
      writePrompt(
        'sentiment.prompt.md',
        validPromptFile({
          id: 'sentiment',
          model: 'openai/gpt-4o',
          content: 'Analyze sentiment.',
        }),
      );

      const result = generatePrompts(tempDir);

      expect(result.files).toEqual(['sentiment.prompt.ts']);

      const code = readGenerated('sentiment.prompt.ts');
      expect(code).toContain('// AUTO-GENERATED from sentiment.prompt.md');
      expect(code).toContain('import { definePrompt } from "funcai"');
      expect(code).toContain('export const sentiment = definePrompt({');
      expect(code).toContain('"sentiment"');
      expect(code).toContain('"openai/gpt-4o"');
      expect(code).toContain('system: `Analyze sentiment.`');
      expect(code).toContain('export default sentiment;');
    });

    it('includes temperature and maxTokens when specified', () => {
      writePrompt(
        'classify.prompt.md',
        validPromptFile({
          id: 'classify',
          model: 'openai/gpt-4o',
          temperature: 0.3,
          maxTokens: 512,
          content: 'Classify.',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('classify.prompt.ts');
      expect(code).toContain('temperature: 0.3,');
      expect(code).toContain('maxTokens: 512,');
    });

    it('omits temperature and maxTokens when not specified', () => {
      writePrompt(
        'simple.prompt.md',
        validPromptFile({
          id: 'simple',
          model: 'openai/gpt-4o',
          content: 'Simple.',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('simple.prompt.ts');
      expect(code).not.toContain('temperature');
      expect(code).not.toContain('maxTokens');
    });
  });

  describe('happy path - camelCase naming', () => {
    it('converts kebab-case id to camelCase export name', () => {
      writePrompt(
        'search-filters.prompt.md',
        validPromptFile({
          id: 'search-filters',
          content: 'Filter search results.',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('search-filters.prompt.ts');
      expect(code).toContain('export const searchFilters = definePrompt(');
      expect(code).toContain('export default searchFilters;');
    });

    it('appends camelCase variant suffix to export name', () => {
      writePrompt(
        'search-filters.exp.prompt.md',
        validPromptFile({
          id: 'search-filters',
          content: 'Experimental filter.',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('search-filters.exp.prompt.ts');
      expect(code).toContain('export const searchFiltersExp = definePrompt(');
      expect(code).toContain('export default searchFiltersExp;');
    });

    it('handles single-word id (no hyphens)', () => {
      writePrompt('classify.prompt.md', validPromptFile({ id: 'classify' }));

      generatePrompts(tempDir);

      const code = readGenerated('classify.prompt.ts');
      expect(code).toContain('export const classify = definePrompt(');
    });

    it('handles id with multiple hyphens', () => {
      writePrompt(
        'my-long-prompt-name.prompt.md',
        validPromptFile({
          id: 'my-long-prompt-name',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('my-long-prompt-name.prompt.ts');
      expect(code).toContain('export const myLongPromptName = definePrompt(');
    });
  });

  describe('happy path - variants and groups', () => {
    it('generates group index with getPrompt() for prompts with variants', () => {
      writePrompt(
        'sentiment.prompt.md',
        validPromptFile({
          id: 'sentiment',
          content: 'Default sentiment.',
        }),
      );
      writePrompt(
        'sentiment.exp.prompt.md',
        validPromptFile({
          id: 'sentiment',
          content: 'Experimental sentiment.',
        }),
      );

      const result = generatePrompts(tempDir);

      expect(result.files).toContain('sentiment.prompt.ts');
      expect(result.files).toContain('sentiment.exp.prompt.ts');
      expect(result.files).toContain('sentiment.prompts.ts');

      const index = readGenerated('sentiment.prompts.ts');
      expect(index).toContain('export { default as sentiment }');
      expect(index).toContain('export { default as sentimentExp }');
      expect(index).toContain('export function getPrompt(version?: string)');
      expect(index).toContain('case "exp": return sentimentExp;');
      expect(index).toContain('default: return sentiment;');
    });

    it('generates multiple variant files with correct exports', () => {
      writePrompt('classify.prompt.md', validPromptFile({ id: 'classify', content: 'Default.' }));
      writePrompt('classify.v2.prompt.md', validPromptFile({ id: 'classify', content: 'V2.' }));
      writePrompt(
        'classify.concise.prompt.md',
        validPromptFile({ id: 'classify', content: 'Concise.' }),
      );

      const result = generatePrompts(tempDir);

      expect(result.files).toHaveLength(4); // 3 individual + 1 group index

      const index = readGenerated('classify.prompts.ts');
      expect(index).toContain('case "v2": return classifyV2;');
      expect(index).toContain('case "concise": return classifyConcise;');
      expect(index).toContain('default: return classify;');
    });

    it('does not generate group index for a single prompt without variants', () => {
      writePrompt('solo.prompt.md', validPromptFile({ id: 'solo', content: 'Solo prompt.' }));

      const result = generatePrompts(tempDir);

      expect(result.files).toEqual(['solo.prompt.ts']);

      const allFiles = readdirSync(tempDir);
      expect(allFiles).not.toContain('solo.prompts.ts');
    });

    it('handles multiple independent prompts (different IDs) separately', () => {
      writePrompt('classify.prompt.md', validPromptFile({ id: 'classify', content: 'Classify.' }));
      writePrompt(
        'summarize.prompt.md',
        validPromptFile({ id: 'summarize', content: 'Summarize.' }),
      );

      const result = generatePrompts(tempDir);

      expect(result.files).toHaveLength(2);
      expect(result.files).toContain('classify.prompt.ts');
      expect(result.files).toContain('summarize.prompt.ts');

      const allFiles = readdirSync(tempDir);
      expect(allFiles.filter((f) => f.endsWith('.prompts.ts'))).toHaveLength(0);
    });

    it('handles variant arriving before default in file list order', () => {
      // Write variant first — readdirSync may return them alphabetically,
      // but the grouping logic must still work.
      writePrompt('analyze.exp.prompt.md', validPromptFile({ id: 'analyze', content: 'Exp.' }));
      writePrompt('analyze.prompt.md', validPromptFile({ id: 'analyze', content: 'Default.' }));

      const result = generatePrompts(tempDir);

      expect(result.files).toContain('analyze.prompts.ts');

      const index = readGenerated('analyze.prompts.ts');
      // The default export should reference the non-variant file
      expect(index).toContain('from "./analyze.prompt"');
      expect(index).toContain('from "./analyze.exp.prompt"');
      expect(index).toContain('default: return analyze;');
    });
  });

  describe('content escaping', () => {
    it('escapes backticks in system prompt', () => {
      writePrompt(
        'backticks.prompt.md',
        validPromptFile({
          id: 'backticks',
          content: 'Use `code` blocks and ```fenced``` blocks.',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('backticks.prompt.ts');
      expect(code).toContain('\\`code\\`');
      expect(code).toContain('\\`\\`\\`fenced\\`\\`\\`');
      // Should not have unescaped backticks inside the template literal
      expect(code).not.toMatch(/system: `[^\\]*`[^,]/);
    });

    it(`escapes \${variable} template literal expressions`, () => {
      writePrompt(
        'template.prompt.md',
        validPromptFile({
          id: 'template',
          content: `The value is \${someVar} and \${another}.`,
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('template.prompt.ts');
      expect(code).toContain(`\\\${someVar}`);
      expect(code).toContain(`\\\${another}`);
    });

    it('handles system prompt with both backticks and template expressions', () => {
      writePrompt(
        'mixed.prompt.md',
        validPromptFile({
          id: 'mixed',
          content: `Run \`echo \${HOME}\` to test.`,
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('mixed.prompt.ts');
      expect(code).toContain(`\\\`echo \\\${HOME}\\\``);
    });
  });

  describe('empty and missing directories', () => {
    it('returns empty files array for directory with no .prompt.md files', () => {
      writeFileSync(join(tempDir, 'readme.md'), 'Not a prompt.');
      writeFileSync(join(tempDir, 'notes.txt'), 'Just notes.');

      const result = generatePrompts(tempDir);

      expect(result.files).toEqual([]);
    });

    it('returns empty files array for completely empty directory', () => {
      const result = generatePrompts(tempDir);

      expect(result.files).toEqual([]);
    });

    it('throws when directory does not exist', () => {
      const nonExistent = join(tempDir, 'does-not-exist');

      expect(() => generatePrompts(nonExistent)).toThrow();
    });

    it('ignores non-.prompt.md files in the directory', () => {
      writePrompt('valid.prompt.md', validPromptFile({ id: 'valid' }));
      writeFileSync(join(tempDir, 'readme.md'), '# Readme');
      writeFileSync(join(tempDir, 'config.json'), '{}');
      writeFileSync(join(tempDir, 'notes.prompt.txt'), 'Not a prompt.');

      const result = generatePrompts(tempDir);

      expect(result.files).toEqual(['valid.prompt.ts']);
    });
  });

  describe('nested directories', () => {
    it('finds prompt files in subdirectories recursively', () => {
      writePrompt('top.prompt.md', validPromptFile({ id: 'top', content: 'Top level.' }));
      writePrompt('nested.prompt.md', validPromptFile({ id: 'nested', content: 'Nested.' }), 'sub');

      const result = generatePrompts(tempDir);

      // Both files are found and generated. The output .ts uses basename,
      // so nested files are generated at the promptsDir root.
      expect(result.files).toHaveLength(2);
      expect(result.files).toContain('top.prompt.ts');
      expect(result.files).toContain('nested.prompt.ts');

      const nested = readGenerated('nested.prompt.ts');
      expect(nested).toContain('export const nested = definePrompt(');
    });
  });

  describe('error handling - invalid files in batch', () => {
    it('throws on first invalid file encountered', () => {
      writePrompt('good.prompt.md', validPromptFile({ id: 'good' }));
      writePrompt('bad.prompt.md', '---\n---\n\nNo id or model.');

      expect(() => generatePrompts(tempDir)).toThrow(/No frontmatter found/);
    });

    it('throws when a .prompt.md file is completely empty', () => {
      writePrompt('empty.prompt.md', '');

      expect(() => generatePrompts(tempDir)).toThrow(/No frontmatter found/);
    });
  });

  describe('generated code structure', () => {
    it('produces valid TypeScript module structure', () => {
      writePrompt(
        'test.prompt.md',
        validPromptFile({
          id: 'test',
          model: 'openai/gpt-4o',
          temperature: 0.5,
          maxTokens: 2048,
          content: 'You are a test assistant.',
        }),
      );

      generatePrompts(tempDir);

      const code = readGenerated('test.prompt.ts');
      const lines = code.split('\n');

      // Line-by-line structure verification
      expect(lines[0]).toMatch(/^\/\/ AUTO-GENERATED from test\.prompt\.md/);
      expect(lines[1]).toBe('import { definePrompt } from "funcai";');
      expect(lines[2]).toBe('');
      expect(lines[3]).toContain('export const test = definePrompt({');
      expect(code).toContain('id: "test",');
      expect(code).toContain('model: "openai/gpt-4o",');
      expect(code).toContain('temperature: 0.5,');
      expect(code).toContain('maxTokens: 2048,');
      expect(code).toContain('system: `You are a test assistant.`,');
      expect(code).toContain('});');
      expect(code).toContain('export default test;');
    });

    it('group index has correct import/export structure', () => {
      writePrompt('search.prompt.md', validPromptFile({ id: 'search', content: 'Default.' }));
      writePrompt('search.fast.prompt.md', validPromptFile({ id: 'search', content: 'Fast.' }));

      generatePrompts(tempDir);

      const index = readGenerated('search.prompts.ts');

      // Named re-exports
      expect(index).toContain('export { default as search } from "./search.prompt";');
      expect(index).toContain('export { default as searchFast } from "./search.fast.prompt";');

      // Import statements for getPrompt
      expect(index).toContain('import search from "./search.prompt";');
      expect(index).toContain('import searchFast from "./search.fast.prompt";');

      // getPrompt function
      expect(index).toContain('export function getPrompt(version?: string)');
      expect(index).toContain('case "fast": return searchFast;');
      expect(index).toContain('default: return search;');
    });
  });
});
