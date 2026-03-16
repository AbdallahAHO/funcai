import { definePrompt } from '@/prompt/define';

describe('definePrompt', () => {
  const validInput = {
    id: 'classify-sentiment',
    model: 'openai/gpt-4o',
    system: 'You are a sentiment classifier.',
  };

  it('returns a PromptConfig from valid input', () => {
    const config = definePrompt(validInput);
    expect(config).toEqual({
      id: 'classify-sentiment',
      model: 'openai/gpt-4o',
      system: 'You are a sentiment classifier.',
      temperature: undefined,
      maxTokens: undefined,
    });
  });

  it('passes through optional temperature and maxTokens', () => {
    const config = definePrompt({
      ...validInput,
      temperature: 0.3,
      maxTokens: 1024,
    });
    expect(config.temperature).toBe(0.3);
    expect(config.maxTokens).toBe(1024);
  });

  it('throws when id is missing', () => {
    expect(() => definePrompt({ ...validInput, id: '' })).toThrow('"id" is required');
  });

  it('throws when model is missing', () => {
    expect(() => definePrompt({ ...validInput, model: '' })).toThrow('"model" is required');
  });

  it('throws when system is missing', () => {
    expect(() => definePrompt({ ...validInput, system: '' })).toThrow('"system" is required');
  });
});
