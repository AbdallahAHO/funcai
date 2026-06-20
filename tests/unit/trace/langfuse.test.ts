import type { TraceContext } from '@/core/types';
import { createLangfuseSpanProcessor, langfuse } from '@/trace/langfuse';

describe('langfuse trace plugin', () => {
  const baseContext: TraceContext = {
    traceId: 'trace-123',
    model: 'openai/gpt-4o',
    feature: 'classify-sentiment',
    userId: 'user-abc',
    sessionId: 'session-xyz',
    properties: {
      channel: 'support',
      priority: 2,
      nested: { team: 'success' },
      ignored: undefined,
    },
  };

  it('returns a TracePlugin without eagerly starting OpenTelemetry', () => {
    const plugin = langfuse();

    expect(plugin.wrap).toBeUndefined();
    expect(typeof plugin.generateOptions).toBe('function');
    expect(typeof plugin.run).toBe('function');
  });

  it('maps trace context into AI SDK telemetry metadata', () => {
    const plugin = langfuse({
      metadata: { static: 'value', feature: 'not-allowed-to-win' },
      recordInputs: false,
      recordOutputs: true,
    });

    const options = plugin.generateOptions?.(baseContext).experimental_telemetry;

    expect(options).toEqual({
      isEnabled: true,
      functionId: 'classify-sentiment',
      recordInputs: false,
      recordOutputs: true,
      metadata: {
        static: 'value',
        channel: 'support',
        priority: 2,
        nested: '{"team":"success"}',
        feature: 'classify-sentiment',
        model: 'openai/gpt-4o',
        traceId: 'trace-123',
        funcaiTraceId: 'trace-123',
        userId: 'user-abc',
        sessionId: 'session-xyz',
      },
    });
  });

  it('runs the operation inside Langfuse attribute propagation', async () => {
    const plugin = langfuse({ tags: ['unit'], version: '1.2.3' });

    await expect(plugin.run?.(baseContext, async () => 'ok')).resolves.toBe('ok');
  });

  it('can create a span processor without exporting spans immediately', async () => {
    const spanProcessor = createLangfuseSpanProcessor({
      publicKey: 'pk-lf-test',
      secretKey: 'sk-lf-test',
      baseUrl: 'https://cloud.langfuse.com',
      exportMode: 'immediate',
    });

    expect(typeof spanProcessor.forceFlush).toBe('function');
    expect(typeof spanProcessor.shutdown).toBe('function');

    await spanProcessor.shutdown();
  });
});
