import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } from '../config';

export interface GenerateInput {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

// DeepSeek v4 pro via the OpenAI-compatible
export async function generateDeepSeek(input: GenerateInput): Promise<string> {
  const key = DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
  const base = DEEPSEEK_BASE_URL.replace(/\/$/, '');
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 1200,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('DeepSeek request failed (' + res.status + '): ' + body.slice(0, 200));
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// Returns DeepSeek output when available, otherwise the deterministic fallback.
// The fallback may return a single string or a list of lines (joined with newlines).
export async function llmOrFallback(input: GenerateInput, fallback: () => string | string[]): Promise<string> {
  try {
    const out = await generateDeepSeek(input);
    if (out) return out;
  } catch {
    /* fall through to deterministic output */
  }
  const f = fallback();
  return Array.isArray(f) ? f.join('\n') : f;
}
