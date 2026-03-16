import { buildSystemPrompt } from '@/prompt/build';

describe('buildSystemPrompt', () => {
  it('returns system string unchanged when no examples or variables', () => {
    const result = buildSystemPrompt({ system: 'You are helpful.' });
    expect(result).toBe('You are helpful.');
  });

  it('appends formatted examples at the end when no {{FEW_SHOTS}} placeholder', () => {
    const result = buildSystemPrompt({
      system: 'You classify text.',
      examples: [{ input: 'great', output: { sentiment: 'positive' } }],
    });

    expect(result).toContain('You classify text.');
    expect(result).toContain('## Examples');
    expect(result).toContain('### Example 1');
    // Examples appended after double newline
    expect(result).toMatch(/You classify text\.\n\n## Examples/);
  });

  it('injects examples at {{FEW_SHOTS}} placeholder when present', () => {
    const system = 'Instructions here.\n\n{{FEW_SHOTS}}\n\nNow classify:';
    const result = buildSystemPrompt({
      system,
      examples: [{ input: 'good', output: 'positive' }],
    });

    expect(result).toContain('Instructions here.');
    expect(result).toContain('Now classify:');
    expect(result).toContain('## Examples');
    // The placeholder should be replaced, not present
    expect(result).not.toContain('{{FEW_SHOTS}}');
  });

  it('replaces {{FEW_SHOTS}} with empty string when no examples', () => {
    const system = 'Before {{FEW_SHOTS}} After';
    const result = buildSystemPrompt({ system, examples: [] });
    expect(result).toBe('Before  After');
  });

  it('injects variables into the system prompt', () => {
    const result = buildSystemPrompt({
      system: 'You are a {{ROLE}} for {{COMPANY}}.',
      variables: { ROLE: 'classifier', COMPANY: 'Acme' },
    });
    expect(result).toBe('You are a classifier for Acme.');
  });

  it('injects both variables and examples without {{FEW_SHOTS}}', () => {
    const result = buildSystemPrompt({
      system: 'Role: {{ROLE}}',
      variables: { ROLE: 'analyst' },
      examples: [{ input: 'data', output: { result: 42 } }],
    });

    expect(result).toContain('Role: analyst');
    expect(result).toContain('## Examples');
    expect(result).toContain('### Example 1');
  });

  it('injects variables and {{FEW_SHOTS}} together', () => {
    const system = '{{ROLE}} instructions.\n{{FEW_SHOTS}}\nDone.';
    const result = buildSystemPrompt({
      system,
      variables: { ROLE: 'Classifier' },
      examples: [{ input: 'hello', output: 'greeting' }],
    });

    expect(result).toContain('Classifier instructions.');
    expect(result).toContain('## Examples');
    expect(result).toContain('Done.');
    expect(result).not.toContain('{{ROLE}}');
    expect(result).not.toContain('{{FEW_SHOTS}}');
  });

  it('does not append examples when examples array is empty and no placeholder', () => {
    const result = buildSystemPrompt({
      system: 'Just instructions.',
      examples: [],
    });
    expect(result).toBe('Just instructions.');
  });

  it('throws when variables leave unresolved uppercase placeholders', () => {
    expect(() =>
      buildSystemPrompt({
        system: '{{KNOWN}} and {{UNKNOWN}}',
        variables: { KNOWN: 'yes' },
      }),
    ).toThrow('Unresolved template variables');
  });

  it('includes reasoning from examples in assembled prompt', () => {
    const result = buildSystemPrompt({
      system: 'Classify the input.',
      examples: [
        {
          input: 'great product',
          output: { sentiment: 'positive' },
          reasoning: 'The word "great" indicates positive sentiment.',
        },
      ],
    });

    expect(result).toContain('**Reasoning:** The word "great" indicates positive sentiment.');
    expect(result).toContain('## Examples');
  });
});
