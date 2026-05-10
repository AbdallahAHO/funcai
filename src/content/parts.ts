import type { AudioPart, ContentPart, FilePart, ImagePart, TextPart } from '@/core/types';

/**
 * Creates a text content part for multimodal inputs.
 *
 * @example
 * ```ts
 * input: (photo) => [
 *   text(`Analyze product ${photo.id}`),
 *   image(photo.url),
 * ]
 * ```
 */
export const text = (value: string): TextPart => ({ type: 'text', text: value });

/**
 * Creates an image content part from a URL, data URL, file buffer, or URL object.
 *
 * @example
 * ```ts
 * input: (photoUrl: string) => [
 *   text('Extract product details from this image.'),
 *   image(photoUrl),
 * ]
 * ```
 */
export const image = (value: ImagePart['image']): ImagePart => ({ type: 'image', image: value });

/**
 * Creates a generic file content part.
 *
 * @example
 * ```ts
 * input: (invoiceUrl: string) => [
 *   text('Extract invoice totals.'),
 *   file(new URL(invoiceUrl), 'application/pdf'),
 * ]
 * ```
 */
export const file = (
  data: FilePart['data'],
  mediaType: string,
  options?: { filename?: string },
): FilePart => ({
  type: 'file',
  data,
  mediaType,
  ...(options?.filename && { filename: options.filename }),
});

/**
 * Creates a PDF file content part.
 *
 * @example
 * ```ts
 * input: (invoiceUrl: string) => [
 *   text('Extract invoice fields.'),
 *   pdf(invoiceUrl),
 * ]
 * ```
 */
export const pdf = (data: FilePart['data'], options?: { filename?: string }): FilePart =>
  file(data, 'application/pdf', options);

/**
 * Creates an audio content part.
 *
 * @example
 * ```ts
 * input: (recording: Uint8Array) => [
 *   text('Transcribe and summarize this call.'),
 *   audio(recording),
 * ]
 * ```
 */
export const audio = (value: AudioPart['audio']): AudioPart => ({
  type: 'audio',
  audio: value,
});

export type { ContentPart };
