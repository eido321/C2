import type {BlockViewProps} from './shared';

export function TextBlock({block, editing, update}: BlockViewProps<'text'>) {
  const {style, content} = block;
  const common: React.CSSProperties = {
    fontSize: style?.fontSize ?? 15,
    textAlign: style?.align ?? 'left',
    color: style?.color,
    lineHeight: 1.5,
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        value={content.text}
        onChange={(e) => update({text: e.target.value})}
        onPointerDown={(e) => e.stopPropagation()}
        className="h-full w-full resize-none bg-transparent font-serif outline-none"
        style={common}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden whitespace-pre-wrap font-serif text-slate-800" style={common}>
      {content.text || <span className="text-slate-400">Double-click to edit text…</span>}
    </div>
  );
}
