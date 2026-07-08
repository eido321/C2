import {useCallback, useEffect, useRef, useState} from 'react';
import {Maximize, Minus, Plus, Magnet, RotateCcw} from 'lucide-react';
import {cn, clamp} from '@/lib/utils';
import {useWhiteboard} from '@/store/WhiteboardContext';
import type {Viewport} from '@/types';
import type {AlignmentGuide} from '@/lib/snapping';
import {BlockRenderer} from './BlockRenderer';

const GRID = 24;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const GUIDE_COLOR = '#ff2d78';

function isInternalScrollWheel(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-canvas-wheel="internal-scroll"]'));
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  snap: boolean;
  setSnap: (v: boolean) => void;
}

export function Canvas({containerRef, editingId, setEditingId, snap, setSnap}: Props) {
  const {state, dispatch} = useWhiteboard();
  const {board, selectedIds} = state;
  const {pan, zoom} = board.viewport;
  const selectedSet = new Set(selectedIds);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const visibleBlocks = board.blocks.filter((block) => !block.hidden);

  const panning = useRef<{startX: number; startY: number; px: number; py: number} | null>(null);
  const spaceDown = useRef(false);

  const setViewport = useCallback(
    (vp: Viewport) => dispatch({type: 'SET_VIEWPORT', viewport: vp}),
    [dispatch],
  );

  const zoomAtPoint = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (clientX - rect.left - pan.x) / zoom;
      const worldY = (clientY - rect.top - pan.y) / zoom;
      setViewport({
        zoom: nextZoom,
        pan: {x: clientX - rect.left - worldX * nextZoom, y: clientY - rect.top - worldY * nextZoom},
      });
    },
    [containerRef, pan.x, pan.y, zoom, setViewport],
  );

  const zoomFromCenter = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAtPoint(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [containerRef, zoomAtPoint],
  );

  const resetView = useCallback(() => setViewport({pan: {x: 80, y: 80}, zoom: 1}), [setViewport]);

  const fitView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || board.blocks.length === 0) {
      resetView();
      return;
    }
    const minX = Math.min(...board.blocks.map((b) => b.x));
    const minY = Math.min(...board.blocks.map((b) => b.y));
    const maxX = Math.max(...board.blocks.map((b) => b.x + b.width));
    const maxY = Math.max(...board.blocks.map((b) => b.y + b.height));
    const pad = 80;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const nextZoom = clamp(Math.min(rect.width / w, rect.height / h), MIN_ZOOM, MAX_ZOOM);
    setViewport({
      zoom: nextZoom,
      pan: {
        x: rect.width / 2 - ((minX + maxX) / 2) * nextZoom,
        y: rect.height / 2 - ((minY + maxY) / 2) * nextZoom,
      },
    });
  }, [board.blocks, containerRef, resetView, setViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && isInternalScrollWheel(e.target)) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAtPoint(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
      } else {
        e.preventDefault();
        setViewport({zoom, pan: {x: pan.x - e.deltaX, y: pan.y - e.deltaY}});
      }
    };
    el.addEventListener('wheel', onWheel, {passive: false});
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, pan.x, pan.y, zoom, zoomAtPoint, setViewport]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (guides.length) setGuides([]);
    if (editingId) setEditingId(null);
    const middle = e.button === 1;
    const left = e.button === 0;
    if (!(middle || left)) return;
    if (left && !spaceDown.current) {
      dispatch({type: 'SELECT', id: null});
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panning.current = {startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y};
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!panning.current) return;
    const p = panning.current;
    setViewport({zoom, pan: {x: p.px + (e.clientX - p.startX), y: p.py + (e.clientY - p.startY)}});
  };

  const onPointerUp = (e: React.PointerEvent) => {
    panning.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-100"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(100,116,139,0.28) 1px, transparent 1px)',
        backgroundSize: `${GRID * zoom}px ${GRID * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: panning.current ? 'grabbing' : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`}}
      >
        {visibleBlocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            selected={selectedSet.has(block.id)}
            editing={block.id === editingId}
            zoom={zoom}
            snap={snap}
            snapTargets={visibleBlocks}
            dispatch={dispatch}
            onSelect={(id) => dispatch({type: 'SELECT', id})}
            onStartEdit={setEditingId}
            onGuidesChange={setGuides}
          />
        ))}

        {guides.length ? (
          <div className="pointer-events-none absolute left-0 top-0">
            {guides.map((g, i) =>
              g.axis === 'x' ? (
                <div
                  key={`x-${i}`}
                  className="absolute"
                  style={{
                    left: g.position,
                    top: g.start,
                    width: 1 / zoom,
                    height: g.end - g.start,
                    marginLeft: -0.5 / zoom,
                    background: GUIDE_COLOR,
                  }}
                />
              ) : (
                <div
                  key={`y-${i}`}
                  className="absolute"
                  style={{
                    left: g.start,
                    top: g.position,
                    width: g.end - g.start,
                    height: 1 / zoom,
                    marginTop: -0.5 / zoom,
                    background: GUIDE_COLOR,
                  }}
                />
              ),
            )}
          </div>
        ) : null}
      </div>

      {board.blocks.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <p className="font-display text-xl font-semibold text-slate-500">Empty canvas</p>
            <p className="mt-1 text-sm">Add blocks from the left palette to start building.</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-lg backdrop-blur">
        <button className="icon-btn" onClick={() => zoomFromCenter(1 / 1.1)} title="Zoom out">
          <Minus size={16} />
        </button>
        <button
          className="w-14 rounded-md py-1 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100"
          onClick={resetView}
          title="Reset view"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className="icon-btn" onClick={() => zoomFromCenter(1.1)} title="Zoom in">
          <Plus size={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button className="icon-btn" onClick={fitView} title="Fit to content">
          <Maximize size={16} />
        </button>
        <button className="icon-btn" onClick={resetView} title="Reset view">
          <RotateCcw size={16} />
        </button>
        <button
          className={cn('icon-btn', snap && 'bg-accent/10 text-accent hover:bg-accent/15')}
          onClick={() => setSnap(!snap)}
          title={snap ? 'Snap to grid: on' : 'Snap to grid: off'}
        >
          <Magnet size={16} />
        </button>
      </div>
    </div>
  );
}
