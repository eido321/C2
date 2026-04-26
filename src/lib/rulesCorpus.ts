/**
 * Loads `public/rules.pdf`, extracts plain text in the browser (pdf.js), and chunks it
 * for the rules assistant (search + optional LLM context).
 */

export type RulesChunk = {
  id: number;
  startLine: number;
  endLine: number;
  text: string;
};

let cache: { chunks: RulesChunk[]; fullText: string } | null = null;
let inflight: Promise<{ chunks: RulesChunk[]; fullText: string }> | null = null;

function rulesPdfFetchUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  if (base.endsWith('/')) return `${base}rules.pdf`;
  return `${base}/rules.pdf`;
}

let workerSrcSet = false;

async function extractTextFromRulesPdf(): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  if (!workerSrcSet) {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default as string;
    workerSrcSet = true;
  }

  const res = await fetch(rulesPdfFetchUrl());
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Missing public/rules.pdf — add the file under public/ and reload.'
        : `Could not load rules.pdf (HTTP ${res.status}).`,
    );
  }

  const data = new Uint8Array(await res.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pageTexts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let line = '';
    for (const item of content.items) {
      if (typeof (item as { str?: unknown }).str === 'string') {
        const ti = item as { str: string; hasEOL?: boolean };
        line += ti.str;
        line += ti.hasEOL ? '\n' : ' ';
      }
    }
    pageTexts.push(line.replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim());
  }

  return pageTexts.join('\n\n');
}

/** Line-based windows so we can cite "lines 1200–1320" for highlights (lines of extracted text, not PDF page numbers). */
function chunkRulesText(text: string): RulesChunk[] {
  const lines = text.split('\n');
  const maxLines = 100;
  const chunks: RulesChunk[] = [];
  let id = 0;
  for (let i = 0; i < lines.length; i += maxLines) {
    const slice = lines.slice(i, i + maxLines);
    const end = Math.min(i + maxLines, lines.length);
    chunks.push({
      id: id++,
      startLine: i + 1,
      endLine: end,
      text: slice.join('\n'),
    });
  }
  return chunks;
}

async function loadOnce(): Promise<{ chunks: RulesChunk[]; fullText: string }> {
  const fullText = await extractTextFromRulesPdf();
  const chunks = chunkRulesText(fullText);
  return { chunks, fullText };
}

export async function loadRulesCorpus(): Promise<{ chunks: RulesChunk[]; fullText: string }> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const loaded = await loadOnce();
        cache = loaded;
        return loaded;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Token overlap scoring — good enough for rule lookup without embeddings. */
export function scoreChunksForQuery(
  query: string,
  chunks: RulesChunk[],
  max = 8,
): { chunk: RulesChunk; score: number }[] {
  const raw = query.toLowerCase().match(/[a-z0-9']{3,}/g) ?? [];
  const qWords = Array.from(new Set(raw));
  if (qWords.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const t = chunk.text.toLowerCase();
    let s = 0;
    for (const w of qWords) {
      const re = new RegExp(escapeRegExp(w), 'g');
      let m: RegExpExecArray | null;
      let n = 0;
      while ((m = re.exec(t)) !== null) {
        n++;
        if (n >= 6) break;
      }
      s += n;
    }
    const phrase = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (phrase.length >= 8 && t.includes(phrase)) s += 12;
    return { chunk, score: s };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

export function extractLineWindow(fullText: string, startLine: number, endLine: number, pad = 8): string {
  const lines = fullText.split('\n');
  const a = Math.max(0, startLine - 1 - pad);
  const b = Math.min(lines.length, endLine + pad);
  return lines.slice(a, b).join('\n');
}
