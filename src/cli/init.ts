import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ENV_EXAMPLE = `# OpenRouter
OPENROUTER_API_KEY=

# Cloudflare AI Gateway
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_AI_GATEWAY_ID=default

# Local providers
LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
LMSTUDIO_MODEL=google/gemma-4-26b-a4b
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma4:latest

# Optional tracing
POSTHOG_API_KEY=
`;

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export function runInit(args: string[]): void {
  const force = hasFlag(args, '--force');
  const targetDir = resolve(args.find((arg) => !arg.startsWith('--')) ?? '.');
  const envPath = join(targetDir, '.env.example');
  const promptsDir = join(targetDir, 'prompts');

  mkdirSync(targetDir, { recursive: true });
  mkdirSync(promptsDir, { recursive: true });

  if (existsSync(envPath) && !force) {
    console.log(`Kept existing ${envPath}. Pass --force to overwrite it.`);
  } else {
    writeFileSync(envPath, ENV_EXAMPLE, 'utf-8');
    console.log(`Created ${envPath}`);
  }

  console.log(`Ready. Run "funcai new classify-ticket --recipe support-ticket --yes" next.`);
}
