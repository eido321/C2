import type { RulesChunk } from '@/lib/rulesCorpus';

function getGeminiKey(): string {
  try {
    const p = typeof process !== 'undefined' && (process as { env?: { GEMINI_API_KEY?: string } }).env;
    return (p?.GEMINI_API_KEY ?? '').trim();
  } catch {
    return '';
  }
}

export function hasGeminiKey(): boolean {
  return getGeminiKey().length > 0;
}

/** Stable Flash on the Gemini Developer API; 2.0 alias is not offered to new keys (404). See https://ai.google.dev/gemini-api/docs/models */
const MODEL = 'gemini-2.5-flash';

/**
 * Grounded answer using only retrieved chunks. Requires GEMINI_API_KEY at build time (see vite.config define).
 */
export async function answerRulesQuestion(
  question: string,
  chunks: RulesChunk[],
): Promise<string> {
  const key = getGeminiKey();
  if (!key) {
    throw new Error('NO_KEY');
  }
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });

  const context = chunks
    .map(
      (c, i) =>
        `--- Excerpt ${i + 1} (lines ${c.startLine}–${c.endLine} of text extracted from rules.pdf) ---\n${c.text}`,
    )
    .join('\n\n');

  const prompt = `You help players with Dungeons & Dragons 5e rules (text extracted from the Player's Handbook PDF below).

RULES:
- Answer ONLY using information that appears in the EXCERPTS below. If the excerpts don't contain enough information, say so clearly and quote what is there.
- Be concise. Use bullet points when listing options.
- When citing rules, mention the line range you used (e.g. "see excerpt lines 1200–1300" — these are line numbers in the flattened extracted text, not PDF page numbers).
- Do not invent mechanics, numbers, or features not supported by the excerpts.

EXCERPTS:
${context}

QUESTION:
${question}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.25,
      maxOutputTokens: 2048,
      systemInstruction:
        'You are a precise TTRPG rules assistant. Never use knowledge outside the excerpts given in the user message.',
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Empty response from model');
  return text;
}
