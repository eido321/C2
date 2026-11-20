import {useRef} from 'react';
import type {Block} from '@/types';
import {cn, roundTo} from '@/lib/utils';
import {computeResizeSnap, computeSnap, type AlignmentGuide, type Rect, type ResizeSnapEdges} from '@/lib/snapping';
import {BlockContent} from '@/components/blocks/BlockContent';
import type {WhiteboardAction} from '@/store/reducer';

const MIN_SIZE = 40;
const GRID = 24;
/** Snap activation distance in screen pixels; divided by zoom to get canvas units. */
const SNAP_SCREEN_PX = 6;

type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: {dir: Dir; className: string; cursor: string}[] = [
  {dir: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize'},
  {dir: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize'},
  {dir: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize'},
  {dir: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize'},
  {dir: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize'},
  {dir: 's', className: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize'},
  {dir: 'sw', className: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize'},
  {dir: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize'},
];

function resizeEdges(dir: Dir): ResizeSnapEdges {
  return {
    left: dir.includes('w'),
    right: dir.includes('e'),
    top: dir.includes('n'),
    bottom: dir.includes('s'),
  };
}

interface Props {
  block: Block;
  selected: boolean;
  editing: boolean;
  zoom: number;
  snap: boolean;
  /** Candidate blocks to align against while dragging (typically all visible blocks). */
  snapTargets: Block[];
  dispatch: React.Dispatch<WhiteboardAction>;
  onSelect: (id: string) => void;
  onStartEdit: (id: string) => void;
  onGuidesChange: (guides: AlignmentGuide[]) => void;
}

export function BlockRenderer({
  block,
  selected,
  editing,
  zoom,
  snap,
  snapTargets,
  dispatch,
  onSelect,
  onStartEdit,
  onGuidesChange,
}: Props) {
  const drag = useRef<{startX: number; startY: number; bx: number; by: number} | null>(null);
  const resize = useRef<{dir: Dir; startX: number; startY: number; box: {x: number; y: number; w: number; h: number}} | null>(null);

  const snapVal = (v: number) => (snap ? roundTo(v, GRID) : v);
  const locked = block.locked ?? false;

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    if (editing) { e.stopPropagation(); return; }
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      dispatch({type:'TOGGLE_SELECT', id:block.id});
      return;
    }
    if (!selected) onSelect(block.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {startX: e.clientX, startY: e.clientY, bx: block.x, by: block.y};
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (resize.current) {
      const r = resize.current;
      const dx = (e.clientX - r.startX) / zoom;
      const dy = (e.clientY - r.startY) / zoom;
      let {x, y, w, h} = r.box;
      if (r.dir.includes('e')) w = r.box.w + dx;
      if (r.dir.includes('s')) h = r.box.h + dy;
      if (r.dir.includes('w')) w = r.box.w - dx;
      if (r.dir.includes('n')) h = r.box.h - dy;
      w = Math.max(MIN_SIZE, w);
      h = Math.max(MIN_SIZE, h);
      if (r.dir.includes('w')) x = r.box.x + (r.box.w - w);
      if (r.dir.includes('n')) y = r.box.y + (r.box.h - h);

      if (e.altKey) {
        onGuidesChange([]);
        dispatch({type: 'UPDATE_BLOCK', id: block.id, patch: {x, y, width: w, height: h}});
        return;
      }

      const rect: Rect = {x, y, width: w, height: h};
      const targets: Rect[] = snapTargets
        .filter((b) => b.id !== block.id && !b.hidden && !(b.locked ?? false))
        .map((b) => ({x: b.x, y: b.y, width: b.width, height: b.height}));
      const result = computeResizeSnap(rect, targets, SNAP_SCREEN_PX / zoom, resizeEdges(r.dir), MIN_SIZE);
      const nextX = result.snappedX ? result.x : snapVal(x);
      const nextY = result.snappedY ? result.y : snapVal(y);
      const nextW = result.snappedX ? result.width : snapVal(w);
      const nextH = result.snappedY ? result.height : snapVal(h);
      onGuidesChange(result.guides);
      dispatch({
        type: 'UPDATE_BLOCK',
        id: block.id,
        patch: {x: nextX, y: nextY, width: Math.max(MIN_SIZE, nextW), height: Math.max(MIN_SIZE, nextH)},
      });
      return;
    }
    if (drag.current) {
      const d = drag.current;
      const nx = d.bx + (e.clientX - d.startX) / zoom;
      const ny = d.by + (e.clientY - d.startY) / zoom;

      // Alt temporarily disables all snapping for free placement.
      if (e.altKey) {
        onGuidesChange([]);
        dispatch({type: 'DRAG', id: block.id, x: nx, y: ny});
        return;
      }

      const rect: Rect = {x: nx, y: ny, width: block.width, height: block.height};
      const targets: Rect[] = snapTargets
        .filter((b) => b.id !== block.id && !b.hidden && !(b.locked ?? false))
        .map((b) => ({x: b.x, y: b.y, width: b.width, height: b.height}));

      const result = computeSnap(rect, targets, SNAP_SCREEN_PX / zoom);

      // Block/edge snapping wins per-axis; otherwise fall back to grid snap.
      const px = result.snappedX ? result.x : snapVal(nx);
      const py = result.snappedY ? result.y : snapVal(ny);

      onGuidesChange(result.guides);
      dispatch({type: 'DRAG', id: block.id, x: px, y: py});
    }
  };

  const endInteraction = (e: React.PointerEvent) => {
    if (drag.current || resize.current) onGuidesChange([]);
    drag.current = null;
    resize.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const startResize = (dir: Dir) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resize.current = {dir, startX: e.clientX, startY: e.clientY, box: {x: block.x, y: block.y, w: block.width, h: block.height}};
  };

  const {style} = block;
  const chromeless = block.type === 'divider' || block.type === 'heading';
  const showChrome = !chromeless && (style?.showBorder ?? true);

  return (
    <div
      data-object-id={block.id}
      tabIndex={block.type === 'list' || block.type === 'spellList' ? -1 : undefined}
      onKeyDown={event => { if (event.key === 'Escape' && event.target === event.currentTarget) event.currentTarget.blur(); }}
      data-list-block={block.type === 'list' || block.type === 'spellList' ? '' : undefined}
      className="group absolute select-none"
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
      onDoubleClick={(e) => {
        if (locked) return;
        e.stopPropagation();
        onStartEdit(block.id);
      }}
    >
      <div
        className={cn(
          'h-full w-full overflow-hidden rounded-xl transition-shadow',
          showChrome && 'parchment p-3 shadow-sm',
          locked ? 'cursor-default' : editing ? 'cursor-text' : 'cursor-move',
        )}
        style={{
          background: style?.background,
          border: showChrome ? `1px solid ${style?.borderColor ?? 'rgba(176,141,87,0.55)'}` : undefined,
        }}
      >
        <BlockContent
          block={block}
          editing={editing}
          update={(content) => dispatch({type: 'UPDATE_CONTENT', id: block.id, content})}
        />
      </div>

      <div
        className={cn(
          'pointer-events-none absolute -inset-px rounded-xl ring-2 transition-opacity',
          selected ? 'opacity-100 ring-accent' : 'opacity-0 ring-accent/40 group-hover:opacity-60',
        )}
      />

      {selected && !editing && !locked
        ? HANDLES.map((h) => (
            <div
              key={h.dir}
              onPointerDown={startResize(h.dir)}
              onPointerMove={onPointerMove}
              onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
              className={cn('absolute z-10 h-3 w-3 rounded-full border-2 border-accent bg-white shadow', h.className)}
              style={{cursor: h.cursor}}
            />
          ))
        : null}
    </div>
  );
}





