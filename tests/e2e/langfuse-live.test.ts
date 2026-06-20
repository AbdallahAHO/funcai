import { randomBytes } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/core/factory';
import { openrouter } from '@/provider/openrouter';
import { type LangfuseTelemetryHandle, langfuse, startLangfuseTelemetry } from '@/trace/langfuse';

const TEST_MODEL = 'google/gemini-3.1-flash-lite-preview';
const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com';

type LangfuseObservation = {
  id?: string;
  traceId?: string;
  type?: string;
  name?: string;
  userId?: string;
  sessionId?: string;
  traceName?: string;
  tags?: string[];
  providedModelName?: string;
  model?: string | null;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  usageDetails?: Record<string, unknown>;
  costDetails?: Record<string, unknown>;
  totalCost?: number;
};

type LangfuseObservationsResponse = {
  data?: LangfuseObservation[];
};

type LangfuseTrace = {
  id?: string;
  name?: string;
  latency?: number;
  totalCost?: number;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  observations?: LangfuseObservation[];
};

type LangfuseRateLimitBody = {
  details?: {
    retryAfterSeconds?: unknown;
  };
};

const hasLiveCredentials =
  Boolean(process.env.OPENROUTER_API_KEY) &&
  Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
  Boolean(process.env.LANGFUSE_SECRET_KEY);

function createTraceId(): string {
  return randomBytes(16).toString('hex');
}

function authHeader(): string {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(text: string): unknown {
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function readRetryAfterMs(response: Response, bodyText: string): number | undefined {
  const headerSeconds = Number(response.headers.get('retry-after'));
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) return (headerSeconds + 1) * 1_000;

  const body = parseJson(bodyText) as LangfuseRateLimitBody | undefined;
  const bodySeconds = body?.details?.retryAfterSeconds;
  if (typeof bodySeconds === 'number' && Number.isFinite(bodySeconds) && bodySeconds > 0) {
    return (bodySeconds + 1) * 1_000;
  }

  return undefined;
}

async function fetchLangfuseJson<T>(url: URL, label: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        authorization: authHeader(),
      },
    });
    const text = await response.text();

    if (response.status === 429 && attempt < 2) {
      await wait(readRetryAfterMs(response, text) ?? 30_000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`${label} failed: ${response.status} ${text}`);
    }

    return (parseJson(text) ?? {}) as T;
  }

  throw new Error(`${label} failed after retrying Langfuse rate limits`);
}

function hasFuncaiTraceId(observation: LangfuseObservation, traceId: string): boolean {
  return (
    observation.metadata?.e2eRunId === traceId ||
    observation.metadata?.traceId === traceId ||
    observation.metadata?.funcaiTraceId === traceId ||
    observation.metadata?.langfuseTraceId === traceId
  );
}

async function fetchLangfuseObservations(
  userId: string,
  fromStartTime: string,
): Promise<LangfuseObservation[]> {
  const url = new URL('/api/public/v2/observations', LANGFUSE_BASE_URL);
  url.searchParams.set('userId', userId);
  url.searchParams.set('fromStartTime', fromStartTime);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'core,basic,metadata,model,usage,cost,trace_context');
  url.searchParams.set(
    'expandMetadata',
    [
      'e2eRunId',
      'traceId',
      'funcaiTraceId',
      'langfuseTraceId',
      'feature',
      'model',
      'provider',
      'purpose',
      'funcaiCostUsd',
      'funcaiInputTokens',
      'funcaiOutputTokens',
      'funcaiTotalTokens',
    ].join(','),
  );

  const body = await fetchLangfuseJson<LangfuseObservationsResponse>(
    url,
    'Langfuse observations query',
  );
  return body.data ?? [];
}

async function pollLangfuseObservations(
  traceId: string,
  userId: string,
  fromStartTime: string,
): Promise<LangfuseObservation[]> {
  const deadline = Date.now() + 120_000;
  let lastObservations: LangfuseObservation[] = [];

  while (Date.now() < deadline) {
    lastObservations = await fetchLangfuseObservations(userId, fromStartTime);
    const matchingObservations = lastObservations.filter((observation) =>
      hasFuncaiTraceId(observation, traceId),
    );
    const hasChain = matchingObservations.some((observation) => observation.type === 'CHAIN');
    const hasGeneration = matchingObservations.some(
      (observation) => observation.type === 'GENERATION',
    );
    if (hasChain && hasGeneration) return matchingObservations;
    await wait(3_000);
  }

  throw new Error(
    `Langfuse observations for funcai trace ${traceId} were not queryable after polling. Last response contained ${lastObservations.length} observations for ${userId}.`,
  );
}

async function fetchLangfuseTrace(traceId: string): Promise<LangfuseTrace> {
  const url = new URL(`/api/public/traces/${traceId}`, LANGFUSE_BASE_URL);
  return fetchLangfuseJson<LangfuseTrace>(url, 'Langfuse trace query');
}

async function pollLangfuseTrace(
  traceId: string,
  isReady: (trace: LangfuseTrace) => boolean,
): Promise<LangfuseTrace> {
  const deadline = Date.now() + 120_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const trace = await fetchLangfuseTrace(traceId);
      if (isReady(trace)) return trace;
      lastError = new Error(`Trace detail was missing expected observations for ${traceId}`);
    } catch (error) {
      lastError = error;
    }
    await wait(3_000);
  }

  throw new Error(
    `Langfuse trace ${traceId} detail was not queryable after polling. Last error: ${lastError}`,
  );
}

function readProviderCostFromTrace(trace: LangfuseTrace): number | undefined {
  if (typeof trace.metadata?.funcaiCostUsd === 'number') return trace.metadata.funcaiCostUsd;

  const providerMetadata =
    trace.metadata?.attributes ??
    trace.observations
      ?.map((observation) => observation.metadata?.attributes)
      .find((attributes) => typeof attributes === 'object' && attributes !== null);
  if (!providerMetadata || typeof providerMetadata !== 'object') return undefined;

  const raw = (providerMetadata as Record<string, unknown>)['ai.response.providerMetadata'];
  if (typeof raw !== 'string') return undefined;

  const parsed = JSON.parse(raw) as {
    openrouter?: { usage?: { cost?: unknown } };
  };
  return typeof parsed.openrouter?.usage?.cost === 'number'
    ? parsed.openrouter.usage.cost
    : undefined;
}

function findObservation(
  trace: LangfuseTrace,
  predicate: (observation: LangfuseObservation) => boolean,
): LangfuseObservation | undefined {
  return trace.observations?.find(predicate);
}

function isPositiveCost(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function expectPositiveCost(value: unknown, label: string): number {
  if (!isPositiveCost(value)) {
    throw new Error(`${label} was not a positive finite number`);
  }

  return value;
}

describe.skipIf(!hasLiveCredentials)('Langfuse + OpenRouter E2E', () => {
  let telemetry: LangfuseTelemetryHandle | undefined;

  afterAll(async () => {
    await telemetry?.shutdown();
  });

  it('emits a live structured-output trace with useful metadata', async () => {
    const traceId = createTraceId();
    const userId = `funcai-e2e-user-${traceId.slice(0, 8)}`;
    const sessionId = `funcai-e2e-session-${traceId.slice(8, 16)}`;
    const fromStartTime = new Date(Date.now() - 10_000).toISOString();

    telemetry = startLangfuseTelemetry({
      exportMode: 'immediate',
      flushAt: 1,
      flushInterval: 1,
      environment: process.env.GITHUB_ACTIONS ? 'ci' : 'local',
      release: process.env.GITHUB_SHA,
      serviceName: 'funcai-e2e',
    });

    const ai = createAiFn({
      provider: openrouter(),
      trace: langfuse({
        tags: ['funcai', 'e2e', 'openrouter'],
        metadata: {
          suite: 'langfuse-live',
          package: 'funcai',
        },
        recordInputs: true,
        recordOutputs: true,
      }),
      retries: 1,
    });

    const routeTicket = ai.fn({
      id: 'e2e-langfuse-standard-object',
      model: TEST_MODEL,
      temperature: 0,
      maxTokens: 500,
      system: [
        'Convert the support note into the requested routing object.',
        'Use the explicit facts from the input only.',
        'Return deterministic labels.',
      ].join('\n'),
      schema: z.object({
        ticket: z.object({
          id: z.string(),
          severity: z.enum(['low', 'medium', 'high']),
          customerTier: z.enum(['free', 'pro', 'enterprise']),
        }),
        routing: z.object({
          queue: z.enum(['billing', 'support', 'engineering']),
          priorityScore: z.number().min(0).max(100),
        }),
        nextAction: z.string().min(10),
      }),
      input: (note: string) => note,
    });

    const detailed = await routeTicket.detailed(
      [
        'Ticket LF-4821 from enterprise customer Northwind Legal.',
        'Users can sign in, but document search times out across multiple offices.',
        'No billing issue is mentioned. The customer is blocked on a filing deadline.',
      ].join(' '),
      {
        traceId,
        userId,
        sessionId,
        properties: {
          e2eRunId: traceId,
          provider: 'openrouter',
          purpose: 'ci-live-observability',
        },
      },
    );

    expect(detailed.output).toStrictEqual(
      expect.objectContaining({
        ticket: expect.objectContaining({
          id: 'LF-4821',
          severity: 'high',
          customerTier: 'enterprise',
        }),
        routing: expect.objectContaining({
          queue: 'engineering',
        }),
      }),
    );
    expect(detailed.model).toBe(TEST_MODEL);
    expect(detailed.traceId).toBe(traceId);
    expect(detailed.usage.inputTokens).toBeGreaterThan(0);
    expect(detailed.usage.outputTokens).toBeGreaterThan(0);

    await telemetry.forceFlush();

    const observations = await pollLangfuseObservations(traceId, userId, fromStartTime);
    const langfuseTraceIds = new Set(
      observations.map((observation) => observation.traceId).filter(Boolean),
    );
    const serialized = JSON.stringify(observations);

    expect(observations.some((observation) => observation.type === 'GENERATION')).toBe(true);
    expect(
      observations.some(
        (observation) =>
          observation.usageDetails ||
          typeof observation.totalCost === 'number' ||
          JSON.stringify(observation.metadata).includes('gen_ai.usage.input_tokens'),
      ),
    ).toBe(true);
    expect(langfuseTraceIds.size).toBeGreaterThan(0);
    for (const langfuseTraceId of langfuseTraceIds) {
      expect(langfuseTraceId).toMatch(/^[a-f0-9]{32}$/);
    }
    expect(langfuseTraceIds).toEqual(new Set([traceId]));
    expect(serialized).toContain(traceId);
    expect(serialized).toContain(userId);
    expect(serialized).toContain(sessionId);
    expect(serialized).toContain('e2e-langfuse-standard-object');
    expect(serialized).toContain('ci-live-observability');
    expect(serialized).toContain('ai.response.providerMetadata');
    expect(serialized).toContain('upstreamInferenceCost');

    const trace = await pollLangfuseTrace(traceId, (candidate) => {
      const generationWithCost = findObservation(
        candidate,
        (observation) =>
          observation.type === 'GENERATION' &&
          Boolean(observation.usageDetails) &&
          isPositiveCost(observation.costDetails?.total),
      );

      return Boolean(
        isPositiveCost(candidate.totalCost) &&
          findObservation(
            candidate,
            (observation) =>
              observation.type === 'CHAIN' && observation.name === 'e2e-langfuse-standard-object',
          ) &&
          generationWithCost,
      );
    });
    const chain = findObservation(
      trace,
      (observation) =>
        observation.type === 'CHAIN' && observation.name === 'e2e-langfuse-standard-object',
    );
    const generation = findObservation(
      trace,
      (observation) => observation.type === 'GENERATION' && Boolean(observation.usageDetails),
    );
    const providerCost = readProviderCostFromTrace(trace);
    const normalizedTraceCost = expectPositiveCost(trace.totalCost, 'trace.totalCost');
    const normalizedGenerationCostTotal = expectPositiveCost(
      generation?.costDetails?.total,
      'generation.costDetails.total',
    );

    expect(trace.id).toBe(traceId);
    expect(trace.name).toBe('e2e-langfuse-standard-object');
    expect(trace.latency).toBeGreaterThan(0);
    expect(chain?.metadata).toEqual(
      expect.objectContaining({
        funcaiTraceId: traceId,
        langfuseTraceId: traceId,
        funcaiInputTokens: detailed.usage.inputTokens,
        funcaiOutputTokens: detailed.usage.outputTokens,
        funcaiTotalTokens: detailed.usage.inputTokens + detailed.usage.outputTokens,
        funcaiCostUsd: detailed.cost,
      }),
    );
    expect(chain?.model).toBe(TEST_MODEL);
    expect(generation?.usageDetails).toEqual(
      expect.objectContaining({
        input: detailed.usage.inputTokens,
        output: detailed.usage.outputTokens,
        total: detailed.usage.inputTokens + detailed.usage.outputTokens,
      }),
    );
    expect(generation?.model).toContain('google/gemini-3.1-flash-lite-preview');
    expect(generation?.costDetails).toEqual(
      expect.objectContaining({
        input: expect.any(Number),
        output: expect.any(Number),
        total: expect.any(Number),
      }),
    );
    expect(JSON.stringify(generation?.metadata)).toContain('ai.response.providerMetadata');
    expect(providerCost).toBe(detailed.cost);
    expect(providerCost).toBeGreaterThan(0);
    expect(normalizedTraceCost).toBeCloseTo(providerCost, 8);
    expect(normalizedGenerationCostTotal).toBeCloseTo(providerCost, 8);
  }, 150_000);
});
