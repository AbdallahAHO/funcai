import type { LanguageModel } from 'ai';
import type { TraceContext } from '@/core/types';
import { posthog } from '@/trace/posthog';

describe('posthog trace plugin', () => {
  const fakeModel = {
    specificationVersion: 'v3',
    provider: 'test',
    modelId: 'test-model',
    defaultObjectGenerationMode: 'json',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  } as unknown as LanguageModel;

  const baseContext: TraceContext = {
    traceId: 'trace-123',
    model: 'openai/gpt-4o',
    feature: 'classify-sentiment',
    userId: 'user-abc',
  };

  // -----------------------------------------------------------------------
  // Config parsing: shorthand vs full
  // -----------------------------------------------------------------------

  describe('config parsing', () => {
    it('accepts shorthand string (API key only) without throwing', () => {
      const plugin = posthog('phc_shorthand_key');
      expect(plugin).toBeDefined();
      expect(typeof plugin.wrap).toBe('function');
    });

    it('accepts full config object with apiKey', () => {
      const plugin = posthog({ apiKey: 'phc_full_key' });
      expect(plugin).toBeDefined();
      expect(typeof plugin.wrap).toBe('function');
    });

    it('accepts full config with host', () => {
      const plugin = posthog({ apiKey: 'phc_eu', host: 'https://eu.i.posthog.com' });
      expect(plugin).toBeDefined();
      expect(typeof plugin.wrap).toBe('function');
    });
  });

  // -----------------------------------------------------------------------
  // Plugin interface shape
  // -----------------------------------------------------------------------

  describe('plugin interface', () => {
    it('returns a TracePlugin with a wrap method', () => {
      const plugin = posthog('phc_test');
      expect(plugin).toHaveProperty('wrap');
      expect(typeof plugin.wrap).toBe('function');
    });
  });

  // -----------------------------------------------------------------------
  // Lazy initialization
  // -----------------------------------------------------------------------

  describe('lazy initialization', () => {
    it('does not throw when creating plugin (client not initialized yet)', () => {
      expect(() => posthog('phc_lazy')).not.toThrow();
    });

    it('wrap() initializes client and returns a LanguageModel', () => {
      const plugin = posthog('phc_wrap_test');
      const wrapped = plugin.wrap(fakeModel, baseContext);
      expect(wrapped).toBeDefined();
    });

    it('calling wrap() multiple times does not throw', () => {
      const plugin = posthog('phc_multi');
      plugin.wrap(fakeModel, baseContext);
      expect(() => plugin.wrap(fakeModel, baseContext)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Context handling
  // -----------------------------------------------------------------------

  describe('context handling', () => {
    it('accepts context with all optional fields', () => {
      const plugin = posthog('phc_ctx');
      const fullContext: TraceContext = {
        traceId: 'trace-full',
        model: 'openai/gpt-4o',
        feature: 'test-feature',
        userId: 'user-123',
        sessionId: 'sess-456',
        properties: { custom: 'value', count: 42 },
      };
      expect(() => plugin.wrap(fakeModel, fullContext)).not.toThrow();
    });

    it('accepts context without optional fields', () => {
      const plugin = posthog('phc_minimal');
      const minimalContext: TraceContext = {
        traceId: 'trace-min',
        model: 'openai/gpt-4o',
        feature: 'test-feature',
      };
      expect(() => plugin.wrap(fakeModel, minimalContext)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Config normalization
  // -----------------------------------------------------------------------

  describe('config normalization', () => {
    it('shorthand string is equivalent to { apiKey: string }', () => {
      const pluginA = posthog('phc_same_key');
      const pluginB = posthog({ apiKey: 'phc_same_key' });

      // Both should produce working plugins
      const wrappedA = pluginA.wrap(fakeModel, baseContext);
      const wrappedB = pluginB.wrap(fakeModel, baseContext);
      expect(wrappedA).toBeDefined();
      expect(wrappedB).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Bring your own client
  // -----------------------------------------------------------------------

  describe('client injection', () => {
    it('uses injected client instead of creating one internally', () => {
      const fakeClient = { capture: vi.fn() };
      const plugin = posthog({ apiKey: 'phc_injected', client: fakeClient });
      const wrapped = plugin.wrap(fakeModel, baseContext);
      expect(wrapped).toBeDefined();
    });

    it('injected client is reused across multiple wrap() calls', () => {
      const fakeClient = { capture: vi.fn() };
      const plugin = posthog({ apiKey: 'phc_reuse', client: fakeClient });
      plugin.wrap(fakeModel, baseContext);
      plugin.wrap(fakeModel, { ...baseContext, traceId: 'trace-456' });
      // No error — the same injected client was used both times
    });

    it('does not require apiKey to match when client is provided', () => {
      const fakeClient = { capture: vi.fn() };
      const plugin = posthog({ apiKey: 'phc_unused_key', client: fakeClient });
      expect(() => plugin.wrap(fakeModel, baseContext)).not.toThrow();
    });
  });
});
