import { existsSync, readFileSync } from 'node:fs';
import { findCatalogModel, type ModelCatalogProvider } from './models';

export type DoctorStatus = 'ok' | 'warn' | 'fail';

export type DoctorCheck = {
  label: string;
  status: DoctorStatus;
  message: string;
};

type DoctorOptions = {
  provider?: ModelCatalogProvider | 'lmstudio' | 'ollama';
  model?: string;
  live?: boolean;
};

function envPresent(name: string): boolean {
  return typeof process.env[name] === 'string' && process.env[name].length > 0;
}

function parseOptions(args: string[]): DoctorOptions {
  const readFlag = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };

  const provider = readFlag('--provider') as DoctorOptions['provider'];

  return {
    ...(provider && { provider }),
    model: readFlag('--model'),
    live: args.includes('--live'),
  };
}

function checkNodeVersion(): DoctorCheck {
  const version = process.versions.node;
  const major = Number(version.split('.')[0] ?? 0);
  if (major >= 20) {
    return { label: 'Node.js', status: 'ok', message: version };
  }

  return {
    label: 'Node.js',
    status: 'fail',
    message: `${version} detected. funcai requires Node.js >=20.`,
  };
}

function checkPackageManager(): DoctorCheck {
  const agent = process.env.npm_config_user_agent ?? '';
  if (agent.includes('pnpm')) {
    return { label: 'Package manager', status: 'ok', message: agent.split(' ')[0] ?? 'pnpm' };
  }
  if (existsSync('pnpm-lock.yaml')) {
    return { label: 'Package manager', status: 'ok', message: 'pnpm-lock.yaml found.' };
  }
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { packageManager?: string };
    if (pkg.packageManager?.startsWith('pnpm@')) {
      return { label: 'Package manager', status: 'ok', message: pkg.packageManager };
    }
  }

  return {
    label: 'Package manager',
    status: 'warn',
    message: 'pnpm is recommended for this repo and generated examples.',
  };
}

function checkOpenRouterEnv(): DoctorCheck {
  if (envPresent('OPENROUTER_API_KEY')) {
    return { label: 'OpenRouter', status: 'ok', message: 'OPENROUTER_API_KEY is set.' };
  }

  return {
    label: 'OpenRouter',
    status: 'warn',
    message: 'OPENROUTER_API_KEY is not set. Hosted OpenRouter calls will fail.',
  };
}

function checkCloudflareEnv(): DoctorCheck {
  const hasAccount = envPresent('CLOUDFLARE_ACCOUNT_ID');
  const hasToken =
    envPresent('CLOUDFLARE_AI_GATEWAY_API_KEY') ||
    envPresent('CLOUDFLARE_API_TOKEN') ||
    envPresent('CLOUDFLARE_AUTH_TOKEN');
  const hasGlobalAuth =
    (envPresent('CLOUDFLARE_EMAIL') || envPresent('CLOUDFLARE_API_EMAIL')) &&
    (envPresent('CLOUDFLARE_GLOBAL_API_KEY') || envPresent('CLOUDFLARE_API_KEY'));

  if (hasAccount && (hasToken || hasGlobalAuth)) {
    return { label: 'Cloudflare', status: 'ok', message: 'AI Gateway credentials are set.' };
  }

  return {
    label: 'Cloudflare',
    status: 'warn',
    message: 'Set CLOUDFLARE_ACCOUNT_ID plus an API token or Global API Key credentials.',
  };
}

function checkLocalProvider(provider: 'lmstudio' | 'ollama'): DoctorCheck {
  const baseUrlName = provider === 'lmstudio' ? 'LMSTUDIO_BASE_URL' : 'OLLAMA_BASE_URL';
  const modelName = provider === 'lmstudio' ? 'LMSTUDIO_MODEL' : 'OLLAMA_MODEL';
  const baseUrl =
    process.env[baseUrlName] ?? (provider === 'lmstudio' ? '127.0.0.1:1234' : '127.0.0.1:11434');
  const model = process.env[modelName];

  return {
    label: provider === 'lmstudio' ? 'LM Studio' : 'Ollama',
    status: model ? 'ok' : 'warn',
    message: model
      ? `${modelName}=${model}; ${baseUrlName}=${baseUrl}`
      : `${modelName} is not set. Defaults may work, but explicit config improves repeatability.`,
  };
}

function checkModel(options: DoctorOptions): DoctorCheck | null {
  if (!options.model) return null;

  const provider =
    options.provider === 'openrouter' || options.provider === 'cloudflare'
      ? options.provider
      : undefined;
  const model = findCatalogModel(options.model, provider);

  if (model) {
    return {
      label: 'Model registry',
      status: 'ok',
      message: `${options.model} supports structured output via ${model.provider}.`,
    };
  }

  return {
    label: 'Model registry',
    status: 'warn',
    message: `${options.model} was not found in the structured-output registries.`,
  };
}

async function checkLiveLocal(provider: 'lmstudio' | 'ollama'): Promise<DoctorCheck> {
  const baseUrl =
    provider === 'lmstudio'
      ? (process.env.LMSTUDIO_BASE_URL ?? 'http://127.0.0.1:1234/v1')
      : (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434');
  const url =
    provider === 'lmstudio'
      ? `${baseUrl.replace(/\/$/, '')}/models`
      : `${baseUrl.replace(/\/$/, '')}/api/tags`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return {
      label: `${provider} live check`,
      status: response.ok ? 'ok' : 'warn',
      message: `${url} responded with HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      label: `${provider} live check`,
      status: 'warn',
      message: error instanceof Error ? error.message : 'Provider did not respond.',
    };
  }
}

export async function collectDoctorChecks(args: string[]): Promise<DoctorCheck[]> {
  const options = parseOptions(args);
  const checks = [checkNodeVersion(), checkPackageManager()];

  if (!options.provider || options.provider === 'openrouter') checks.push(checkOpenRouterEnv());
  if (!options.provider || options.provider === 'cloudflare') checks.push(checkCloudflareEnv());
  if (!options.provider || options.provider === 'lmstudio')
    checks.push(checkLocalProvider('lmstudio'));
  if (!options.provider || options.provider === 'ollama') checks.push(checkLocalProvider('ollama'));

  const modelCheck = checkModel(options);
  if (modelCheck) checks.push(modelCheck);

  if (options.live && (options.provider === 'lmstudio' || options.provider === 'ollama')) {
    checks.push(await checkLiveLocal(options.provider));
  }

  return checks;
}

function statusLabel(status: DoctorStatus): string {
  if (status === 'ok') return '[ok]';
  if (status === 'fail') return '[fail]';
  return '[warn]';
}

export async function runDoctor(args: string[]): Promise<void> {
  const checks = await collectDoctorChecks(args);

  console.log('funcai doctor');
  for (const check of checks) {
    console.log(`${statusLabel(check.status)} ${check.label}: ${check.message}`);
  }

  if (checks.some((check) => check.status === 'fail')) {
    process.exit(1);
  }
}
