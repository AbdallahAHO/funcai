import { collectDoctorChecks } from '@/cli/doctor';

describe('doctor CLI helpers', () => {
  const originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('reports provider environment checks', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const checks = await collectDoctorChecks(['--provider', 'openrouter']);

    expect(checks.some((check) => check.label === 'Node.js')).toBe(true);
    expect(checks.find((check) => check.label === 'OpenRouter')?.status).toBe('warn');
  });

  it('validates models against the registry', async () => {
    const checks = await collectDoctorChecks([
      '--provider',
      'openrouter',
      '--model',
      'google/gemini-3.1-flash-lite-preview',
    ]);

    expect(checks.find((check) => check.label === 'Model registry')?.status).toBe('ok');
  });
});
