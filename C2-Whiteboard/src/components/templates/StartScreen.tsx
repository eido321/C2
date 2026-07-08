import {ArrowRight, FilePlus2, ScrollText, X} from 'lucide-react';
import type {Block, WhiteboardTemplate} from '@/types';
import {BLOCK_LABELS} from '@/lib/blockDefaults';
import {TEMPLATE_GROUPS} from '@/data/templates';

interface Props {
  onSelectBlank: () => void;
  onSelectTemplate: (template: WhiteboardTemplate) => void;
  onContinue?: () => void;
  onClose?: () => void;
}

function TemplatePreview({build, accent}: {build: () => Block[]; accent: string}) {
  const blocks = build();
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  const maxX = Math.max(...blocks.map((b) => b.x + b.width));
  const maxY = Math.max(...blocks.map((b) => b.y + b.height));
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = Math.min(240 / w, 130 / h);

  return (
    <div className="relative h-[130px] w-full overflow-hidden rounded-lg border border-slate-200 bg-parchment">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{width: w * scale, height: h * scale}}>
        {blocks.map((b) => (
          <div
            key={b.id}
            className="absolute rounded-sm border"
            style={{
              left: (b.x - minX) * scale,
              top: (b.y - minY) * scale,
              width: b.width * scale,
              height: b.height * scale,
              backgroundColor: b.type === 'divider' ? 'transparent' : 'rgba(255,255,255,0.7)',
              borderColor: b.type === 'divider' ? 'transparent' : accent + '55',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: WhiteboardTemplate;
  onSelect: (template: WhiteboardTemplate) => void;
}) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="mb-3 w-full">
        <TemplatePreview build={template.build} accent={template.accent} />
      </div>
      <h3 className="font-display text-lg font-bold text-ink">{template.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{template.description}</p>
      <span className="mt-3 text-xs font-medium text-slate-400">
        {template.build().length} blocks · {BLOCK_LABELS.abilityScores}, {BLOCK_LABELS.statBlock}…
      </span>
    </button>
  );
}

export function StartScreen({onSelectBlank, onSelectTemplate, onContinue, onClose}: Props) {
  return (
    <div className="parchment fixed inset-0 z-50 flex items-center justify-center overflow-auto p-6">
      {onClose ? (
        <button className="icon-btn absolute right-5 top-5 bg-white/70" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      ) : null}

      <div className="w-full max-w-5xl py-10">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg">
            <ScrollText size={28} />
          </div>
          <h1 className="font-display text-4xl font-bold text-ink">C2 Whiteboard</h1>
          <p className="mt-2 font-serif text-lg italic text-ink-soft">
            Build custom D&amp;D character sheets on an infinite canvas.
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Start a new sheet</h2>
          {onContinue ? (
            <button
              onClick={onContinue}
              className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              Continue last whiteboard <ArrowRight size={15} />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={onSelectBlank}
            className="group flex flex-col items-start rounded-2xl border-2 border-dashed border-gold/50 bg-white/60 p-5 text-left transition-all hover:border-accent hover:bg-white hover:shadow-lg"
          >
            <div className="mb-3 flex h-[130px] w-full items-center justify-center rounded-lg bg-parchment-deep/50 text-gold">
              <FilePlus2 size={40} className="transition-transform group-hover:scale-110" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">Blank canvas</h3>
            <p className="mt-1 text-sm text-ink-soft">Start from scratch and add your own blocks.</p>
          </button>

          {TEMPLATE_GROUPS[0]?.templates.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={onSelectTemplate} />
          ))}
        </div>

        {TEMPLATE_GROUPS.slice(1).map((group) => (
          <section key={group.label} className="mt-10">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {group.templates.map((template) => (
                <TemplateCard key={template.id} template={template} onSelect={onSelectTemplate} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
