import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as p from '@clack/prompts';
import { generatePrompts } from '../generate';
import { generateWithAi } from './ai-generate';
import { collectOptions } from './prompts';
import {
  e2eTestTemplate,
  fewShotsTemplate,
  indexTemplate,
  integrationTestTemplate,
  promptMdTemplate,
  readmeTemplate,
  schemaTemplate,
  unitTestTemplate,
} from './templates';
import type { AiContent, ScaffoldOptions } from './types';

type ScaffoldFlags = Partial<ScaffoldOptions> & { skipPrompts?: boolean };

export function parseScaffoldFlags(args: string[]): ScaffoldFlags {
  const flags: ScaffoldFlags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--name':
        flags.name = next;
        i++;
        break;
      case '--fields':
        flags.fields = next
          ?.split(',')
          .map((f) => f.trim())
          .filter(Boolean);
        i++;
        break;
      case '--model':
        flags.modelId = next;
        i++;
        break;
      case '--provider':
        if (
          next === 'openrouter' ||
          next === 'lmstudio' ||
          next === 'ollama' ||
          next === 'cloudflare'
        ) {
          flags.provider = next;
        }
        i++;
        break;
      case '--description':
        flags.description = next;
        i++;
        break;
      case '--posthog':
        flags.posthog = true;
        break;
      case '--no-posthog':
        flags.posthog = false;
        break;
      case '-y':
      case '--yes':
        flags.skipPrompts = true;
        break;
      case '--ai':
        flags.aiGenerate = true;
        break;
      case '--no-ai':
        flags.aiGenerate = false;
        break;
      default:
        // Positional argument = name
        if (arg && !arg.startsWith('-') && !flags.name) {
          flags.name = arg;
        }
        break;
    }
  }

  return flags;
}

export async function runScaffold(args: string[]): Promise<void> {
  const flags = parseScaffoldFlags(args);
  const opts = await collectOptions(flags);

  const targetDir = resolve(opts.name);

  if (existsSync(targetDir)) {
    p.log.error(`Directory already exists: ${opts.name}/`);
    process.exit(1);
  }

  // AI content generation (optional)
  let aiContent: AiContent | null = null;
  if (opts.aiGenerate && process.env.OPENROUTER_API_KEY) {
    const spinner = p.spinner();
    spinner.start('Generating content with AI...');
    aiContent = await generateWithAi(opts);
    if (aiContent) {
      spinner.stop('AI content generated');
    } else {
      spinner.stop('AI generation failed — using defaults');
    }
  }

  // Generate file contents
  const files: Array<{ path: string; content: string }> = [
    { path: 'schema.ts', content: schemaTemplate(opts, aiContent ?? undefined) },
    { path: 'few-shots.ts', content: fewShotsTemplate(opts, aiContent ?? undefined) },
    { path: `${opts.name}.prompt.md`, content: promptMdTemplate(opts, aiContent ?? undefined) },
    { path: 'index.ts', content: indexTemplate(opts, aiContent ?? undefined) },
    { path: 'README.md', content: readmeTemplate(opts) },
  ];

  // Test files
  const testsDir = 'tests';
  if (opts.testLevels.includes('unit')) {
    files.push({ path: join(testsDir, `${opts.name}.test.ts`), content: unitTestTemplate(opts) });
  }
  if (opts.testLevels.includes('integration')) {
    files.push({
      path: join(testsDir, `${opts.name}.integration.test.ts`),
      content: integrationTestTemplate(opts),
    });
  }
  if (opts.testLevels.includes('e2e')) {
    files.push({
      path: join(testsDir, `${opts.name}.e2e.test.ts`),
      content: e2eTestTemplate(opts),
    });
  }

  // Write files
  const spinner = p.spinner();
  spinner.start('Creating files...');

  mkdirSync(join(targetDir, testsDir), { recursive: true });

  for (const file of files) {
    const filePath = join(targetDir, file.path);
    mkdirSync(join(filePath, '..'), { recursive: true });
    writeFileSync(filePath, file.content, 'utf-8');
  }

  // Run prompt codegen on the scaffolded folder
  const genResult = generatePrompts(targetDir);
  for (const genFile of genResult.files) {
    files.push({ path: genFile, content: '' });
  }

  spinner.stop('Files created');

  // Summary
  p.log.success(`${opts.name}/`);
  for (const file of files) {
    p.log.message(`  ${file.path}`);
  }

  p.outro(`Done! Run: cd ${opts.name} && npx vitest run tests/`);
}
