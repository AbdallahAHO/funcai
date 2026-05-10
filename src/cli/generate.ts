import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import matter from 'gray-matter';
import { OPENROUTER_MODEL_IDS, OPENROUTER_MODELS } from '@/provider/openrouter/models';
import { toCamelCase } from './utils';

type PromptFrontmatter = {
  id: string;
  provider?: 'openrouter' | 'lmstudio' | 'ollama';
  model: string;
  temperature?: number;
  maxTokens?: number;
};

type ParsedPrompt = {
  frontmatter: PromptFrontmatter;
  content: string;
  filename: string;
  relativePath: string;
  relativeDir: string;
  variant?: string;
};

const PROMPT_ID_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const GENERATED_FILE_HEADER = '// AUTO-GENERATED';

function toPromptModulePath(relativePath: string): string {
  return relativePath.replace(/\.md$/, '.ts');
}

function toGeneratedImportPath(filename: string): string {
  return `./${filename.replace(/\.md$/, '')}`;
}

function isGeneratedArtifact(relativePath: string): boolean {
  return relativePath.endsWith('.prompt.ts') || relativePath.endsWith('.prompts.ts');
}

function validatePromptId(id: string, filePath: string): void {
  if (PROMPT_ID_REGEX.test(id)) return;

  throw new Error(
    `Invalid "id" in frontmatter: ${filePath}\n` +
      `Received: ${JSON.stringify(id)}\n` +
      'Prompt ids must be kebab-case so generated export names stay valid TypeScript identifiers.\n' +
      'Example: my-prompt-id',
  );
}

/**
 * Checks if a model ID exists in the OpenRouter registry and returns
 * suggestions if not. Returns null if recognized, or a warning string.
 */
function validateModelId(modelId: string, provider?: string): string | null {
  if (provider && provider !== 'openrouter') return null;
  if (!modelId.includes('/')) return null;
  if (modelId in OPENROUTER_MODELS) return null;

  const prefix = modelId.split('/')[0];
  const sameProvider = OPENROUTER_MODEL_IDS.filter((id) => id.startsWith(`${prefix}/`));

  // Score candidates by string similarity (shared prefix length after provider/)
  const scored = sameProvider.map((id) => {
    const a = modelId.split('/')[1] ?? '';
    const b = id.split('/')[1] ?? '';
    let shared = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) shared++;
      else break;
    }
    return { id, shared };
  });
  scored.sort((a, b) => b.shared - a.shared);

  const candidates = scored.slice(0, 5).map((s) => s.id);

  if (candidates.length === 0) {
    return `Unknown model "${modelId}". Run \`pnpm update:models\` to refresh the registry.`;
  }

  const suggestions = candidates
    .map((id) => {
      const m = OPENROUTER_MODELS[id];
      return `    ${id}  ($${m.pricing.promptPerMToken}/$${m.pricing.completionPerMToken} per M tokens)`;
    })
    .join('\n');

  return `Unknown model "${modelId}". Did you mean one of:\n${suggestions}`;
}

/**
 * Parses a `.prompt.md` file into frontmatter + content.
 */
export function parsePromptFile(filePath: string, promptsDir = dirname(filePath)): ParsedPrompt {
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    throw new Error(
      `No frontmatter found in ${filePath}\n` +
        'Expected YAML frontmatter at the top of the file:\n' +
        '  ---\n  id: my-prompt\n  model: openai/gpt-4o\n  ---',
    );
  }

  const fm = data as PromptFrontmatter;
  if (!fm.id) {
    throw new Error(
      `Missing required "id" field in frontmatter: ${filePath}\n` +
        `Found fields: ${Object.keys(fm).join(', ') || '(none)'}\n` +
        'Add an "id" field, e.g.:\n  ---\n  id: my-prompt\n  model: openai/gpt-4o\n  ---',
    );
  }
  validatePromptId(fm.id, filePath);
  if (!fm.model) {
    throw new Error(
      `Missing required "model" field in frontmatter: ${filePath}\n` +
        `Found fields: ${Object.keys(fm).join(', ')}\n` +
        `Add a "model" field, e.g.:\n  ---\n  id: \${fm.id}\n  model: openai/gpt-4o\n  ---`,
    );
  }

  const modelWarning = validateModelId(fm.model, fm.provider);
  if (modelWarning) {
    console.warn(`⚠ ${filePath}: ${modelWarning}`);
  }

  const name = basename(filePath);
  const relativePath = relative(promptsDir, filePath);
  // e.g., search-filters.exp.prompt.md → variant = "exp"
  const variantMatch = name.match(/^[\w-]+\.([\w-]+)\.prompt\.md$/);
  const variant = variantMatch?.[1];

  return {
    frontmatter: fm,
    content: content.trim(),
    filename: name,
    relativePath,
    relativeDir: dirname(relativePath),
    variant,
  };
}

/**
 * Generates TypeScript code for a single prompt.
 */
function generatePromptCode(prompt: ParsedPrompt): string {
  const varName = toCamelCase(prompt.frontmatter.id);
  const suffix = prompt.variant ? toCamelCase(`-${prompt.variant}`) : '';
  const exportName = `${varName}${suffix}`;

  const lines = [
    `// AUTO-GENERATED from ${prompt.filename} — do not edit`,
    `import { definePrompt } from "funcai";`,
    '',
    `export const ${exportName} = definePrompt({`,
    `  id: ${JSON.stringify(prompt.frontmatter.id)},`,
    `  model: ${JSON.stringify(prompt.frontmatter.model)},`,
  ];

  if (prompt.frontmatter.temperature !== undefined) {
    lines.push(`  temperature: ${prompt.frontmatter.temperature},`);
  }
  if (prompt.frontmatter.maxTokens !== undefined) {
    lines.push(`  maxTokens: ${prompt.frontmatter.maxTokens},`);
  }

  // Escape backticks in the system prompt content
  const escapedContent = prompt.content.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  lines.push(`  system: \`${escapedContent}\`,`);
  lines.push('});');
  lines.push('');
  lines.push(`export default ${exportName};`);
  lines.push('');

  return lines.join('\n');
}

type PromptGroup = {
  baseId: string;
  relativeDir: string;
  default: ParsedPrompt;
  variants: ParsedPrompt[];
};

/**
 * Groups prompt files by their base ID (without variant suffix).
 */
function groupPrompts(prompts: ParsedPrompt[]): PromptGroup[] {
  const groups = new Map<string, PromptGroup>();

  for (const prompt of prompts) {
    const baseId = prompt.frontmatter.id;
    const groupKey = `${prompt.relativeDir}:${baseId}`;
    const existing = groups.get(groupKey);

    if (prompt.variant) {
      if (existing) {
        existing.variants.push(prompt);
      } else {
        // Variant arrived before default — park as temporary default
        groups.set(groupKey, {
          baseId,
          relativeDir: prompt.relativeDir,
          default: prompt,
          variants: [],
        });
      }
    } else {
      if (existing) {
        // If the current "default" was actually a variant, move it to variants
        if (existing.default.variant) {
          existing.variants.push(existing.default);
        }
        existing.default = prompt;
      } else {
        groups.set(groupKey, {
          baseId,
          relativeDir: prompt.relativeDir,
          default: prompt,
          variants: [],
        });
      }
    }
  }

  return [...groups.values()];
}

/**
 * Generates the index file for a prompt group (with variants).
 */
function generateGroupIndex(group: PromptGroup): string {
  const baseCamel = toCamelCase(group.baseId);
  const lines = [
    `// AUTO-GENERATED — do not edit`,
    `export { default as ${baseCamel} } from "${toGeneratedImportPath(group.default.filename)}";`,
  ];

  for (const variant of group.variants) {
    const variantCamel = toCamelCase(`${group.baseId}-${variant.variant}`);
    lines.push(
      `export { default as ${variantCamel} } from "${toGeneratedImportPath(variant.filename)}";`,
    );
  }

  // getPrompt() helper
  lines.push('');
  lines.push(`import ${baseCamel} from "${toGeneratedImportPath(group.default.filename)}";`);

  for (const variant of group.variants) {
    const variantCamel = toCamelCase(`${group.baseId}-${variant.variant}`);
    lines.push(`import ${variantCamel} from "${toGeneratedImportPath(variant.filename)}";`);
  }

  lines.push('');
  lines.push('export function getPrompt(version?: string) {');
  lines.push('  switch (version) {');

  for (const variant of group.variants) {
    const variantCamel = toCamelCase(`${group.baseId}-${variant.variant}`);
    lines.push(`    case ${JSON.stringify(variant.variant)}: return ${variantCamel};`);
  }

  lines.push(`    default: return ${baseCamel};`);
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Scans a directory for `.prompt.md` files and generates TypeScript modules.
 */
export function generatePrompts(promptsDir: string): { files: string[] } {
  const entries = readdirSync(promptsDir, { recursive: true }) as string[];
  const promptFiles = entries.filter((f) => f.endsWith('.prompt.md'));
  const parsed = promptFiles.map((f) => parsePromptFile(join(promptsDir, f), promptsDir));
  const groups = groupPrompts(parsed);
  const generatedFiles = new Set<string>();

  // Generate individual prompt files
  for (const prompt of parsed) {
    const relativeOutputPath = toPromptModulePath(prompt.relativePath);
    const outputPath = join(promptsDir, relativeOutputPath);
    const code = generatePromptCode(prompt);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, code, 'utf-8');
    generatedFiles.add(relativeOutputPath);
  }

  // Generate group index files for groups with variants
  for (const group of groups) {
    if (group.variants.length > 0) {
      const relativeIndexPath = join(group.relativeDir, `${group.baseId}.prompts.ts`);
      const indexPath = join(promptsDir, relativeIndexPath);
      const code = generateGroupIndex(group);
      mkdirSync(dirname(indexPath), { recursive: true });
      writeFileSync(indexPath, code, 'utf-8');
      generatedFiles.add(relativeIndexPath);
    }
  }

  for (const entry of entries.filter(isGeneratedArtifact)) {
    if (generatedFiles.has(entry)) continue;

    const artifactPath = join(promptsDir, entry);
    const artifact = readFileSync(artifactPath, 'utf-8');
    if (!artifact.startsWith(GENERATED_FILE_HEADER)) continue;

    rmSync(artifactPath, { force: true });
  }

  return { files: [...generatedFiles] };
}
