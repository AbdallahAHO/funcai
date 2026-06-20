// Auto-generated from Cloudflare Workers AI docs — run `pnpm update:cloudflare-models --write` to refresh
// Last updated: 2026-06-20

export type CloudflareInputModality = 'text' | 'image';

export type CloudflareModelInfo = {
  name: string;
  provider: string;
  description: string;
  contextLength: number | null;
  /** USD per million tokens when Cloudflare publishes token-based pricing */
  pricing: {
    promptPerMToken: number | null;
    cachedPromptPerMToken: number | null;
    completionPerMToken: number | null;
    raw: string;
  };
  modalities: readonly CloudflareInputModality[];
  capabilities: {
    structuredOutput: true;
    tools: boolean;
    reasoning: boolean;
    vision: boolean;
    batch: boolean;
  };
  structuredOutputSource: 'json-mode' | 'model-page';
  sourceUrl: string;
};

/**
 * Cloudflare Workers AI text-generation models with explicit structured-output support.
 *
 * Models only enter this registry when Cloudflare docs explicitly document
 * structured output support through the JSON Mode supported-model list or a
 * model page that exposes controls such as `response_format` or `guided_json`.
 * Non-chat, embeddings, image, speech, transcription, reranking,
 * planned-deprecation, missing-page, and unknown structured-output models are
 * intentionally excluded.
 */
export const CLOUDFLARE_MODELS = {
  /** DeepSeek-R1-Distill-Qwen-32B is a model distilled from DeepSeek-R1 based on Qwen2.5. It outperforms OpenAI-o1-mini across various benchmarks, achieving new state-of-the-art results for dense models. */
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b': {
    name: 'deepseek-r1-distill-qwen-32b',
    provider: 'DeepSeek',
    description:
      'DeepSeek-R1-Distill-Qwen-32B is a model distilled from DeepSeek-R1 based on Qwen2.5. It outperforms OpenAI-o1-mini across various benchmarks, achieving new state-of-the-art results for dense models.',
    contextLength: 80_000,
    pricing: {
      promptPerMToken: 0.5,
      cachedPromptPerMToken: null,
      completionPerMToken: 4.88,
      raw: '$0.50 per M input tokens, $4.88 per M output tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: false,
      reasoning: true,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'json-mode',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/deepseek-r1-distill-qwen-32b/',
  },

  /** Gemma 4 is Google\'s most intelligent family of open models, built from Gemini 3 research to maximize intelligence-per-parameter. */
  '@cf/google/gemma-4-26b-a4b-it': {
    name: 'gemma-4-26b-a4b-it',
    provider: 'Google',
    description:
      "Gemma 4 is Google's most intelligent family of open models, built from Gemini 3 research to maximize intelligence-per-parameter.",
    contextLength: 256_000,
    pricing: {
      promptPerMToken: 0.1,
      cachedPromptPerMToken: null,
      completionPerMToken: 0.3,
      raw: '$0.10 per M input tokens, $0.30 per M output tokens',
    },
    modalities: ['text', 'image'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: true,
      vision: true,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/',
  },

  /** [Fast version] The Meta Llama 3.1 collection of multilingual large language models (LLMs) is a collection of pretrained and instruction tuned generative models. The Llama 3.1 instruction tuned text only models are optimized for multilingual dialogue use cases and outperform many of the available open source and closed chat models on common industry benchmarks. */
  '@cf/meta/llama-3.1-8b-instruct-fast': {
    name: 'llama-3.1-8b-instruct-fast',
    provider: 'Meta',
    description:
      '[Fast version] The Meta Llama 3.1 collection of multilingual large language models (LLMs) is a collection of pretrained and instruction tuned generative models. The Llama 3.1 instruction tuned text only models are optimized for multilingual dialogue use cases and outperform many of the available open source and closed chat models on common industry benchmarks.',
    contextLength: 128_000,
    pricing: {
      promptPerMToken: null,
      cachedPromptPerMToken: null,
      completionPerMToken: null,
      raw: '',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: false,
      reasoning: false,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'json-mode',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/',
  },

  /** The Llama 3.2-Vision instruction-tuned models are optimized for visual recognition, image reasoning, captioning, and answering general questions about an image. */
  '@cf/meta/llama-3.2-11b-vision-instruct': {
    name: 'llama-3.2-11b-vision-instruct',
    provider: 'Meta',
    description:
      'The Llama 3.2-Vision instruction-tuned models are optimized for visual recognition, image reasoning, captioning, and answering general questions about an image.',
    contextLength: 128_000,
    pricing: {
      promptPerMToken: 0.049,
      cachedPromptPerMToken: null,
      completionPerMToken: 0.68,
      raw: '$0.049 per M input tokens, $0.68 per M output tokens',
    },
    modalities: ['text', 'image'],
    capabilities: {
      structuredOutput: true,
      tools: false,
      reasoning: false,
      vision: true,
      batch: false,
    },
    structuredOutputSource: 'json-mode',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/',
  },

  /** Llama 3.3 70B quantized to fp8 precision, optimized to be faster. */
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': {
    name: 'llama-3.3-70b-instruct-fp8-fast',
    provider: 'Meta',
    description: 'Llama 3.3 70B quantized to fp8 precision, optimized to be faster.',
    contextLength: 24_000,
    pricing: {
      promptPerMToken: 0.29,
      cachedPromptPerMToken: null,
      completionPerMToken: 2.25,
      raw: '$0.29 per M input tokens, $2.25 per M output tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: false,
      vision: false,
      batch: true,
    },
    structuredOutputSource: 'json-mode',
    sourceUrl:
      'https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/',
  },

  /** Meta\'s Llama 4 Scout is a 17 billion parameter model with 16 experts that is natively multimodal. These models leverage a mixture-of-experts architecture to offer industry-leading performance in text and image understanding. */
  '@cf/meta/llama-4-scout-17b-16e-instruct': {
    name: 'llama-4-scout-17b-16e-instruct',
    provider: 'Meta',
    description:
      "Meta's Llama 4 Scout is a 17 billion parameter model with 16 experts that is natively multimodal. These models leverage a mixture-of-experts architecture to offer industry-leading performance in text and image understanding.",
    contextLength: 131_000,
    pricing: {
      promptPerMToken: 0.27,
      cachedPromptPerMToken: null,
      completionPerMToken: 0.85,
      raw: '$0.27 per M input tokens, $0.85 per M output tokens',
    },
    modalities: ['text', 'image'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: false,
      vision: true,
      batch: true,
    },
    structuredOutputSource: 'model-page',
    sourceUrl:
      'https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/',
  },

  /** Building upon Mistral Small 3 (2501), Mistral Small 3.1 (2503) adds state-of-the-art vision understanding and enhances long context capabilities up to 128k tokens without compromising text performance. With 24 billion parameters, this model achieves top-tier capabilities in both text and vision tasks. */
  '@cf/mistralai/mistral-small-3.1-24b-instruct': {
    name: 'mistral-small-3.1-24b-instruct',
    provider: 'MistralAI',
    description:
      'Building upon Mistral Small 3 (2501), Mistral Small 3.1 (2503) adds state-of-the-art vision understanding and enhances long context capabilities up to 128k tokens without compromising text performance. With 24 billion parameters, this model achieves top-tier capabilities in both text and vision tasks.',
    contextLength: 128_000,
    pricing: {
      promptPerMToken: 0.35,
      cachedPromptPerMToken: null,
      completionPerMToken: 0.56,
      raw: '$0.35 per M input tokens, $0.56 per M output tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: false,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl:
      'https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/',
  },

  /** Kimi K2.6 is a frontier-scale open-source 1T parameter model with a 262.1k context window, multi-turn tool calling, vision inputs, and structured outputs for agentic workloads. */
  '@cf/moonshotai/kimi-k2.6': {
    name: 'kimi-k2.6',
    provider: 'Moonshot AI',
    description:
      'Kimi K2.6 is a frontier-scale open-source 1T parameter model with a 262.1k context window, multi-turn tool calling, vision inputs, and structured outputs for agentic workloads.',
    contextLength: 262_144,
    pricing: {
      promptPerMToken: 0.95,
      cachedPromptPerMToken: 0.16,
      completionPerMToken: 4,
      raw: '$0.95 per M input tokens, $0.16 per M cached input tokens, $4.00 per M output tokens',
    },
    modalities: ['text', 'image'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: true,
      vision: true,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/kimi-k2.6/',
  },

  /** Kimi K2.7 is a frontier-scale open-source 1T parameter model with a 262.1k context window, multi-turn tool calling, vision inputs, and structured outputs for agentic workloads. */
  '@cf/moonshotai/kimi-k2.7-code': {
    name: 'kimi-k2.7-code',
    provider: 'Moonshot AI',
    description:
      'Kimi K2.7 is a frontier-scale open-source 1T parameter model with a 262.1k context window, multi-turn tool calling, vision inputs, and structured outputs for agentic workloads.',
    contextLength: 262_144,
    pricing: {
      promptPerMToken: 0.95,
      cachedPromptPerMToken: 0.19,
      completionPerMToken: 4,
      raw: '$0.95 per M input tokens, $4.00 per M output tokens, $0.19 per M cached input tokens',
    },
    modalities: ['text', 'image'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: true,
      vision: true,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/kimi-k2.7-code/',
  },

  /** NVIDIA Nemotron 3 Super is a hybrid MoE model with leading accuracy for multi-agent applications and specialized agentic AI systems. */
  '@cf/nvidia/nemotron-3-120b-a12b': {
    name: 'nemotron-3-120b-a12b',
    provider: 'NVIDIA',
    description:
      'NVIDIA Nemotron 3 Super is a hybrid MoE model with leading accuracy for multi-agent applications and specialized agentic AI systems.',
    contextLength: 256_000,
    pricing: {
      promptPerMToken: 0.5,
      cachedPromptPerMToken: null,
      completionPerMToken: 1.5,
      raw: '$0.50 per M input tokens, $1.50 per M output tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: true,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/nemotron-3-120b-a12b/',
  },

  /** QwQ is the reasoning model of the Qwen series. Compared with conventional instruction-tuned models, QwQ, which is capable of thinking and reasoning, can achieve significantly enhanced performance in downstream tasks, especially hard problems. QwQ-32B is the medium-sized reasoning model, which is capable of achieving competitive performance against state-of-the-art reasoning models, e.g., DeepSeek-R1, o1-mini. */
  '@cf/qwen/qwq-32b': {
    name: 'qwq-32b',
    provider: 'Qwen',
    description:
      'QwQ is the reasoning model of the Qwen series. Compared with conventional instruction-tuned models, QwQ, which is capable of thinking and reasoning, can achieve significantly enhanced performance in downstream tasks, especially hard problems. QwQ-32B is the medium-sized reasoning model, which is capable of achieving competitive performance against state-of-the-art reasoning models, e.g., DeepSeek-R1, o1-mini.',
    contextLength: 24_000,
    pricing: {
      promptPerMToken: 0.66,
      cachedPromptPerMToken: null,
      completionPerMToken: 1,
      raw: '$0.66 per M input tokens, $1.00 per M output tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: false,
      reasoning: true,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/qwq-32b/',
  },

  /** GLM-4.7-Flash is a fast and efficient multilingual text generation model with a 131,072 token context window. Optimized for dialogue, instruction-following, and multi-turn tool calling across 100+ languages. */
  '@cf/zai-org/glm-4.7-flash': {
    name: 'glm-4.7-flash',
    provider: 'Zhipu AI',
    description:
      'GLM-4.7-Flash is a fast and efficient multilingual text generation model with a 131,072 token context window. Optimized for dialogue, instruction-following, and multi-turn tool calling across 100+ languages.',
    contextLength: 131_072,
    pricing: {
      promptPerMToken: 0.06,
      cachedPromptPerMToken: null,
      completionPerMToken: 0.4,
      raw: '$0.06 per M input tokens, $0.40 per M output tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: true,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/',
  },

  /** Z.ai\'s flagship agentic coding model */
  '@cf/zai-org/glm-5.2': {
    name: 'glm-5.2',
    provider: 'Zhipu AI',
    description: "Z.ai's flagship agentic coding model",
    contextLength: 262_144,
    pricing: {
      promptPerMToken: 1.4,
      cachedPromptPerMToken: 0.26,
      completionPerMToken: 4.4,
      raw: '$1.40 per M input tokens, $4.40 per M output tokens, $0.26 per M cached input tokens',
    },
    modalities: ['text'],
    capabilities: {
      structuredOutput: true,
      tools: true,
      reasoning: true,
      vision: false,
      batch: false,
    },
    structuredOutputSource: 'model-page',
    sourceUrl: 'https://developers.cloudflare.com/workers-ai/models/glm-5.2/',
  },
} as const satisfies Record<string, CloudflareModelInfo>;

export type CloudflareModelId = keyof typeof CLOUDFLARE_MODELS;

export const CLOUDFLARE_MODEL_IDS = Object.keys(CLOUDFLARE_MODELS) as CloudflareModelId[];

const hasModality = (id: CloudflareModelId, modality: CloudflareInputModality): boolean =>
  (CLOUDFLARE_MODELS[id].modalities as readonly string[]).includes(modality);

export const CLOUDFLARE_MULTIMODAL_IMAGE_MODELS = CLOUDFLARE_MODEL_IDS.filter((id) =>
  hasModality(id, 'image'),
);

export const CLOUDFLARE_REASONING_MODELS = CLOUDFLARE_MODEL_IDS.filter(
  (id) => CLOUDFLARE_MODELS[id].capabilities.reasoning,
);

export const CLOUDFLARE_TOOL_CALLING_MODELS = CLOUDFLARE_MODEL_IDS.filter(
  (id) => CLOUDFLARE_MODELS[id].capabilities.tools,
);
