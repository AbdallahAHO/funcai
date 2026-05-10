import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/index';

const mockResponse = (json: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(json) }],
  finishReason: 'stop' as const,
  usage: { inputTokens: { total: 12 }, outputTokens: { total: 8 } },
  rawCall: { rawPrompt: '', rawSettings: {} },
  warnings: [],
});

type ReviewInput = {
  title: string;
  body: string;
  language: string;
};

describe('structured-input: typed input with input function', () => {
  it('accepts a structured object input and formats it into a user message', async () => {
    const doGenerate = vi.fn().mockResolvedValue(
      mockResponse({
        quality: 'good',
        suggestions: ['Add more tests'],
        score: 8,
      }),
    );
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const reviewCode = ai.fn({
      model: 'test-model',
      system: 'You review code and provide feedback.',
      schema: z.object({
        quality: z.enum(['good', 'average', 'poor']),
        suggestions: z.array(z.string()),
        score: z.number().min(0).max(10),
      }),
      input: (data: ReviewInput) =>
        `Review this ${data.language} code:\nTitle: ${data.title}\n\n${data.body}`,
    });

    const result = await reviewCode({
      title: 'Add retry logic',
      body: 'function retry() { ... }',
      language: 'TypeScript',
    });

    expect(result).toEqual({
      quality: 'good',
      suggestions: ['Add more tests'],
      score: 8,
    });

    const callArgs = doGenerate.mock.calls[0][0];
    const userMessage = callArgs.prompt.at(-1);
    expect(userMessage.content).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Review this TypeScript code'),
      }),
    );
    expect(userMessage.content).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Title: Add retry logic'),
      }),
    );
  });

  it('preserves the full structured input through the pipeline', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(mockResponse({ translated: 'Bonjour le monde', confidence: 0.99 }));
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    type TranslateInput = { text: string; from: string; to: string };

    const translate = ai.fn({
      model: 'test-model',
      system: 'You are a translator.',
      schema: z.object({
        translated: z.string(),
        confidence: z.number(),
      }),
      input: (data: TranslateInput) => `Translate from ${data.from} to ${data.to}: "${data.text}"`,
    });

    const result = await translate({ text: 'Hello world', from: 'en', to: 'fr' });

    expect(result.translated).toBe('Bonjour le monde');
    expect(result.confidence).toBe(0.99);
  });

  it('works with input returning content parts array', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ description: 'A sunset over mountains', tags: ['nature', 'sunset'] }),
      );
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const fakeImageData = new TextEncoder().encode('fake-image-data');

    type ImageInput = { imageData: Uint8Array; context: string };

    const describeImage = ai.fn({
      model: 'test-model',
      system: 'Describe images.',
      schema: z.object({
        description: z.string(),
        tags: z.array(z.string()),
      }),
      input: (data: ImageInput) => [
        { type: 'text' as const, text: data.context },
        { type: 'image' as const, image: data.imageData },
      ],
    });

    const result = await describeImage({
      imageData: fakeImageData,
      context: 'Describe this photo',
    });

    expect(result.description).toBe('A sunset over mountains');
    expect(result.tags).toEqual(['nature', 'sunset']);

    // Verify content parts were passed to the model
    const callArgs = doGenerate.mock.calls[0][0];
    const userMessage = callArgs.prompt.at(-1);
    expect(userMessage.content).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'Describe this photo' }),
    );
    // AI SDK v6 normalizes image parts to file parts at the model level
    expect(userMessage.content).toContainEqual(expect.objectContaining({ type: 'file' }));
  });

  it('works with file parts for PDF input', async () => {
    const doGenerate = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ title: 'Quarterly Report', pages: 12, topics: ['revenue', 'growth'] }),
      );
    const model = new MockLanguageModelV3({ doGenerate });
    const provider = { model: () => model };

    const ai = createAiFn({ provider, retries: 0 });

    const fakePdfData = new TextEncoder().encode('fake-pdf-data');

    type PdfInput = { pdfData: Uint8Array; question: string };

    const analyzePdf = ai.fn({
      model: 'test-model',
      system: 'Analyze PDF documents.',
      schema: z.object({
        title: z.string(),
        pages: z.number(),
        topics: z.array(z.string()),
      }),
      input: (data: PdfInput) => [
        { type: 'text' as const, text: data.question },
        { type: 'file' as const, data: data.pdfData, mediaType: 'application/pdf' },
      ],
    });

    const result = await analyzePdf({
      pdfData: fakePdfData,
      question: 'Summarize this document',
    });

    expect(result.title).toBe('Quarterly Report');
    expect(result.pages).toBe(12);
    expect(result.topics).toEqual(['revenue', 'growth']);

    // Verify content parts were passed to the model
    const callArgs = doGenerate.mock.calls[0][0];
    const userMessage = callArgs.prompt.at(-1);
    expect(userMessage.content).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'Summarize this document' }),
    );
    expect(userMessage.content).toContainEqual(
      expect.objectContaining({ type: 'file', mediaType: 'application/pdf' }),
    );
  });
});
