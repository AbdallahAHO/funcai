import { openrouter } from '@/provider/openrouter';

describe('openrouter', () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.OPENROUTER_API_KEY = originalEnv;
    } else {
      delete process.env.OPENROUTER_API_KEY;
    }
  });

  it('throws when no API key is provided and env var is unset', () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = openrouter();
    expect(() => provider.model({ modelId: 'openai/gpt-4o' })).toThrow(
      'OPENROUTER_API_KEY is required',
    );
  });

  it('includes helpful message about how to provide the key', () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = openrouter();
    expect(() => provider.model({ modelId: 'openai/gpt-4o' })).toThrow(
      'Pass it via openrouter({ apiKey }) or set the environment variable',
    );
  });

  it('does not throw when apiKey is provided via config', () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = openrouter({ apiKey: 'sk-test-key' });
    expect(() => provider.model({ modelId: 'openai/gpt-4o' })).not.toThrow();
  });

  it('does not throw when OPENROUTER_API_KEY env var is set', () => {
    process.env.OPENROUTER_API_KEY = 'sk-env-key';
    const provider = openrouter();
    expect(() => provider.model({ modelId: 'openai/gpt-4o' })).not.toThrow();
  });

  it('returns a LanguageModel-shaped object from model()', () => {
    const provider = openrouter({ apiKey: 'sk-test' });
    const model = provider.model({ modelId: 'openai/gpt-4o' });
    expect(model).toBeDefined();
    expect(typeof model).toBe('object');
  });

  it('lazy-initializes: creating provider does not throw even without key', () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(() => openrouter()).not.toThrow();
  });

  it('reuses instance: second model() call does not throw after first succeeds', () => {
    const provider = openrouter({ apiKey: 'sk-reuse' });
    provider.model({ modelId: 'openai/gpt-4o' });
    expect(() => provider.model({ modelId: 'google/gemini-3.1-flash-lite-preview' })).not.toThrow();
  });

  it('prefers explicit apiKey over env var', () => {
    process.env.OPENROUTER_API_KEY = 'sk-env-key';
    const provider = openrouter({ apiKey: 'sk-explicit' });
    expect(() => provider.model({ modelId: 'openai/gpt-4o' })).not.toThrow();
  });

  it('returns the Provider interface shape with model method', () => {
    const provider = openrouter({ apiKey: 'sk-test' });
    expect(typeof provider.model).toBe('function');
  });

  // Response healing & usage accounting
  describe('model settings', () => {
    it('returns a model with response-healing and usage enabled by default', () => {
      const provider = openrouter({ apiKey: 'sk-test' });
      const model = provider.model({ modelId: 'openai/gpt-4o' });
      // The model should have settings with our defaults baked in
      // @ts-expect-error — accessing internal SDK property for test verification
      const settings = model.settings ?? {};
      expect(settings.plugins).toEqual([{ id: 'response-healing' }]);
      expect(settings.usage).toEqual({ include: true });
    });

    it('allows disabling response healing', () => {
      const provider = openrouter({ apiKey: 'sk-test', responseHealing: false });
      const model = provider.model({ modelId: 'openai/gpt-4o' });
      // @ts-expect-error — accessing internal SDK property
      const settings = model.settings ?? {};
      expect(settings.plugins).toBeUndefined();
    });

    it('allows disabling usage accounting', () => {
      const provider = openrouter({ apiKey: 'sk-test', usage: false });
      const model = provider.model({ modelId: 'openai/gpt-4o' });
      // @ts-expect-error — accessing internal SDK property
      const settings = model.settings ?? {};
      expect(settings.usage).toBeUndefined();
    });

    it('accepts custom headers for features like Anthropic beta', () => {
      const provider = openrouter({
        apiKey: 'sk-test',
        headers: { 'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14' },
      });
      // Should create without error
      expect(() => provider.model({ modelId: 'anthropic/claude-sonnet-4' })).not.toThrow();
    });

    it('accepts extraBody for upstream provider features', () => {
      const provider = openrouter({
        apiKey: 'sk-test',
        extraBody: { transforms: ['middle-out'] },
      });
      expect(() => provider.model({ modelId: 'openai/gpt-4o' })).not.toThrow();
    });
  });
});
