import { audio, file, image, pdf, text } from '@/index';

describe('content part builders', () => {
  it('builds text parts', () => {
    expect(text('Analyze this')).toEqual({ type: 'text', text: 'Analyze this' });
  });

  it('builds image parts', () => {
    expect(image('https://example.com/photo.jpg')).toEqual({
      type: 'image',
      image: 'https://example.com/photo.jpg',
    });
  });

  it('builds generic file parts', () => {
    expect(
      file('https://example.com/invoice.pdf', 'application/pdf', { filename: 'invoice.pdf' }),
    ).toEqual({
      type: 'file',
      data: 'https://example.com/invoice.pdf',
      mediaType: 'application/pdf',
      filename: 'invoice.pdf',
    });
  });

  it('builds PDF file parts', () => {
    expect(pdf('https://example.com/invoice.pdf')).toEqual({
      type: 'file',
      data: 'https://example.com/invoice.pdf',
      mediaType: 'application/pdf',
    });
  });

  it('builds audio parts', () => {
    expect(audio('https://example.com/call.ogg')).toEqual({
      type: 'audio',
      audio: 'https://example.com/call.ogg',
    });
  });
});
