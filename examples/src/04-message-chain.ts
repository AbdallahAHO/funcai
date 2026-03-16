/**
 * 04 — Message chains: multi-turn conversations and context injection.
 *
 * Messages are prepended before the final user input. They can be
 * static (hardcoded context) or dynamic (computed from input).
 *
 * Run: OPENROUTER_API_KEY=sk-or-... pnpm messages
 */
import { createAiFn } from 'funcai';
import { openrouter } from 'funcai/providers/openrouter';
import { z } from 'zod';

const ai = createAiFn({ provider: openrouter() });

// --- Static messages: inject persistent context ---

const codeReviewer = ai.fn({
  model: 'openai/gpt-4o-mini',
  system: 'You are a senior code reviewer. Focus on bugs, not style.',
  schema: z.object({
    issues: z.array(
      z.object({
        severity: z.enum(['critical', 'warning', 'info']),
        line: z.string(),
        description: z.string(),
      }),
    ),
    approved: z.boolean(),
  }),
  messages: [
    { role: 'user', content: 'Our stack: TypeScript, React 19, Next.js 16. We use strict mode.' },
    { role: 'assistant', content: 'Understood. I will review with those constraints in mind.' },
  ],
  input: (code: string) => `Review this code:\n\`\`\`typescript\n${code}\n\`\`\``,
});

const review = await codeReviewer(`
function UserList({ users }) {
  const [filtered, setFiltered] = useState(users);
  useEffect(() => {
    setFiltered(users.filter(u => u.active));
  }, []);
  return filtered.map(u => <div>{u.name}</div>);
}
`);

console.log('Code Review:', JSON.stringify(review, null, 2));

// --- Dynamic messages: build context from input ---

type ChatInput = {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  message: string;
};

const chat = ai.fn({
  model: 'openai/gpt-4o-mini',
  system: 'You are a concise technical assistant. Keep replies under 2 sentences.',
  schema: z.object({ reply: z.string() }),
  messages: (input: ChatInput) => input.history,
  input: (input: ChatInput) => input.message,
});

const response = await chat({
  history: [
    { role: 'user', content: 'What is TypeScript?' },
    { role: 'assistant', content: 'A typed superset of JavaScript that compiles to plain JS.' },
  ],
  message: 'How does it compare to Flow?',
});

console.log('Chat:', response.reply);
