import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAiFn } from '@/core/factory';
import { openrouter } from '@/provider/openrouter';

// Gemini 2.5 Flash — handles both vision and PDF natively, cost-effective
const MODEL = 'google/gemini-2.5-flash';

// 200-year-old pound cake recipe, handwritten by Nelle Tilford Noland
// Dark ink on yellowed card stock, with a Truman Library / NARA stamp
// Ingredients: 1 lb sugar, 1 lb flour, 1 lb butter (scant), 9 large eggs
const TEST_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg/960px-200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg';

// 1-page PDF: title "Sample PDF", subtitle "This is a simple PDF file. Fun fun fun."
// Body is Lorem ipsum paragraphs. Author: Philip Hutchison, created with Apple Pages.
const TEST_PDF_URL = 'https://pdfobject.com/pdf/sample.pdf';

describe.skipIf(!process.env.OPENROUTER_API_KEY)('Multimodal E2E', () => {
  const ai = createAiFn({ provider: openrouter(), retries: 1 });

  // -----------------------------------------------------------------------
  // Image: OCR / handwriting recognition
  // -----------------------------------------------------------------------

  it('extracts recipe text and metadata from a handwritten image', async () => {
    const readHandwriting = ai.fn({
      model: MODEL,
      system:
        'You are an OCR specialist. Extract the text from the handwritten recipe image. Identify the recipe title, the author who wrote it, and list the ingredients.',
      schema: z.object({
        title: z.string().describe('Title of the recipe'),
        author: z.string().describe('Person who wrote the recipe'),
        isHandwritten: z.boolean(),
        ingredients: z.array(z.string()).describe('Ingredients listed in the recipe'),
        extractedText: z.string().describe('The full text extracted from the handwriting'),
      }),
      input: (url: string) => [
        { type: 'text' as const, text: 'Read the handwritten text in this image:' },
        { type: 'image' as const, image: url },
      ],
    });

    const result = await readHandwriting(TEST_IMAGE_URL);

    expect(result.isHandwritten).toBe(true);
    expect(result.title.toLowerCase()).toMatch(/pound.?cake/);
    expect(result.author.toLowerCase()).toContain('noland');
    expect(result.extractedText.toLowerCase()).toContain('sugar');
    expect(result.ingredients.length).toBeGreaterThanOrEqual(4);
  });

  it('returns detailed metadata for image analysis via .detailed()', async () => {
    const analyzeImage = ai.fn({
      model: MODEL,
      system:
        'Analyze the image. Determine the writing medium (ink color, paper type) and document type. Note whether the document has any official stamps or seals.',
      schema: z.object({
        inkColor: z.string().describe('Color of the ink used'),
        documentType: z.enum([
          'recipe_card',
          'personal_letter',
          'formal_document',
          'note',
          'other',
        ]),
        hasStampOrSeal: z.boolean().describe('Whether the document has a visible stamp or seal'),
      }),
      input: (url: string) => [
        { type: 'text' as const, text: 'Analyze the writing style and content:' },
        { type: 'image' as const, image: url },
      ],
    });

    const detailed = await analyzeImage.detailed(TEST_IMAGE_URL, {
      traceId: 'e2e-image-analysis',
    });

    expect(detailed.output.inkColor.toLowerCase()).toMatch(/blue|black|dark/);
    expect(detailed.output.documentType).toBe('recipe_card');
    expect(detailed.output.hasStampOrSeal).toBe(true);
    expect(detailed.model).toBe(MODEL);
    expect(detailed.traceId).toBe('e2e-image-analysis');
    expect(detailed.usage.inputTokens).toBeGreaterThan(0);
    expect(detailed.latencyMs).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // PDF: structured extraction
  // -----------------------------------------------------------------------

  it('extracts title and content from a PDF via file part', async () => {
    const extractPdf = ai.fn({
      model: MODEL,
      system:
        'Extract the document title, subtitle, page count, and identify whether the body contains real content or placeholder text (like Lorem ipsum).',
      schema: z.object({
        title: z.string().describe('Exact document title'),
        subtitle: z.string().describe('Document subtitle or first sentence'),
        pageCount: z.number().describe('Number of pages'),
        isPlaceholderText: z
          .boolean()
          .describe('Whether the body is Lorem ipsum or similar placeholder'),
      }),
      input: (pdfUrl: string) => [
        { type: 'text' as const, text: 'Extract metadata from this PDF:' },
        {
          type: 'file' as const,
          data: new URL(pdfUrl),
          mediaType: 'application/pdf',
        },
      ],
    });

    const result = await extractPdf(TEST_PDF_URL);

    expect(result.title.toLowerCase()).toContain('sample');
    expect(result.subtitle.toLowerCase()).toMatch(/simple pdf file|fun fun fun/);
    expect(result.pageCount).toBe(1);
    expect(result.isPlaceholderText).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Image + typed domain input
  // -----------------------------------------------------------------------

  it('combines image with structured domain context', async () => {
    type RecipeAnalysisInput = {
      imageUrl: string;
      analysisId: string;
      analyzeFor: 'ingredients' | 'instructions' | 'both';
    };

    const analyzeRecipe = ai.fn({
      model: MODEL,
      system:
        'You are a culinary historian. Analyze the provided handwritten recipe image. Report on the writing characteristics, list the ingredients, and note whether specific baking techniques are mentioned.',
      schema: z.object({
        writingStyle: z.enum(['cursive', 'print', 'mixed']).describe('Style of handwriting'),
        estimatedWordCount: z.number().describe('Approximate number of words in the document'),
        ingredients: z.array(z.string()).describe('Ingredients listed in the recipe'),
        mentionsBakingTechnique: z
          .boolean()
          .describe('Whether specific baking techniques are mentioned'),
      }),
      input: (data: RecipeAnalysisInput) => [
        {
          type: 'text' as const,
          text: `Analysis ID: ${data.analysisId}\nScope: ${data.analyzeFor}`,
        },
        { type: 'image' as const, image: data.imageUrl },
        {
          type: 'text' as const,
          text: 'Provide a culinary analysis of this handwritten recipe.',
        },
      ],
    });

    const result = await analyzeRecipe({
      imageUrl: TEST_IMAGE_URL,
      analysisId: 'E2E-TEST-001',
      analyzeFor: 'both',
    });

    expect(['cursive', 'print', 'mixed']).toContain(result.writingStyle);
    expect(result.estimatedWordCount).toBeGreaterThan(30);
    expect(result.ingredients.length).toBeGreaterThanOrEqual(4);

    // The recipe lists sugar, flour, butter, eggs — at least some should appear
    const ingredientsLower = result.ingredients.map((i) => i.toLowerCase());
    const mentionsExpected = ingredientsLower.some(
      (i) =>
        i.includes('sugar') || i.includes('flour') || i.includes('butter') || i.includes('egg'),
    );
    expect(mentionsExpected).toBe(true);

    expect(result.mentionsBakingTechnique).toBe(true);
  });

  // -----------------------------------------------------------------------
  // PDF + typed domain input
  // -----------------------------------------------------------------------

  it('combines PDF file part with structured domain context', async () => {
    type ComplianceReviewInput = {
      documentUrl: string;
      checklist: string[];
      department: string;
    };

    const reviewCompliance = ai.fn({
      model: MODEL,
      system:
        'You are a compliance reviewer. Check the document against the provided checklist items. Report which items are present and which are missing. The document is a simple sample/placeholder — most checklist items will be missing.',
      schema: z.object({
        documentTitle: z.string(),
        presentItems: z.array(z.string()).describe('Checklist items found in the document'),
        missingItems: z.array(z.string()).describe('Checklist items NOT found in the document'),
        complianceScore: z
          .number()
          .min(0)
          .max(100)
          .describe('Percentage of checklist items present'),
      }),
      input: (data: ComplianceReviewInput) => [
        {
          type: 'text' as const,
          text: `Department: ${data.department}\nChecklist:\n${data.checklist.map((item) => `- ${item}`).join('\n')}`,
        },
        {
          type: 'file' as const,
          data: new URL(data.documentUrl),
          mediaType: 'application/pdf',
        },
      ],
    });

    const result = await reviewCompliance({
      documentUrl: TEST_PDF_URL,
      department: 'Engineering',
      checklist: [
        'Has a document title',
        'Contains an API reference section',
        'Includes code examples',
        'Has a table of contents',
      ],
    });

    // The PDF has a title ("Sample PDF") but no API docs, code, or TOC
    expect(result.documentTitle.toLowerCase()).toContain('sample');
    expect(result.missingItems.length).toBeGreaterThan(0);
    expect(result.complianceScore).toBeLessThan(100);
    expect(typeof result.complianceScore).toBe('number');
  });
});
