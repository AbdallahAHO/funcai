import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'provider/lmstudio': 'src/provider/lmstudio/index.ts',
      'provider/ollama': 'src/provider/ollama/index.ts',
      'provider/openrouter': 'src/provider/openrouter/index.ts',
      'provider/cloudflare': 'src/provider/cloudflare/index.ts',
      'trace/langfuse': 'src/trace/langfuse.ts',
      'trace/posthog': 'src/trace/posthog.ts',
      'test/index': 'test/index.ts',
      'bin/funcai': 'bin/funcai.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    treeshake: true,
    outDir: 'dist',
    external: [
      'zod',
      'posthog-node',
      '@posthog/ai',
      '@langfuse/tracing',
      '@langfuse/otel',
      '@opentelemetry/sdk-node',
    ],
  },
]);
