// Auto-generated from OpenRouter API — run `pnpm update:models` to refresh
// Last updated: 2026-06-29

export type InputModality = 'text' | 'image' | 'file' | 'audio' | 'video';

export type ModelInfo = {
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  maxCompletionTokens: number | null;
  /** USD per million tokens */
  pricing: { promptPerMToken: number; completionPerMToken: number };
  modalities: readonly InputModality[];
  capabilities: { structuredOutput: boolean; tools: boolean; reasoning: boolean };
};

/**
 * Curated registry of popular OpenRouter models that support structured output.
 * Each entry contains pricing, modality flags, and capability metadata.
 *
 * Use `OpenRouterModelId` for typed model selection, or access this object
 * at runtime for CLI tooling, scaffold prompts, and model pickers.
 */
export const OPENROUTER_MODELS = {
  /** Claude Fable 5 is a Mythos-class model from Anthropic, built for autonomous knowledge work and coding. It supports text, */
  'anthropic/claude-fable-5': {
    name: 'Anthropic: Claude Fable 5',
    provider: 'Anthropic',
    description:
      'Claude Fable 5 is a Mythos-class model from Anthropic, built for autonomous knowledge work and coding. It supports text,',
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 10, completionPerMToken: 50 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Claude Haiku 4.5 is Anthropic’s fastest and most efficient model, delivering near-frontier intelligence at a fraction of */
  'anthropic/claude-haiku-4.5': {
    name: 'Anthropic: Claude Haiku 4.5',
    provider: 'Anthropic',
    description:
      'Claude Haiku 4.5 is Anthropic’s fastest and most efficient model, delivering near-frontier intelligence at a fraction of',
    contextLength: 200_000,
    maxCompletionTokens: 64_000,
    pricing: { promptPerMToken: 1, completionPerMToken: 5 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Claude Opus 4.1 is an updated version of Anthropic’s flagship model, offering improved performance in coding, reasoning, */
  'anthropic/claude-opus-4.1': {
    name: 'Anthropic: Claude Opus 4.1',
    provider: 'Anthropic',
    description:
      'Claude Opus 4.1 is an updated version of Anthropic’s flagship model, offering improved performance in coding, reasoning,',
    contextLength: 200_000,
    maxCompletionTokens: 32_000,
    pricing: { promptPerMToken: 15, completionPerMToken: 75 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Claude Opus 4.5 is Anthropic’s frontier reasoning model optimized for complex software engineering, agentic workflows, a */
  'anthropic/claude-opus-4.5': {
    name: 'Anthropic: Claude Opus 4.5',
    provider: 'Anthropic',
    description:
      'Claude Opus 4.5 is Anthropic’s frontier reasoning model optimized for complex software engineering, agentic workflows, a',
    contextLength: 200_000,
    maxCompletionTokens: 64_000,
    pricing: { promptPerMToken: 5, completionPerMToken: 25 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Opus 4.6 is Anthropic’s strongest model for coding and long-running professional tasks. It is built for agents that oper */
  'anthropic/claude-opus-4.6': {
    name: 'Anthropic: Claude Opus 4.6',
    provider: 'Anthropic',
    description:
      'Opus 4.6 is Anthropic’s strongest model for coding and long-running professional tasks. It is built for agents that oper',
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 5, completionPerMToken: 25 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Fast-mode variant of [Opus 4.6](/anthropic/claude-opus-4.6) - identical capabilities with higher output speed at premium */
  'anthropic/claude-opus-4.6-fast': {
    name: 'Anthropic: Claude Opus 4.6 (Fast)',
    provider: 'Anthropic',
    description:
      'Fast-mode variant of [Opus 4.6](/anthropic/claude-opus-4.6) - identical capabilities with higher output speed at premium',
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 30, completionPerMToken: 150 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Opus 4.7 is the next generation of Anthropic\'s Opus family, built for long-running, asynchronous agents. Building on the */
  'anthropic/claude-opus-4.7': {
    name: 'Anthropic: Claude Opus 4.7',
    provider: 'Anthropic',
    description:
      "Opus 4.7 is the next generation of Anthropic's Opus family, built for long-running, asynchronous agents. Building on the",
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 5, completionPerMToken: 25 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Fast-mode variant of [Opus 4.7](/anthropic/claude-opus-4.7) - identical capabilities with higher output speed at premium */
  'anthropic/claude-opus-4.7-fast': {
    name: 'Anthropic: Claude Opus 4.7 (Fast)',
    provider: 'Anthropic',
    description:
      'Fast-mode variant of [Opus 4.7](/anthropic/claude-opus-4.7) - identical capabilities with higher output speed at premium',
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 30, completionPerMToken: 150 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Claude Opus 4.8 is Anthropic\'s most capable generally available model in the Opus family. It supports text, image, and f */
  'anthropic/claude-opus-4.8': {
    name: 'Anthropic: Claude Opus 4.8',
    provider: 'Anthropic',
    description:
      "Claude Opus 4.8 is Anthropic's most capable generally available model in the Opus family. It supports text, image, and f",
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 5, completionPerMToken: 25 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Fast-mode variant of [Opus 4.8](/anthropic/claude-opus-4.8) - identical capabilities with higher output speed at 2x pric */
  'anthropic/claude-opus-4.8-fast': {
    name: 'Anthropic: Claude Opus 4.8 (Fast)',
    provider: 'Anthropic',
    description:
      'Fast-mode variant of [Opus 4.8](/anthropic/claude-opus-4.8) - identical capabilities with higher output speed at 2x pric',
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 10, completionPerMToken: 50 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Claude Sonnet 4.5 is Anthropic’s most advanced Sonnet model to date, optimized for real-world agents and coding workflow */
  'anthropic/claude-sonnet-4.5': {
    name: 'Anthropic: Claude Sonnet 4.5',
    provider: 'Anthropic',
    description:
      'Claude Sonnet 4.5 is Anthropic’s most advanced Sonnet model to date, optimized for real-world agents and coding workflow',
    contextLength: 1_000_000,
    maxCompletionTokens: 64_000,
    pricing: { promptPerMToken: 3, completionPerMToken: 15 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Sonnet 4.6 is Anthropic\'s most capable Sonnet-class model yet, with frontier performance across coding, agents, and prof */
  'anthropic/claude-sonnet-4.6': {
    name: 'Anthropic: Claude Sonnet 4.6',
    provider: 'Anthropic',
    description:
      "Sonnet 4.6 is Anthropic's most capable Sonnet-class model yet, with frontier performance across coding, agents, and prof",
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 3, completionPerMToken: 15 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** DeepSeek-V3 is the latest model from the DeepSeek team, building upon the instruction following and coding abilities of  */
  'deepseek/deepseek-chat': {
    name: 'DeepSeek: DeepSeek V3',
    provider: 'DeepSeek',
    description:
      'DeepSeek-V3 is the latest model from the DeepSeek team, building upon the instruction following and coding abilities of ',
    contextLength: 131_072,
    maxCompletionTokens: 16_000,
    pricing: { promptPerMToken: 0.2, completionPerMToken: 0.8 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** DeepSeek-V3.1 is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinki */
  'deepseek/deepseek-chat-v3.1': {
    name: 'DeepSeek: DeepSeek V3.1',
    provider: 'DeepSeek',
    description:
      'DeepSeek-V3.1 is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinki',
    contextLength: 163_840,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.21, completionPerMToken: 0.79 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** DeepSeek R1 is here: Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tok */
  'deepseek/deepseek-r1': {
    name: 'DeepSeek: R1',
    provider: 'DeepSeek',
    description:
      'DeepSeek R1 is here: Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tok',
    contextLength: 163_840,
    maxCompletionTokens: 16_000,
    pricing: { promptPerMToken: 0.7, completionPerMToken: 2.5 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** May 28th update to the [original DeepSeek R1](/deepseek/deepseek-r1) Performance on par with [OpenAI o1](/openai/o1), bu */
  'deepseek/deepseek-r1-0528': {
    name: 'DeepSeek: R1 0528',
    provider: 'DeepSeek',
    description:
      'May 28th update to the [original DeepSeek R1](/deepseek/deepseek-r1) Performance on par with [OpenAI o1](/openai/o1), bu',
    contextLength: 163_840,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.5, completionPerMToken: 2.15 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** DeepSeek-V3.1 Terminus is an update to [DeepSeek V3.1](/deepseek/deepseek-chat-v3.1) that maintains the model\'s original */
  'deepseek/deepseek-v3.1-terminus': {
    name: 'DeepSeek: DeepSeek V3.1 Terminus',
    provider: 'DeepSeek',
    description:
      "DeepSeek-V3.1 Terminus is an update to [DeepSeek V3.1](/deepseek/deepseek-chat-v3.1) that maintains the model's original",
    contextLength: 163_840,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.27, completionPerMToken: 0.95 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** DeepSeek-V3.2 is a large language model designed to harmonize high computational efficiency with strong reasoning and ag */
  'deepseek/deepseek-v3.2': {
    name: 'DeepSeek: DeepSeek V3.2',
    provider: 'DeepSeek',
    description:
      'DeepSeek-V3.2 is a large language model designed to harmonize high computational efficiency with strong reasoning and ag',
    contextLength: 131_072,
    maxCompletionTokens: 64_000,
    pricing: { promptPerMToken: 0.229, completionPerMToken: 0.343 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** DeepSeek V4 Flash is an efficiency-optimized Mixture-of-Experts model from DeepSeek with 284B total parameters and 13B a */
  'deepseek/deepseek-v4-flash': {
    name: 'DeepSeek: DeepSeek V4 Flash',
    provider: 'DeepSeek',
    description:
      'DeepSeek V4 Flash is an efficiency-optimized Mixture-of-Experts model from DeepSeek with 284B total parameters and 13B a',
    contextLength: 1_048_576,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.09, completionPerMToken: 0.18 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 2.5 Flash is Google\'s state-of-the-art workhorse model, specifically designed for advanced reasoning, coding, mat */
  'google/gemini-2.5-flash': {
    name: 'Google: Gemini 2.5 Flash',
    provider: 'Google',
    description:
      "Gemini 2.5 Flash is Google's state-of-the-art workhorse model, specifically designed for advanced reasoning, coding, mat",
    contextLength: 1_048_576,
    maxCompletionTokens: 65_535,
    pricing: { promptPerMToken: 0.3, completionPerMToken: 2.5 },
    modalities: ['file', 'image', 'text', 'audio', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 2.5 Flash-Lite is a lightweight reasoning model in the Gemini 2.5 family, optimized for ultra-low latency and cos */
  'google/gemini-2.5-flash-lite': {
    name: 'Google: Gemini 2.5 Flash Lite',
    provider: 'Google',
    description:
      'Gemini 2.5 Flash-Lite is a lightweight reasoning model in the Gemini 2.5 family, optimized for ultra-low latency and cos',
    contextLength: 1_048_576,
    maxCompletionTokens: 65_535,
    pricing: { promptPerMToken: 0.1, completionPerMToken: 0.4 },
    modalities: ['text', 'image', 'file', 'audio', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 3 Flash Preview is a high speed, high value thinking model designed for agentic workflows, multi turn chat, and c */
  'google/gemini-3-flash-preview': {
    name: 'Google: Gemini 3 Flash Preview',
    provider: 'Google',
    description:
      'Gemini 3 Flash Preview is a high speed, high value thinking model designed for agentic workflows, multi turn chat, and c',
    contextLength: 1_048_576,
    maxCompletionTokens: 65_535,
    pricing: { promptPerMToken: 0.5, completionPerMToken: 3 },
    modalities: ['text', 'image', 'file', 'audio', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 3.1 Flash Image Preview, a.k.a. "Nano Banana 2," is Google’s latest state of the art image generation and editing */
  'google/gemini-3.1-flash-image-preview': {
    name: 'Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)',
    provider: 'Google',
    description:
      'Gemini 3.1 Flash Image Preview, a.k.a. "Nano Banana 2," is Google’s latest state of the art image generation and editing',
    contextLength: 131_072,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.5, completionPerMToken: 3 },
    modalities: ['image', 'text'],
    capabilities: { structuredOutput: true, tools: false, reasoning: true },
  },

  /** Gemini 3.1 Flash Lite is Google’s GA high-efficiency multimodal model optimized for low-latency, high-volume workloads.  */
  'google/gemini-3.1-flash-lite': {
    name: 'Google: Gemini 3.1 Flash Lite',
    provider: 'Google',
    description:
      'Gemini 3.1 Flash Lite is Google’s GA high-efficiency multimodal model optimized for low-latency, high-volume workloads. ',
    contextLength: 1_048_576,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.25, completionPerMToken: 1.5 },
    modalities: ['text', 'image', 'video', 'file', 'audio'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 3.1 Flash Lite Preview is Google\'s high-efficiency model optimized for high-volume use cases. It outperforms Gemi */
  'google/gemini-3.1-flash-lite-preview': {
    name: 'Google: Gemini 3.1 Flash Lite Preview',
    provider: 'Google',
    description:
      "Gemini 3.1 Flash Lite Preview is Google's high-efficiency model optimized for high-volume use cases. It outperforms Gemi",
    contextLength: 1_048_576,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.25, completionPerMToken: 1.5 },
    modalities: ['text', 'image', 'video', 'file', 'audio'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 3.1 Pro Preview is Google’s frontier reasoning model, delivering enhanced software engineering performance, impro */
  'google/gemini-3.1-pro-preview': {
    name: 'Google: Gemini 3.1 Pro Preview',
    provider: 'Google',
    description:
      'Gemini 3.1 Pro Preview is Google’s frontier reasoning model, delivering enhanced software engineering performance, impro',
    contextLength: 1_048_576,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 2, completionPerMToken: 12 },
    modalities: ['audio', 'file', 'image', 'text', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 3.1 Pro Preview Custom Tools is a variant of Gemini 3.1 Pro that improves tool selection behavior by preventing o */
  'google/gemini-3.1-pro-preview-customtools': {
    name: 'Google: Gemini 3.1 Pro Preview Custom Tools',
    provider: 'Google',
    description:
      'Gemini 3.1 Pro Preview Custom Tools is a variant of Gemini 3.1 Pro that improves tool selection behavior by preventing o',
    contextLength: 1_048_756,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 2, completionPerMToken: 12 },
    modalities: ['text', 'audio', 'image', 'video', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Gemini 3.5 Flash is Google\'s high-efficiency multimodal model, bringing near-Pro level coding and reasoning at Flash-tie */
  'google/gemini-3.5-flash': {
    name: 'Google: Gemini 3.5 Flash',
    provider: 'Google',
    description:
      "Gemini 3.5 Flash is Google's high-efficiency multimodal model, bringing near-Pro level coding and reasoning at Flash-tie",
    contextLength: 1_048_576,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 1.5, completionPerMToken: 9 },
    modalities: ['text', 'image', 'video', 'file', 'audio'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** The Meta Llama 3.3 multilingual large language model (LLM) is a pretrained and instruction tuned generative model in 70B */
  'meta-llama/llama-3.3-70b-instruct': {
    name: 'Meta: Llama 3.3 70B Instruct',
    provider: 'Meta',
    description:
      'The Meta Llama 3.3 multilingual large language model (LLM) is a pretrained and instruction tuned generative model in 70B',
    contextLength: 131_072,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 0.1, completionPerMToken: 0.32 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-exper */
  'meta-llama/llama-4-maverick': {
    name: 'Meta: Llama 4 Maverick',
    provider: 'Meta',
    description:
      'Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-exper',
    contextLength: 1_048_576,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 0.15, completionPerMToken: 0.6 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Llama 4 Scout 17B Instruct (16E) is a mixture-of-experts (MoE) language model developed by Meta, activating 17 billion p */
  'meta-llama/llama-4-scout': {
    name: 'Meta: Llama 4 Scout',
    provider: 'Meta',
    description:
      'Llama 4 Scout 17B Instruct (16E) is a mixture-of-experts (MoE) language model developed by Meta, activating 17 billion p',
    contextLength: 10_000_000,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 0.1, completionPerMToken: 0.3 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Mistral\'s cutting-edge language model for coding released end of July 2025. Codestral specializes in low-latency, high-f */
  'mistralai/codestral-2508': {
    name: 'Mistral: Codestral 2508',
    provider: 'Mistral',
    description:
      "Mistral's cutting-edge language model for coding released end of July 2025. Codestral specializes in low-latency, high-f",
    contextLength: 256_000,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.3, completionPerMToken: 0.9 },
    modalities: ['text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Devstral 2 is a state-of-the-art open-source model by Mistral AI specializing in agentic coding. It is a 123B-parameter  */
  'mistralai/devstral-2512': {
    name: 'Mistral: Devstral 2 2512',
    provider: 'Mistral',
    description:
      'Devstral 2 is a state-of-the-art open-source model by Mistral AI specializing in agentic coding. It is a 123B-parameter ',
    contextLength: 262_144,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.4, completionPerMToken: 2 },
    modalities: ['text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** The largest model in the Ministral 3 family, Ministral 3 14B offers frontier capabilities and performance comparable to  */
  'mistralai/ministral-14b-2512': {
    name: 'Mistral: Ministral 3 14B 2512',
    provider: 'Mistral',
    description:
      'The largest model in the Ministral 3 family, Ministral 3 14B offers frontier capabilities and performance comparable to ',
    contextLength: 262_144,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.2, completionPerMToken: 0.2 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** The smallest model in the Ministral 3 family, Ministral 3 3B is a powerful, efficient tiny language model with vision ca */
  'mistralai/ministral-3b-2512': {
    name: 'Mistral: Ministral 3 3B 2512',
    provider: 'Mistral',
    description:
      'The smallest model in the Ministral 3 family, Ministral 3 3B is a powerful, efficient tiny language model with vision ca',
    contextLength: 131_072,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.1, completionPerMToken: 0.1 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** A balanced model in the Ministral 3 family, Ministral 3 8B is a powerful, efficient tiny language model with vision capa */
  'mistralai/ministral-8b-2512': {
    name: 'Mistral: Ministral 3 8B 2512',
    provider: 'Mistral',
    description:
      'A balanced model in the Ministral 3 family, Ministral 3 8B is a powerful, efficient tiny language model with vision capa',
    contextLength: 262_144,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.15, completionPerMToken: 0.15 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Mistral Large 3 2512 is Mistral’s most capable model to date, featuring a sparse mixture-of-experts architecture with 41 */
  'mistralai/mistral-large-2512': {
    name: 'Mistral: Mistral Large 3 2512',
    provider: 'Mistral',
    description:
      'Mistral Large 3 2512 is Mistral’s most capable model to date, featuring a sparse mixture-of-experts architecture with 41',
    contextLength: 262_144,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.5, completionPerMToken: 1.5 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Mistral Medium 3.5 is a dense 128B instruction-following model from Mistral AI. It supports text and image inputs with t */
  'mistralai/mistral-medium-3-5': {
    name: 'Mistral: Mistral Medium 3.5',
    provider: 'Mistral',
    description:
      'Mistral Medium 3.5 is a dense 128B instruction-following model from Mistral AI. It supports text and image inputs with t',
    contextLength: 262_144,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 1.5, completionPerMToken: 7.5 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Mistral Medium 3.1 is an updated version of Mistral Medium 3, which is a high-performance enterprise-grade language mode */
  'mistralai/mistral-medium-3.1': {
    name: 'Mistral: Mistral Medium 3.1',
    provider: 'Mistral',
    description:
      'Mistral Medium 3.1 is an updated version of Mistral Medium 3, which is a high-performance enterprise-grade language mode',
    contextLength: 131_072,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.4, completionPerMToken: 2 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-4.1 is a flagship large language model optimized for advanced instruction following, real-world software engineering */
  'openai/gpt-4.1': {
    name: 'OpenAI: GPT-4.1',
    provider: 'OpenAI',
    description:
      'GPT-4.1 is a flagship large language model optimized for advanced instruction following, real-world software engineering',
    contextLength: 1_047_576,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 2, completionPerMToken: 8 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-4.1 Mini is a mid-sized model delivering performance competitive with GPT-4o at substantially lower latency and cost */
  'openai/gpt-4.1-mini': {
    name: 'OpenAI: GPT-4.1 Mini',
    provider: 'OpenAI',
    description:
      'GPT-4.1 Mini is a mid-sized model delivering performance competitive with GPT-4o at substantially lower latency and cost',
    contextLength: 1_047_576,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.4, completionPerMToken: 1.6 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** For tasks that demand low latency, GPT‑4.1 nano is the fastest and cheapest model in the GPT-4.1 series. It delivers exc */
  'openai/gpt-4.1-nano': {
    name: 'OpenAI: GPT-4.1 Nano',
    provider: 'OpenAI',
    description:
      'For tasks that demand low latency, GPT‑4.1 nano is the fastest and cheapest model in the GPT-4.1 series. It delivers exc',
    contextLength: 1_047_576,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.1, completionPerMToken: 0.4 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-4o ("o" for "omni") is OpenAI\'s latest AI model, supporting both text and image inputs with text outputs. It maintai */
  'openai/gpt-4o': {
    name: 'OpenAI: GPT-4o',
    provider: 'OpenAI',
    description:
      'GPT-4o ("o" for "omni") is OpenAI\'s latest AI model, supporting both text and image inputs with text outputs. It maintai',
    contextLength: 128_000,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 2.5, completionPerMToken: 10 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-4o mini is OpenAI\'s newest model after [GPT-4 Omni](/models/openai/gpt-4o), supporting both text and image inputs wi */
  'openai/gpt-4o-mini': {
    name: 'OpenAI: GPT-4o-mini',
    provider: 'OpenAI',
    description:
      "GPT-4o mini is OpenAI's newest model after [GPT-4 Omni](/models/openai/gpt-4o), supporting both text and image inputs wi",
    contextLength: 128_000,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 0.15, completionPerMToken: 0.6 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-5 is OpenAI’s most advanced model, offering major improvements in reasoning, code quality, and user experience. It i */
  'openai/gpt-5': {
    name: 'OpenAI: GPT-5',
    provider: 'OpenAI',
    description:
      'GPT-5 is OpenAI’s most advanced model, offering major improvements in reasoning, code quality, and user experience. It i',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications. */
  'openai/gpt-5-chat': {
    name: 'OpenAI: GPT-5 Chat',
    provider: 'OpenAI',
    description:
      'GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications.',
    contextLength: 128_000,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: false, reasoning: false },
  },

  /** GPT-5-Codex is a specialized version of GPT-5 optimized for software engineering and coding workflows. It is designed fo */
  'openai/gpt-5-codex': {
    name: 'OpenAI: GPT-5 Codex',
    provider: 'OpenAI',
    description:
      'GPT-5-Codex is a specialized version of GPT-5 optimized for software engineering and coding workflows. It is designed fo',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5 Mini is a compact version of GPT-5, designed to handle lighter-weight reasoning tasks. It provides the same instru */
  'openai/gpt-5-mini': {
    name: 'OpenAI: GPT-5 Mini',
    provider: 'OpenAI',
    description:
      'GPT-5 Mini is a compact version of GPT-5, designed to handle lighter-weight reasoning tasks. It provides the same instru',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 0.25, completionPerMToken: 2 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5-Nano is the smallest and fastest variant in the GPT-5 system, optimized for developer tools, rapid interactions, a */
  'openai/gpt-5-nano': {
    name: 'OpenAI: GPT-5 Nano',
    provider: 'OpenAI',
    description:
      'GPT-5-Nano is the smallest and fastest variant in the GPT-5 system, optimized for developer tools, rapid interactions, a',
    contextLength: 400_000,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.05, completionPerMToken: 0.4 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.1 is the latest frontier-grade model in the GPT-5 series, offering stronger general-purpose reasoning, improved in */
  'openai/gpt-5.1': {
    name: 'OpenAI: GPT-5.1',
    provider: 'OpenAI',
    description:
      'GPT-5.1 is the latest frontier-grade model in the GPT-5 series, offering stronger general-purpose reasoning, improved in',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.1 Chat (AKA Instant is the fast, lightweight member of the 5.1 family, optimized for low-latency chat while retain */
  'openai/gpt-5.1-chat': {
    name: 'OpenAI: GPT-5.1 Chat',
    provider: 'OpenAI',
    description:
      'GPT-5.1 Chat (AKA Instant is the fast, lightweight member of the 5.1 family, optimized for low-latency chat while retain',
    contextLength: 128_000,
    maxCompletionTokens: 32_000,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-5.1-Codex is a specialized version of GPT-5.1 optimized for software engineering and coding workflows. It is designe */
  'openai/gpt-5.1-codex': {
    name: 'OpenAI: GPT-5.1-Codex',
    provider: 'OpenAI',
    description:
      'GPT-5.1-Codex is a specialized version of GPT-5.1 optimized for software engineering and coding workflows. It is designe',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.1-Codex-Max is OpenAI’s latest agentic coding model, designed for long-running, high-context software development  */
  'openai/gpt-5.1-codex-max': {
    name: 'OpenAI: GPT-5.1-Codex-Max',
    provider: 'OpenAI',
    description:
      'GPT-5.1-Codex-Max is OpenAI’s latest agentic coding model, designed for long-running, high-context software development ',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 10 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.1-Codex-Mini is a smaller and faster version of GPT-5.1-Codex */
  'openai/gpt-5.1-codex-mini': {
    name: 'OpenAI: GPT-5.1-Codex-Mini',
    provider: 'OpenAI',
    description: 'GPT-5.1-Codex-Mini is a smaller and faster version of GPT-5.1-Codex',
    contextLength: 400_000,
    maxCompletionTokens: 100_000,
    pricing: { promptPerMToken: 0.25, completionPerMToken: 2 },
    modalities: ['image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.2 is the latest frontier-grade model in the GPT-5 series, offering stronger agentic and long context perfomance co */
  'openai/gpt-5.2': {
    name: 'OpenAI: GPT-5.2',
    provider: 'OpenAI',
    description:
      'GPT-5.2 is the latest frontier-grade model in the GPT-5 series, offering stronger agentic and long context perfomance co',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.75, completionPerMToken: 14 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.2 Chat (AKA Instant) is the fast, lightweight member of the 5.2 family, optimized for low-latency chat while retai */
  'openai/gpt-5.2-chat': {
    name: 'OpenAI: GPT-5.2 Chat',
    provider: 'OpenAI',
    description:
      'GPT-5.2 Chat (AKA Instant) is the fast, lightweight member of the 5.2 family, optimized for low-latency chat while retai',
    contextLength: 128_000,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 1.75, completionPerMToken: 14 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-5.2-Codex is an upgraded version of GPT-5.1-Codex optimized for software engineering and coding workflows. It is des */
  'openai/gpt-5.2-codex': {
    name: 'OpenAI: GPT-5.2-Codex',
    provider: 'OpenAI',
    description:
      'GPT-5.2-Codex is an upgraded version of GPT-5.1-Codex optimized for software engineering and coding workflows. It is des',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.75, completionPerMToken: 14 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.3 Chat is an update to ChatGPT\'s most-used model that makes everyday conversations smoother, more useful, and more */
  'openai/gpt-5.3-chat': {
    name: 'OpenAI: GPT-5.3 Chat',
    provider: 'OpenAI',
    description:
      "GPT-5.3 Chat is an update to ChatGPT's most-used model that makes everyday conversations smoother, more useful, and more",
    contextLength: 128_000,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 1.75, completionPerMToken: 14 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** GPT-5.3-Codex is OpenAI’s most advanced agentic coding model, combining the frontier software engineering performance of */
  'openai/gpt-5.3-codex': {
    name: 'OpenAI: GPT-5.3-Codex',
    provider: 'OpenAI',
    description:
      'GPT-5.3-Codex is OpenAI’s most advanced agentic coding model, combining the frontier software engineering performance of',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 1.75, completionPerMToken: 14 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.4 is OpenAI’s latest frontier model, unifying the Codex and GPT lines into a single system. It features a 1M+ toke */
  'openai/gpt-5.4': {
    name: 'OpenAI: GPT-5.4',
    provider: 'OpenAI',
    description:
      'GPT-5.4 is OpenAI’s latest frontier model, unifying the Codex and GPT lines into a single system. It features a 1M+ toke',
    contextLength: 1_050_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 2.5, completionPerMToken: 15 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** [GPT-5.4](https://openrouter.ai/openai/gpt-5.4) Image 2 combines OpenAI\'s GPT-5.4 model with state-of-the-art image gene */
  'openai/gpt-5.4-image-2': {
    name: 'OpenAI: GPT-5.4 Image 2',
    provider: 'OpenAI',
    description:
      "[GPT-5.4](https://openrouter.ai/openai/gpt-5.4) Image 2 combines OpenAI's GPT-5.4 model with state-of-the-art image gene",
    contextLength: 272_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 8, completionPerMToken: 15 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: false, reasoning: true },
  },

  /** GPT-5.4 mini brings the core capabilities of GPT-5.4 to a faster, more efficient model optimized for high-throughput wor */
  'openai/gpt-5.4-mini': {
    name: 'OpenAI: GPT-5.4 Mini',
    provider: 'OpenAI',
    description:
      'GPT-5.4 mini brings the core capabilities of GPT-5.4 to a faster, more efficient model optimized for high-throughput wor',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 0.75, completionPerMToken: 4.5 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.4 nano is the most lightweight and cost-efficient variant of the GPT-5.4 family, optimized for speed-critical and  */
  'openai/gpt-5.4-nano': {
    name: 'OpenAI: GPT-5.4 Nano',
    provider: 'OpenAI',
    description:
      'GPT-5.4 nano is the most lightweight and cost-efficient variant of the GPT-5.4 family, optimized for speed-critical and ',
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 0.2, completionPerMToken: 1.25 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT-5.5 is OpenAI’s frontier model designed for complex professional workloads, building on GPT-5.4 with stronger reason */
  'openai/gpt-5.5': {
    name: 'OpenAI: GPT-5.5',
    provider: 'OpenAI',
    description:
      'GPT-5.5 is OpenAI’s frontier model designed for complex professional workloads, building on GPT-5.4 with stronger reason',
    contextLength: 1_050_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 5, completionPerMToken: 30 },
    modalities: ['file', 'image', 'text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** GPT Chat Latest points to OpenAI\'s stable API alias `chat-latest` that always resolves to the latest Instant chat model  */
  'openai/gpt-chat-latest': {
    name: 'OpenAI: GPT Chat Latest',
    provider: 'OpenAI',
    description:
      "GPT Chat Latest points to OpenAI's stable API alias `chat-latest` that always resolves to the latest Instant chat model ",
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    pricing: { promptPerMToken: 5, completionPerMToken: 30 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding. The o1  */
  'openai/o1': {
    name: 'OpenAI: o1',
    provider: 'OpenAI',
    description:
      'The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding. The o1 ',
    contextLength: 200_000,
    maxCompletionTokens: 100_000,
    pricing: { promptPerMToken: 15, completionPerMToken: 60 },
    modalities: ['text', 'image', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** o3 is a well-rounded and powerful model across domains. It sets a new standard for math, science, coding, and visual rea */
  'openai/o3': {
    name: 'OpenAI: o3',
    provider: 'OpenAI',
    description:
      'o3 is a well-rounded and powerful model across domains. It sets a new standard for math, science, coding, and visual rea',
    contextLength: 200_000,
    maxCompletionTokens: 100_000,
    pricing: { promptPerMToken: 2, completionPerMToken: 8 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** OpenAI o3-mini is a cost-efficient language model optimized for STEM reasoning tasks, particularly excelling in science, */
  'openai/o3-mini': {
    name: 'OpenAI: o3 Mini',
    provider: 'OpenAI',
    description:
      'OpenAI o3-mini is a cost-efficient language model optimized for STEM reasoning tasks, particularly excelling in science,',
    contextLength: 200_000,
    maxCompletionTokens: 100_000,
    pricing: { promptPerMToken: 1.1, completionPerMToken: 4.4 },
    modalities: ['text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** OpenAI o4-mini is a compact reasoning model in the o-series, optimized for fast, cost-efficient performance while retain */
  'openai/o4-mini': {
    name: 'OpenAI: o4 Mini',
    provider: 'OpenAI',
    description:
      'OpenAI o4-mini is a compact reasoning model in the o-series, optimized for fast, cost-efficient performance while retain',
    contextLength: 200_000,
    maxCompletionTokens: 100_000,
    pricing: { promptPerMToken: 1.1, completionPerMToken: 4.4 },
    modalities: ['image', 'text', 'file'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3-235B-A22B-Instruct-2507 is a multilingual, instruction-tuned mixture-of-experts language model based on the Qwen3- */
  'qwen/qwen3-235b-a22b-2507': {
    name: 'Qwen: Qwen3 235B A22B Instruct 2507',
    provider: 'Qwen',
    description:
      'Qwen3-235B-A22B-Instruct-2507 is a multilingual, instruction-tuned mixture-of-experts language model based on the Qwen3-',
    contextLength: 262_144,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 0.09, completionPerMToken: 0.1 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Qwen3-32B is a dense 32.8B parameter causal language model from the Qwen3 series, optimized for both complex reasoning a */
  'qwen/qwen3-32b': {
    name: 'Qwen: Qwen3 32B',
    provider: 'Qwen',
    description:
      'Qwen3-32B is a dense 32.8B parameter causal language model from the Qwen3 series, optimized for both complex reasoning a',
    contextLength: 131_072,
    maxCompletionTokens: 16_384,
    pricing: { promptPerMToken: 0.08, completionPerMToken: 0.28 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3-8B is a dense 8.2B parameter causal language model from the Qwen3 series, designed for both reasoning-heavy tasks  */
  'qwen/qwen3-8b': {
    name: 'Qwen: Qwen3 8B',
    provider: 'Qwen',
    description:
      'Qwen3-8B is a dense 8.2B parameter causal language model from the Qwen3 series, designed for both reasoning-heavy tasks ',
    contextLength: 131_072,
    maxCompletionTokens: 8_192,
    pricing: { promptPerMToken: 0.05, completionPerMToken: 0.4 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is opt */
  'qwen/qwen3-coder': {
    name: 'Qwen: Qwen3 Coder 480B A35B',
    provider: 'Qwen',
    description:
      'Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is opt',
    contextLength: 1_048_576,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.22, completionPerMToken: 1.8 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** Qwen3-Max is an updated release built on the Qwen3 series, offering major improvements in reasoning, instruction followi */
  'qwen/qwen3-max': {
    name: 'Qwen: Qwen3 Max',
    provider: 'Qwen',
    description:
      'Qwen3-Max is an updated release built on the Qwen3 series, offering major improvements in reasoning, instruction followi',
    contextLength: 262_144,
    maxCompletionTokens: 32_768,
    pricing: { promptPerMToken: 0.78, completionPerMToken: 3.9 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: false },
  },

  /** The Qwen3.5 122B-A10B native vision-language model is built on a hybrid architecture that integrates a linear attention  */
  'qwen/qwen3.5-122b-a10b': {
    name: 'Qwen: Qwen3.5-122B-A10B',
    provider: 'Qwen',
    description:
      'The Qwen3.5 122B-A10B native vision-language model is built on a hybrid architecture that integrates a linear attention ',
    contextLength: 262_144,
    maxCompletionTokens: 262_144,
    pricing: { promptPerMToken: 0.26, completionPerMToken: 2.08 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** The Qwen3.5 27B native vision-language Dense model incorporates a linear attention mechanism, delivering fast response t */
  'qwen/qwen3.5-27b': {
    name: 'Qwen: Qwen3.5-27B',
    provider: 'Qwen',
    description:
      'The Qwen3.5 27B native vision-language Dense model incorporates a linear attention mechanism, delivering fast response t',
    contextLength: 262_144,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.195, completionPerMToken: 1.56 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** The Qwen3.5 Series 35B-A3B is a native vision-language model designed with a hybrid architecture that integrates linear  */
  'qwen/qwen3.5-35b-a3b': {
    name: 'Qwen: Qwen3.5-35B-A3B',
    provider: 'Qwen',
    description:
      'The Qwen3.5 Series 35B-A3B is a native vision-language model designed with a hybrid architecture that integrates linear ',
    contextLength: 262_144,
    maxCompletionTokens: 81_920,
    pricing: { promptPerMToken: 0.14, completionPerMToken: 1 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** The Qwen3.5 series 397B-A17B native vision-language model is built on a hybrid architecture that integrates a linear att */
  'qwen/qwen3.5-397b-a17b': {
    name: 'Qwen: Qwen3.5 397B A17B',
    provider: 'Qwen',
    description:
      'The Qwen3.5 series 397B-A17B native vision-language model is built on a hybrid architecture that integrates a linear att',
    contextLength: 256_000,
    maxCompletionTokens: null,
    pricing: { promptPerMToken: 0.385, completionPerMToken: 2.45 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.5-9B is a multimodal foundation model from the Qwen3.5 family, designed to deliver strong reasoning, coding, and v */
  'qwen/qwen3.5-9b': {
    name: 'Qwen: Qwen3.5-9B',
    provider: 'Qwen',
    description:
      'Qwen3.5-9B is a multimodal foundation model from the Qwen3.5 family, designed to deliver strong reasoning, coding, and v',
    contextLength: 262_144,
    maxCompletionTokens: 262_144,
    pricing: { promptPerMToken: 0.1, completionPerMToken: 0.15 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** The Qwen3.5 native vision-language Flash models are built on a hybrid architecture that integrates a linear attention me */
  'qwen/qwen3.5-flash-02-23': {
    name: 'Qwen: Qwen3.5-Flash',
    provider: 'Qwen',
    description:
      'The Qwen3.5 native vision-language Flash models are built on a hybrid architecture that integrates a linear attention me',
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.065, completionPerMToken: 0.26 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** The Qwen3.5 native vision-language series Plus models are built on a hybrid architecture that integrates linear attentio */
  'qwen/qwen3.5-plus-02-15': {
    name: 'Qwen: Qwen3.5 Plus 2026-02-15',
    provider: 'Qwen',
    description:
      'The Qwen3.5 native vision-language series Plus models are built on a hybrid architecture that integrates linear attentio',
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.26, completionPerMToken: 1.56 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.5 Plus (April 2026) is a large-scale multimodal language model from Alibaba. It accepts text, image, and video inp */
  'qwen/qwen3.5-plus-20260420': {
    name: 'Qwen: Qwen3.5 Plus 2026-04-20',
    provider: 'Qwen',
    description:
      'Qwen3.5 Plus (April 2026) is a large-scale multimodal language model from Alibaba. It accepts text, image, and video inp',
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.3, completionPerMToken: 1.8 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.6 27B is a dense 27-billion-parameter language model from the Qwen Team at Alibaba, released in April 2026. It fea */
  'qwen/qwen3.6-27b': {
    name: 'Qwen: Qwen3.6 27B',
    provider: 'Qwen',
    description:
      'Qwen3.6 27B is a dense 27-billion-parameter language model from the Qwen Team at Alibaba, released in April 2026. It fea',
    contextLength: 262_144,
    maxCompletionTokens: 262_140,
    pricing: { promptPerMToken: 0.26, completionPerMToken: 2.385 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.6-35B-A3B is an open-weight multimodal model from Alibaba Cloud with 35 billion total parameters and 3 billion act */
  'qwen/qwen3.6-35b-a3b': {
    name: 'Qwen: Qwen3.6 35B A3B',
    provider: 'Qwen',
    description:
      'Qwen3.6-35B-A3B is an open-weight multimodal model from Alibaba Cloud with 35 billion total parameters and 3 billion act',
    contextLength: 262_144,
    maxCompletionTokens: 262_144,
    pricing: { promptPerMToken: 0.14, completionPerMToken: 1 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.6 Flash is a fast, efficient language model from Alibaba\'s Qwen 3.6 series. It supports text, image, and video inp */
  'qwen/qwen3.6-flash': {
    name: 'Qwen: Qwen3.6 Flash',
    provider: 'Qwen',
    description:
      "Qwen3.6 Flash is a fast, efficient language model from Alibaba's Qwen 3.6 series. It supports text, image, and video inp",
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.188, completionPerMToken: 1.125 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.6-Max-Preview is a proprietary frontier model from Alibaba Cloud built on a sparse mixture-of-experts architecture */
  'qwen/qwen3.6-max-preview': {
    name: 'Qwen: Qwen3.6 Max Preview',
    provider: 'Qwen',
    description:
      'Qwen3.6-Max-Preview is a proprietary frontier model from Alibaba Cloud built on a sparse mixture-of-experts architecture',
    contextLength: 262_144,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 1.04, completionPerMToken: 6.24 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen 3.6 Plus builds on a hybrid architecture that combines efficient linear attention with sparse mixture-of-experts ro */
  'qwen/qwen3.6-plus': {
    name: 'Qwen: Qwen3.6 Plus',
    provider: 'Qwen',
    description:
      'Qwen 3.6 Plus builds on a hybrid architecture that combines efficient linear attention with sparse mixture-of-experts ro',
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.325, completionPerMToken: 1.95 },
    modalities: ['text', 'image', 'video'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.7-Max is the flagship model in Alibaba\'s Qwen3.7 series. It supports text input and output and is designed for age */
  'qwen/qwen3.7-max': {
    name: 'Qwen: Qwen3.7 Max',
    provider: 'Qwen',
    description:
      "Qwen3.7-Max is the flagship model in Alibaba's Qwen3.7 series. It supports text input and output and is designed for age",
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 1.25, completionPerMToken: 3.75 },
    modalities: ['text'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },

  /** Qwen3.7-Plus is a cost-effective model in Alibaba\'s Qwen3.7 series. It supports text and image input with text output, b */
  'qwen/qwen3.7-plus': {
    name: 'Qwen: Qwen3.7 Plus',
    provider: 'Qwen',
    description:
      "Qwen3.7-Plus is a cost-effective model in Alibaba's Qwen3.7 series. It supports text and image input with text output, b",
    contextLength: 1_000_000,
    maxCompletionTokens: 65_536,
    pricing: { promptPerMToken: 0.32, completionPerMToken: 1.28 },
    modalities: ['text', 'image'],
    capabilities: { structuredOutput: true, tools: true, reasoning: true },
  },
} as const satisfies Record<string, ModelInfo>;

// Type union of all known model IDs + catch-all for arbitrary models
export type OpenRouterModelId = keyof typeof OPENROUTER_MODELS | (string & {});

// All known model IDs as an array (useful for CLI pickers and validation)
export const OPENROUTER_MODEL_IDS = Object.keys(
  OPENROUTER_MODELS,
) as (keyof typeof OPENROUTER_MODELS)[];

const hasModality = (id: keyof typeof OPENROUTER_MODELS, modality: InputModality): boolean =>
  (OPENROUTER_MODELS[id].modalities as readonly string[]).includes(modality);

// Subset: models that accept image input
export const MULTIMODAL_IMAGE_MODELS = OPENROUTER_MODEL_IDS.filter((id) =>
  hasModality(id, 'image'),
);

// Subset: models that accept file/PDF input
export const MULTIMODAL_FILE_MODELS = OPENROUTER_MODEL_IDS.filter((id) => hasModality(id, 'file'));

// Subset: models that accept audio input
export const MULTIMODAL_AUDIO_MODELS = OPENROUTER_MODEL_IDS.filter((id) =>
  hasModality(id, 'audio'),
);

// Subset: models that accept video input
export const MULTIMODAL_VIDEO_MODELS = OPENROUTER_MODEL_IDS.filter((id) =>
  hasModality(id, 'video'),
);

// Subset: models with reasoning capabilities
export const REASONING_MODELS = OPENROUTER_MODEL_IDS.filter(
  (id) => OPENROUTER_MODELS[id].capabilities.reasoning,
);
