import type {BlockViewProps} from './shared';

export function DividerBlock({block}: BlockViewProps<'divider'>) {
  const {ornament} = block.content;
  return (
    <div className="flex h-full w-full items-center">
      {ornament ? (
        <div className="flex w-full items-center gap-2 text-gold">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
          <span className="text-[var(--block-font,18px)] leading-none">&#10022;</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
        </div>
      ) : (
        <span className="h-0.5 w-full rounded bg-gold/60" />
      )}
    </div>
  );
}

