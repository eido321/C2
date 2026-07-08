import {cn} from '@/lib/utils';

interface Props {
  /** Which panel edge the handle sits on. */
  side: 'left' | 'right';
  active: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}

/** Thin draggable divider on the inner edge of a side panel. */
export function ResizeHandle({side, active, onPointerDown, onDoubleClick}: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group absolute top-0 z-20 h-full w-2 cursor-col-resize touch-none select-none',
        side === 'left' ? 'right-0' : 'left-0',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 w-px transition-colors group-hover:bg-accent/60',
          side === 'left' ? 'right-0' : 'left-0',
          active ? 'bg-accent' : 'bg-transparent',
        )}
      />
    </div>
  );
}
