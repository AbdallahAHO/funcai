import { formatExamples, injectVariables } from '@/prompt/format';

// --------------------------------------------------------------------------
// injectVariables
// --------------------------------------------------------------------------

describe('injectVariables', () => {
  it('replaces a single placeholder', () => {
    const result = injectVariables('Hello {{NAME}}!', { NAME: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('replaces multiple distinct placeholders', () => {
    const result = injectVariables('{{GREETING}}, {{NAME}}! You are a {{ROLE}}.', {
      GREETING: 'Hi',
      NAME: 'Alice',
      ROLE: 'developer',
    });
    expect(result).toBe('Hi, Alice! You are a developer.');
  });

  it('replaces repeated occurrences of the same placeholder', () => {
    const result = injectVariables('{{X}} + {{X}} = 2{{X}}', { X: '1' });
    expect(result).toBe('1 + 1 = 21');
  });

  it('returns template unchanged when no placeholders exist', () => {
    const result = injectVariables('no placeholders here', { FOO: 'bar' });
    expect(result).toBe('no placeholders here');
  });

  it('throws when uppercase placeholders remain unresolved', () => {
    expect(() => injectVariables('Hello {{NAME}}, welcome to {{PLACE}}!', { NAME: 'Bob' })).toThrow(
      'Unresolved template variables: {{PLACE}}',
    );
  });

  it('lists all unresolved placeholders in the error message', () => {
    expect(() => injectVariables('{{A}} and {{B}} and {{C}}', {})).toThrow('{{A}}, {{B}}, {{C}}');
  });

  it('does not throw for lowercase/mixed-case braces (not matching pattern)', () => {
    const result = injectVariables('Hello {{name}}, today is {{Day}}', {});
    expect(result).toBe('Hello {{name}}, today is {{Day}}');
  });

  it('handles empty string values', () => {
    const result = injectVariables('Value: {{VAL}}', { VAL: '' });
    expect(result).toBe('Value: ');
  });

  it('handles multiline templates', () => {
    const template = `Line one: {{FIRST}}
Line two: {{SECOND}}`;
    const result = injectVariables(template, { FIRST: 'a', SECOND: 'b' });
    expect(result).toBe('Line one: a\nLine two: b');
  });
});

// --------------------------------------------------------------------------
// formatExamples
// --------------------------------------------------------------------------

describe('formatExamples', () => {
  it('returns empty string for empty array', () => {
    expect(formatExamples([])).toBe('');
  });

  it('formats a single example with numbered heading', () => {
    const result = formatExamples([{ input: 'hello', output: { sentiment: 'positive' } }]);

    expect(result).toContain('## Examples');
    expect(result).toContain('### Example 1');
    expect(result).toContain('**Input:** hello');
    expect(result).toContain('**Output:**');
    expect(result).toContain('"sentiment": "positive"');
  });

  it('formats multiple examples with sequential numbering', () => {
    const result = formatExamples([
      { input: 'good', output: 'positive' },
      { input: 'bad', output: 'negative' },
      { input: 'ok', output: 'neutral' },
    ]);

    expect(result).toContain('### Example 1');
    expect(result).toContain('### Example 2');
    expect(result).toContain('### Example 3');
  });

  it('wraps output in json code fences', () => {
    const result = formatExamples([{ input: 'test', output: { key: 'value' } }]);

    expect(result).toContain('```json');
    expect(result).toContain('```');
  });

  it('pretty-prints output JSON with 2-space indent', () => {
    const result = formatExamples([{ input: 'test', output: { a: 1, b: 2 } }]);

    const expectedJson = JSON.stringify({ a: 1, b: 2 }, null, 2);
    expect(result).toContain(expectedJson);
  });

  it('handles primitive outputs', () => {
    const result = formatExamples([{ input: 'x', output: 42 }]);
    expect(result).toContain('42');
  });

  it('handles array outputs', () => {
    const result = formatExamples([{ input: 'x', output: ['a', 'b'] }]);
    expect(result).toContain('"a"');
    expect(result).toContain('"b"');
  });

  it('includes reasoning when provided', () => {
    const result = formatExamples([
      {
        input: '2 bed flat in London',
        output: { filters: { bedrooms: 2 } },
        reasoning: 'User wants a flat with 2 bedrooms in London.',
      },
    ]);

    expect(result).toContain('**Reasoning:** User wants a flat with 2 bedrooms in London.');
    // Reasoning should appear between Input and Output
    const reasoningIndex = result.indexOf('**Reasoning:**');
    const inputIndex = result.indexOf('**Input:**');
    const outputIndex = result.indexOf('**Output:**');
    expect(inputIndex).toBeLessThan(reasoningIndex);
    expect(reasoningIndex).toBeLessThan(outputIndex);
  });

  it('omits reasoning line when not provided', () => {
    const result = formatExamples([{ input: 'hello', output: { greeting: true } }]);
    expect(result).not.toContain('**Reasoning:**');
  });

  it('handles mixed examples with and without reasoning', () => {
    const result = formatExamples([
      { input: 'first', output: 'a', reasoning: 'This is the first item.' },
      { input: 'second', output: 'b' },
    ]);

    // First example has reasoning
    expect(result).toContain('**Reasoning:** This is the first item.');
    // Only one reasoning block in total
    const matches = result.match(/\*\*Reasoning:\*\*/g);
    expect(matches).toHaveLength(1);
  });
});
