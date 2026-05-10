import { createHash } from 'node:crypto';

const DEFAULT_CACHE_NAMESPACE = 'funcai';
const DEFAULT_CACHE_TTL_SECONDS = 300;
const CACHE_KEY_VERSION = 1;
const CACHE_ENTRY_KIND = 'funcai.cached-result';

export type CacheProvider = {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, options?: CacheSetOptions) => Promise<void>;
  delete?: (key: string) => Promise<void>;
  getMany?: <T>(keys: string[]) => Promise<Array<T | null>>;
  setMany?: <T>(entries: CacheSetEntry<T>[]) => Promise<void>;
};

export type CacheSetOptions = {
  ttlSeconds?: number;
};

export type CacheSetEntry<T> = {
  key: string;
  value: T;
  ttlSeconds?: number;
};

export type CachePolicy = {
  /**
   * Cache namespace. Use this to isolate apps, environments, or tenants sharing
   * the same backing cache.
   *
   * @example
   * ```ts
   * createAiFn({ provider, cache, cachePolicy: { namespace: "support-ai" } })
   * ```
   */
  namespace?: string;
  /**
   * Default TTL for cached function results.
   *
   * @example
   * ```ts
   * ai.fn({ cache: { ttlSeconds: 600 }, ... })
   * ```
   */
  ttlSeconds?: number;
  /**
   * Manual cache-busting version. Bump this when prompt meaning, transform logic,
   * or schema shape changes.
   */
  version?: string;
};

export type FnCacheConfig = boolean | CachePolicy;

export type CacheControl = {
  /** Skip cache read/write and force a provider call for this invocation. */
  bypass?: boolean;
  /** Override the configured TTL for the write produced by this invocation. */
  ttlSeconds?: number;
};

export type CacheMetadata = {
  hit: boolean;
  key: string;
  namespace: string;
  ttlSeconds: number;
  ageMs?: number;
};

export type ResolvedCacheConfig = {
  namespace: string;
  ttlSeconds: number;
  version: string;
};

export type CacheKeyInput = {
  featureId: string;
  providerId?: string;
  primaryModel: string;
  fallback: string[];
  systemPrompt: string;
  messages: unknown[];
  userContent: unknown;
  params: Record<string, unknown>;
  cache: ResolvedCacheConfig;
};

export type CachedDetailedResult<TOutput> = {
  kind: typeof CACHE_ENTRY_KIND;
  createdAt: number;
  output: TOutput;
  model: string;
};

type MemoryEntry = {
  value: unknown;
  expiresAt?: number;
};

export type MemoryCache = CacheProvider & {
  readonly size: number;
  clear: () => void;
  keys: () => string[];
};

const sha256Hex = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const toBytes = (value: ArrayBuffer | Uint8Array | Buffer) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return Buffer.from(value);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const normalizeForCacheKey = (value: unknown): unknown => {
  if (value === undefined) return { $funcai: 'undefined' };
  if (value === null) return null;

  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : { $funcai: 'number', value: String(value) };
  }
  if (typeof value === 'bigint') return { $funcai: 'bigint', value: value.toString() };

  if (value instanceof Date) return { $funcai: 'date', value: value.toISOString() };
  if (value instanceof URL) return { $funcai: 'url', value: value.href };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array || value instanceof ArrayBuffer) {
    const bytes = toBytes(value);
    return {
      $funcai: 'bytes',
      byteLength: bytes.byteLength,
      sha256: sha256Hex(bytes),
    };
  }

  if (Array.isArray(value)) return value.map(normalizeForCacheKey);

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeForCacheKey(entryValue)]),
    );
  }

  if (typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') {
    return normalizeForCacheKey(value.toJSON());
  }

  return String(value);
};

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForCacheKey(value));
}

export function buildCacheKey(input: CacheKeyInput): string {
  const payload = {
    v: CACHE_KEY_VERSION,
    featureId: input.featureId,
    providerId: input.providerId,
    primaryModel: input.primaryModel,
    fallback: input.fallback,
    systemPrompt: input.systemPrompt,
    messages: input.messages,
    userContent: input.userContent,
    params: input.params,
    cacheVersion: input.cache.version,
  };

  return `${input.cache.namespace}:result:${sha256Hex(stableStringify(payload))}`;
}

export function resolveCacheConfig({
  cacheProvider,
  factoryPolicy,
  fnCache,
  callControl,
}: {
  cacheProvider?: CacheProvider;
  factoryPolicy?: CachePolicy;
  fnCache?: FnCacheConfig;
  callControl?: CacheControl;
}): ResolvedCacheConfig | null {
  if (!cacheProvider || !fnCache || callControl?.bypass) return null;

  const fnPolicy = fnCache === true ? {} : fnCache;
  const ttlSeconds =
    callControl?.ttlSeconds ??
    fnPolicy.ttlSeconds ??
    factoryPolicy?.ttlSeconds ??
    DEFAULT_CACHE_TTL_SECONDS;

  if (ttlSeconds <= 0) return null;

  return {
    namespace: fnPolicy.namespace ?? factoryPolicy?.namespace ?? DEFAULT_CACHE_NAMESPACE,
    ttlSeconds,
    version: fnPolicy.version ?? factoryPolicy?.version ?? 'v1',
  };
}

export function toCachedDetailedResult<TOutput>(
  output: TOutput,
  model: string,
): CachedDetailedResult<TOutput> {
  return {
    kind: CACHE_ENTRY_KIND,
    createdAt: Date.now(),
    output,
    model,
  };
}

export function parseCachedDetailedResult<TOutput>(
  value: unknown,
): CachedDetailedResult<TOutput> | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<CachedDetailedResult<TOutput>>;
  if (entry.kind !== CACHE_ENTRY_KIND) return null;
  if (typeof entry.createdAt !== 'number') return null;
  if (typeof entry.model !== 'string') return null;
  if (!('output' in entry)) return null;

  return entry as CachedDetailedResult<TOutput>;
}

/**
 * Creates a tiny in-memory cache provider for local development, tests, and
 * examples. Production apps can provide the same `CacheProvider` contract with
 * Redis, KV, D1, localStorage wrappers, or any async store.
 *
 * @example
 * ```ts
 * const cache = createMemoryCache()
 * const ai = createAiFn({ provider: openrouter(), cache })
 * ```
 */
export function createMemoryCache(): MemoryCache {
  const entries = new Map<string, MemoryEntry>();

  const deleteExpired = (key: string, entry: MemoryEntry) => {
    if (entry.expiresAt === undefined || entry.expiresAt > Date.now()) return false;
    entries.delete(key);
    return true;
  };

  const get = async <T>(key: string): Promise<T | null> => {
    const entry = entries.get(key);
    if (!entry) return null;
    if (deleteExpired(key, entry)) return null;
    return entry.value as T;
  };

  const set = async <T>(key: string, value: T, options?: CacheSetOptions): Promise<void> => {
    entries.set(key, {
      value,
      ...(options?.ttlSeconds && { expiresAt: Date.now() + options.ttlSeconds * 1000 }),
    });
  };

  return {
    get size() {
      for (const [key, entry] of entries) deleteExpired(key, entry);
      return entries.size;
    },
    get,
    set,
    async delete(key: string): Promise<void> {
      entries.delete(key);
    },
    async getMany<T>(keys: string[]): Promise<Array<T | null>> {
      return Promise.all(keys.map((key) => get<T>(key)));
    },
    async setMany<T>(newEntries: CacheSetEntry<T>[]): Promise<void> {
      await Promise.all(
        newEntries.map((entry) => set(entry.key, entry.value, { ttlSeconds: entry.ttlSeconds })),
      );
    },
    clear() {
      entries.clear();
    },
    keys() {
      for (const [key, entry] of entries) deleteExpired(key, entry);
      return [...entries.keys()];
    },
  };
}
