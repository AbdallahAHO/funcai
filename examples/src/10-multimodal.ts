/**
 * 10 — Multi-modal input: images, PDFs, and mixed content.
 *
 * Return a ContentPart[] from the input function to send files alongside text.
 * The AI SDK handles URL fetching, base64 encoding, and MIME negotiation.
 *
 * Uses google/gemini-2.5-flash — handles both vision and PDF natively.
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm multimodal
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

// 200-year-old pound cake recipe — handwritten by Nelle Tilford Noland, Truman Library / NARA
const RECIPE_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg/960px-200_Year_Old_Pound_Cake_Recipe_-_DPLA_-_91d61ff625fdea7abb64e327b2bd7354_%28page_1%29.jpg';

// 1-page sample PDF — title "Sample PDF", Lorem ipsum body
const SAMPLE_PDF = 'https://pdfobject.com/pdf/sample.pdf';

// ---------------------------------------------------------------------------
// 1. Image OCR — extract a handwritten recipe
// ---------------------------------------------------------------------------

const readRecipe = ai.fn({
  model: 'google/gemini-2.5-flash',
  system:
    'You are an OCR specialist. Extract the text from the handwritten recipe image. Identify the title, author, and list all ingredients.',
  schema: z.object({
    title: z.string().describe('Title of the recipe'),
    author: z.string().describe('Person who wrote the recipe'),
    isHandwritten: z.boolean(),
    ingredients: z.array(z.string()).describe('Ingredients listed in the recipe'),
    extractedText: z.string().describe('Full text extracted from the image'),
  }),
  input: (imageUrl: string) => [
    { type: 'text' as const, text: 'Read the handwritten text in this image:' },
    { type: 'image' as const, image: imageUrl },
  ],
});

const ocrResult = await readRecipe(RECIPE_IMAGE);
console.log('OCR result:', ocrResult);
// → { title: "200 Year-old Pound-cake Recipe", author: "Nelle Tilford Noland", isHandwritten: true, ingredients: ["sugar", "flour", "butter", "eggs"], extractedText: "200 Year-old Pound-cake Recipe..." }

// ---------------------------------------------------------------------------
// 2. PDF extraction — pull structured metadata from a document
// ---------------------------------------------------------------------------

const extractPdf = ai.fn({
  model: 'google/gemini-2.5-flash',
  system:
    'Extract document metadata. Identify the title, subtitle, page count, and whether the body is real content or placeholder text.',
  schema: z.object({
    title: z.string().describe('Exact document title'),
    subtitle: z.string().describe('Document subtitle or first line'),
    pageCount: z.number(),
    isPlaceholderText: z.boolean().describe('Whether body is Lorem ipsum or similar'),
  }),
  input: (pdfUrl: string) => [
    { type: 'text' as const, text: 'Extract metadata from this PDF:' },
    { type: 'file' as const, data: new URL(pdfUrl), mediaType: 'application/pdf' },
  ],
});

const pdfResult = await extractPdf(SAMPLE_PDF);
console.log('PDF extraction:', pdfResult);
// → { title: "Sample PDF", subtitle: "This is a simple PDF file. Fun fun fun.", pageCount: 1, isPlaceholderText: true }

// ---------------------------------------------------------------------------
// 3. Typed input with image — culinary historian analysis
// ---------------------------------------------------------------------------

type RecipeAnalysisInput = {
  imageUrl: string;
  analysisId: string;
  analyzeFor: 'ingredients' | 'instructions' | 'both';
};

const analyzeRecipe = ai.fn({
  model: 'google/gemini-2.5-flash',
  system:
    'You are a culinary historian. Analyze the handwritten recipe. Report writing characteristics, list ingredients, and note any historical baking techniques.',
  schema: z.object({
    writingStyle: z.enum(['cursive', 'print', 'mixed']),
    estimatedWordCount: z.number(),
    ingredients: z.array(z.string()).describe('Ingredients mentioned in the recipe'),
    mentionsBakingTechnique: z.boolean().describe('Whether specific techniques are described'),
  }),
  input: (data: RecipeAnalysisInput) => [
    {
      type: 'text' as const,
      text: `Analysis: ${data.analysisId}\nScope: ${data.analyzeFor}`,
    },
    { type: 'image' as const, image: data.imageUrl },
    { type: 'text' as const, text: 'Provide a culinary analysis of this handwritten recipe.' },
  ],
});

const recipeResult = await analyzeRecipe({
  imageUrl: RECIPE_IMAGE,
  analysisId: 'DEMO-001',
  analyzeFor: 'both',
});
console.log('Recipe analysis:', recipeResult);
// → { writingStyle: "cursive", estimatedWordCount: 80, ingredients: ["sugar", "flour", "butter", "eggs", "lemon extract", "English walnut halves"], mentionsBakingTechnique: true }

// ---------------------------------------------------------------------------
// 4. PDF with domain context — compliance review
// ---------------------------------------------------------------------------

type ComplianceInput = {
  documentUrl: string;
  checklist: string[];
  department: string;
};

const reviewCompliance = ai.fn({
  model: 'google/gemini-2.5-flash',
  system:
    'Check the document against the provided checklist. Report which items are present vs missing. Be honest — if the document is a placeholder, most items will be missing.',
  schema: z.object({
    documentTitle: z.string(),
    presentItems: z.array(z.string()),
    missingItems: z.array(z.string()),
    complianceScore: z.number().min(0).max(100),
  }),
  input: (data: ComplianceInput) => [
    {
      type: 'text' as const,
      text: `Department: ${data.department}\nChecklist:\n${data.checklist.map((i) => `- ${i}`).join('\n')}`,
    },
    { type: 'file' as const, data: new URL(data.documentUrl), mediaType: 'application/pdf' },
  ],
});

const complianceResult = await reviewCompliance({
  documentUrl: SAMPLE_PDF,
  department: 'Engineering',
  checklist: [
    'Has a document title',
    'Contains API reference',
    'Includes code examples',
    'Has a table of contents',
  ],
});
console.log('Compliance review:', complianceResult);
// → { documentTitle: "Sample PDF", presentItems: ["Has a document title"], missingItems: ["Contains API reference", ...], complianceScore: 25 }
