import type {BlockViewProps} from './shared';

export function StatBlock({block, editing, update}: BlockViewProps<'statBlock'>) {
  const {content} = block;

  if (editing) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          value={content.label}
          onChange={(e) => update({label: e.target.value})}
          className="w-full bg-transparent text-center font-display text-xs font-bold uppercase tracking-wide text-accent outline-none"
        />
        <input
          value={content.value}
          onChange={(e) => update({value: e.target.value})}
          className="w-full bg-transparent text-center font-serif text-4xl font-bold text-slate-800 outline-none"
        />
        <input
          value={content.hint ?? ''}
          onChange={(e) => update({hint: e.target.value})}
          placeholder="hint"
          className="w-full bg-transparent text-center text-[11px] italic text-slate-400 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <div className="font-display text-xs font-bold uppercase tracking-wide text-accent">{content.label}</div>
      <div className="font-serif text-4xl font-bold leading-none text-slate-800">{content.value || '—'}</div>
      {content.hint ? <div className="text-[11px] italic text-slate-400">{content.hint}</div> : null}
    </div>
  );
}
