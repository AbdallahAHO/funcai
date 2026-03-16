#!/usr/bin/env node
import { resolve } from 'node:path';
import { generatePrompts } from '../src/cli/generate';
import { runScaffold } from '../src/cli/scaffold/index';
import { watchPrompts } from '../src/cli/watcher';

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `Usage:
  funcai generate <prompts-dir> [--watch]    Generate TypeScript from .prompt.md files
  funcai scaffold [name] [options]           Scaffold a new AI feature folder

Scaffold options:
  --name <name>         Feature name (kebab-case)
  --fields <fields>     Comma-separated output fields
  --model <model>       OpenRouter model ID
  --description <desc>  What the AI function does
  --posthog             Enable PostHog tracing
  --ai                  Generate content with AI (needs OPENROUTER_API_KEY)
  -y, --yes             Accept all defaults, skip prompts`;

switch (command) {
  case 'generate': {
    const dir = args[1];
    if (!dir) {
      console.error('Error: prompts directory is required');
      console.log('Usage: funcai generate <prompts-dir> [--watch]');
      process.exit(1);
    }

    const promptsDir = resolve(dir);
    const isWatch = args.includes('--watch');

    if (isWatch) {
      watchPrompts(promptsDir);
    } else {
      const result = generatePrompts(promptsDir);
      console.log(`Generated ${result.files.length} file(s):`);
      for (const file of result.files) {
        console.log(`  ${file}`);
      }
    }
    break;
  }

  case 'scaffold': {
    runScaffold(args.slice(1)).catch((err: unknown) => {
      console.error('Scaffold failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
    break;
  }

  default: {
    console.log(USAGE);
    if (command) {
      console.error(`\nUnknown command: ${command}`);
      process.exit(1);
    }
    break;
  }
}
