import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, PanelRightClose, Send, Sparkles, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  extractLineWindow,
  loadRulesCorpus,
  scoreChunksForQuery,
  type RulesChunk,
} from '@/lib/rulesCorpus';
import { answerRulesQuestion, hasGeminiKey } from '@/lib/rulesAssistantAnswer';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightQueryInText(text: string, query: string): React.ReactNode {
  const terms = Array.from(
    new Set((query.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []).filter((t) => t.length >= 3)),
  );
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-amber-400/45 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: { startLine: number; endLine: number; preview: string }[];
};

export const RulesAssistantPanel: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const [corpusLoading, setCorpusLoading] = useState(true);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<RulesChunk[]>([]);
  const [fullText, setFullText] = useState<string>('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [expandedSource, setExpandedSource] = useState<{ start: number; end: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await loadRulesCorpus();
        if (cancelled) return;
        setChunks(c.chunks);
        setFullText(c.fullText);
        setCorpusError(null);
      } catch (e) {
        if (!cancelled) setCorpusError(e instanceof Error ? e.message : 'Could not load rules text');
      } finally {
        if (!cancelled) setCorpusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const geminiReady = hasGeminiKey();

  const pushAssistant = useCallback((text: string, sources?: Msg['sources']) => {
    setMessages((m) => [
      ...m,
      { id: Math.random().toString(36).slice(2), role: 'assistant', text, sources },
    ]);
  }, []);

  const runQuestion = useCallback(
    async (qRaw: string) => {
      const q = qRaw.trim();
      if (!q || chunks.length === 0) return;

      const userMsg: Msg = {
        id: Math.random().toString(36).slice(2),
        role: 'user',
        text: q,
      };
      setMessages((m) => [...m, userMsg]);
      setSending(true);
      setExpandedSource(null);

      try {
        const ranked = scoreChunksForQuery(q, chunks, 6);
        const top = ranked.map((r) => r.chunk);
        const sources: Msg['sources'] = top.map((c) => ({
          startLine: c.startLine,
          endLine: c.endLine,
          preview: c.text.slice(0, 280).trim() + (c.text.length > 280 ? '…' : ''),
        }));

        if (top.length === 0) {
          pushAssistant(
            'No matching passages found in `public/rules.pdf` (extracted text) for that wording. Try different keywords (e.g. feat name, "Bonus Action", spell name).',
            [],
          );
          return;
        }

        if (geminiReady) {
          try {
            const answer = await answerRulesQuestion(q, top);
            pushAssistant(answer, sources);
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            const fallback = top
              .map(
                (c) =>
                  `Lines ${c.startLine}–${c.endLine}\n${c.text.slice(0, 1200)}${c.text.length > 1200 ? '…' : ''}`,
              )
              .join('\n\n---\n\n');
            pushAssistant(
              `Could not get an AI summary (${err}). Closest excerpts:\n\n${fallback}`,
              sources,
            );
          }
        } else {
          const fallback = top
            .map(
              (c) =>
                `Lines ${c.startLine}–${c.endLine}\n${c.text.slice(0, 1500)}${c.text.length > 1500 ? '…' : ''}`,
            )
            .join('\n\n---\n\n');
          pushAssistant(
            `GEMINI_API_KEY is not set — showing retrieved excerpts only (no AI paraphrase). Add your key in .env as GEMINI_API_KEY and rebuild to enable answers.\n\n${fallback}`,
            sources,
          );
        }
      } finally {
        setSending(false);
      }
    },
    [chunks, geminiReady, pushAssistant],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || sending || corpusLoading) return;
    setInput('');
    void runQuestion(q);
  };

  const expandedBody = useMemo(() => {
    if (!expandedSource || !fullText) return null;
    return extractLineWindow(fullText, expandedSource.start, expandedSource.end, 12);
  }, [expandedSource, fullText]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-slate-950 border-l border-white/10">
      <div className="px-3 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <MessageCircle size={16} className="text-emerald-400 shrink-0" />
              Rules assistant
            </div>
            <p className="text-[10px] text-white/50 mt-1 leading-snug">
              Answers use only <span className="font-mono text-white/70">public/rules.pdf</span>{' '}
              <span className="text-white/35">(text extracted in your browser)</span>
              {geminiReady ? (
                <span className="text-emerald-400/90"> · Gemini enabled</span>
              ) : (
                <span> · set GEMINI_API_KEY for AI summaries</span>
              )}
            </p>
          </div>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              title="Hide assistant"
              className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Hide rules assistant"
            >
              <PanelRightClose size={18} />
            </button>
          )}
        </div>
      </div>

      {corpusLoading && (
        <div className="flex-1 flex items-center justify-center gap-2 text-white/50 text-sm p-6">
          <Loader2 className="animate-spin" size={18} />
          Loading and extracting rules.pdf…
        </div>
      )}

      {corpusError && (
        <div className="p-3 text-xs text-red-300">{corpusError}</div>
      )}

      {!corpusLoading && !corpusError && (
        <>
          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-3 text-sm"
          >
            {messages.length === 0 && (
              <div className="text-white/45 text-xs leading-relaxed space-y-2">
                <p>
                  Ask about classes, feats, spells, or actions. The assistant searches text extracted from{' '}
                  <span className="font-mono text-white/60">rules.pdf</span> and{' '}
                  {geminiReady ? 'summarizes what it finds' : 'shows the closest excerpts'}.
                </p>
                <p className="flex items-start gap-1.5 text-amber-200/80">
                  <BookMarked size={14} className="shrink-0 mt-0.5" />
                  The PDF viewer cannot be highlighted from here — open a source below to see the same
                  text with search-term highlights.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-xl px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-accent/20 text-white ml-4'
                    : 'bg-white/5 text-white/90 mr-2',
                )}
              >
                <div className="text-[11px] whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/40">
                      Sources (rules.pdf → extracted text)
                    </div>
                    {msg.sources.map((s) => (
                      <button
                        key={`${s.startLine}-${s.endLine}`}
                        type="button"
                        onClick={() =>
                          setExpandedSource(
                            expandedSource?.start === s.startLine && expandedSource?.end === s.endLine
                              ? null
                              : { start: s.startLine, end: s.endLine },
                          )
                        }
                        className={cn(
                          'w-full text-left rounded-lg border px-2 py-1.5 transition-colors',
                          expandedSource?.start === s.startLine
                            ? 'border-amber-500/60 bg-amber-500/10'
                            : 'border-white/10 bg-black/20 hover:border-white/25',
                        )}
                      >
                        <div className="text-[10px] font-bold text-amber-300/90">
                          Lines {s.startLine}–{s.endLine}
                        </div>
                        <div className="text-[10px] text-white/55 line-clamp-2 mt-0.5">
                          {s.preview}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Loader2 className="animate-spin" size={14} />
                Searching &amp; composing…
              </div>
            )}
          </div>

          {expandedSource && expandedBody && (
            <div className="border-t border-white/10 max-h-[40vh] flex flex-col min-h-0 shrink-0 bg-black/40">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] text-white/50">
                <span className="font-mono">
                  Lines {expandedSource.start}–{expandedSource.end} in extracted text (with highlights)
                </span>
                <button
                  type="button"
                  className="text-white/70 hover:text-white"
                  onClick={() => setExpandedSource(null)}
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 text-[11px] leading-relaxed text-white/85 font-mono">
                {highlightQueryInText(
                  expandedBody,
                  messages.filter((m) => m.role === 'user').slice(-1)[0]?.text ?? '',
                )}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="p-2 border-t border-white/10 shrink-0 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a rule…"
              disabled={sending}
              className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2.5"
              aria-label="Send"
            >
              {geminiReady ? <Sparkles size={18} /> : <Send size={18} />}
            </button>
          </form>
        </>
      )}
    </div>
  );
};
