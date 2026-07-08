import type {BlockViewProps} from './shared';

export function HeadingBlock({block, editing, update}: BlockViewProps<'heading'>) {
  const {style, content} = block;
  const align = style?.align ?? 'left';

  if (editing) {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={content.text}
          onChange={(e) => update({text: e.target.value})}
          className="bg-transparent font-display font-bold text-accent outline-none"
          style={{fontSize: style?.fontSize ?? 34, textAlign: align}}
        />
        <input
          value={content.subtitle ?? ''}
          onChange={(e) => update({subtitle: e.target.value})}
          placeholder="Subtitle"
          className="bg-transparent font-serif italic text-slate-500 outline-none"
          style={{fontSize: 15, textAlign: align}}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col justify-center overflow-hidden" style={{textAlign: align}}>
      <div
        className="font-display font-bold leading-tight text-accent"
        style={{fontSize: style?.fontSize ?? 34, color: style?.color}}
      >
        {content.text || 'Heading'}
      </div>
      {content.subtitle ? (
        <div className="font-serif italic text-slate-500" style={{fontSize: 15}}>
          {content.subtitle}
        </div>
      ) : null}
    </div>
  );
}
