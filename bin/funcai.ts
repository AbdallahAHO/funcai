#!/usr/bin/env node
import { resolve } from 'node:path';
import { runDoctor } from '../src/cli/doctor';
import { generatePrompts } from '../src/cli/generate';
import { runInit } from '../src/cli/init';
import { runModels } from '../src/cli/models';
import { runScaffold } from '../src/cli/scaffold/index';
import { runTry } from '../src/cli/try';
import { watchPrompts } from '../src/cli/watcher';

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `Usage:
  funcai init [dir] [--force]                 Create .env.example and prompts/ starter folder
  funcai doctor [options]                     Check local setup, provider env, and model registry
  funcai generate <prompts-dir> [--watch]    Generate TypeScript from .prompt.md files
  funcai scaffold [name] [options]           Scaffold a new AI feature folder
  funcai new [name] [options]                Alias for scaffold
  funcai models <command> [options]          Search, rank, or validate structured-output models
  funcai try <feature-dir> [--export name]   Run a built scaffolded function locally

Scaffold options:
  --name <name>         Feature name (kebab-case)
  --recipe <recipe>     support-ticket, invoice-extractor, image-inspection, cached-classifier, fallback-chain
  --fields <fields>     Comma-separated output fields
  --model <model>       OpenRouter model ID
  --provider <provider> openrouter, cloudflare, lmstudio, ollama
  --description <desc>  What the AI function does
  --posthog             Enable PostHog tracing
  --ai                  Generate content with AI (needs OPENROUTER_API_KEY)
  -y, --yes             Accept all defaults, skip prompts`;

async function main(): Promise<void> {
  switch (command) {
    case 'init': {
      runInit(args.slice(1));
      break;
    }

    case 'doctor': {
      await runDoctor(args.slice(1));
      break;
    }

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
      await runScaffold(args.slice(1));
      break;
    }

    case 'new': {
      await runScaffold(args.slice(1));
      break;
    }

    case 'models': {
      runModels(args.slice(1));
      break;
    }

    case 'try': {
      await runTry(args.slice(1));
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
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
