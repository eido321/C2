import {useCallback, useEffect, useRef, useState} from 'react';
import {Keyboard, Maximize, Minus, Plus, Magnet, RotateCcw} from 'lucide-react';
import {cn, clamp} from '@/lib/utils';
import {useWhiteboard} from '@/store/WhiteboardContext';
import type {Viewport} from '@/types';
import type {AlignmentGuide} from '@/lib/snapping';
import {imageBlock, transferredImages} from '@/lib/imageTransfer';
import {ObjectMenu} from './ObjectMenu';
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
  const help = useRef<HTMLDialogElement>(null);
  const [menu,setMenu] = useState<{x:number;y:number;ids:string[]} | null>(null);
  const members = (id:string) => board.groups.find(g=>g.childIds.includes(id))?.childIds ?? [id];
  const selectedSet = new Set(selectedIds);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const visibleBlocks = board.blocks.filter((block) => !block.hidden);

  const outsideSelection = selectedIds.length > 1 ? visibleBlocks.filter(b => !selectedSet.has(b.id)) : visibleBlocks;
  const panning = useRef<{startX: number; startY: number; px: number; py: number} | null>(null);
  const marquee = useRef<{x:number; y:number; base:string[]} | null>(null);
  const [box,setBox] = useState<{left:number;top:number;width:number;height:number} | null>(null);
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

  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;
    const rect = () => canvas.getBoundingClientRect();
    function insert(data: DataTransfer, clientX: number, clientY: number) {
      const sources = transferredImages(data);
      if (!sources.length) return false;
      const bounds = rect();
      const x = (clientX - bounds.left - pan.x) / zoom;
      const y = (clientY - bounds.top - pan.y) / zoom;
      void Promise.all(sources.map((source,i) => imageBlock(source,x+i*24,y+i*24)))
        .then(blocks => {
          for (const block of blocks) dispatch({type:'ADD_BLOCK',block});
          dispatch({type:'SELECT_MANY',ids:blocks.map(block => block.id)});
          setEditingId(null);
        }).catch(() => window.alert('Could not load this image. Try a PNG, JPEG or WebP file.'));
      return true;
    }
    function onPaste(event: ClipboardEvent) {
      if (event.defaultPrevented || !event.clipboardData || (event.target as Element)?.closest?.('input,textarea,select,[contenteditable=true],dialog')) return;
      if (event.clipboardData.getData('text/plain').startsWith('C2 blocks\n')) return;
      const bounds = rect();
      if (insert(event.clipboardData,bounds.left+bounds.width/2,bounds.top+bounds.height/2)) event.preventDefault();
    }
    function onDragOver(event: DragEvent) {
      if (event.dataTransfer?.types.some(type => ['Files','text/html','text/uri-list'].includes(type))) event.preventDefault();
    }
    function onDrop(event: DragEvent) {
      if (!event.dataTransfer) return;
      if (insert(event.dataTransfer,event.clientX,event.clientY) || event.dataTransfer.types.includes('Files')) event.preventDefault();
    }
    window.addEventListener('paste',onPaste);
    canvas.addEventListener('dragover',onDragOver);
    canvas.addEventListener('drop',onDrop);
    return () => {
      window.removeEventListener('paste',onPaste);
      canvas.removeEventListener('dragover',onDragOver);
      canvas.removeEventListener('drop',onDrop);
    };
  }, [containerRef,dispatch,pan.x,pan.y,zoom,setEditingId]);

  const resetView = useCallback(() => setViewport({pan: {x: 80, y: 80}, zoom: 1}), [setViewport]);

  const fitView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const blocks = board.blocks.filter(block => !block.hidden);
    if (!rect || blocks.length === 0) {
      resetView();
      return;
    }
    const minX = Math.min(...blocks.map((b) => b.x));
    const minY = Math.min(...blocks.map((b) => b.y));
    const maxX = Math.max(...blocks.map((b) => b.x + b.width));
    const maxY = Math.max(...blocks.map((b) => b.y + b.height));
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
      if (!e.ctrlKey && !e.metaKey && e.target instanceof Element) {
        const block = e.target.closest('[data-list-block]');
        const list = block?.querySelector<HTMLElement>('[data-canvas-wheel="internal-scroll"]');
        if (block && list && block.contains(document.activeElement)) {
          if (isInternalScrollWheel(e.target)) return;
          e.preventDefault();
          const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? list.clientHeight : 1;
          list.scrollBy(e.deltaX * unit, e.deltaY * unit);
          return;
        }
      }
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
      if ((e.target as Element)?.closest?.('input, textarea, select, [contenteditable=true], dialog')) return;
      if (e.key === '?') { e.preventDefault(); help.current?.showModal(); return; }
      if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); fitView(); return; }
      if (!e.ctrlKey && !e.metaKey && (e.key === '+' || e.key === '=' || e.key === '-')) {
        e.preventDefault();
        zoomFromCenter(e.key === '-' ? 1/1.1 : 1.1);
      }
      if (e.code === 'Space' && !(e.target as Element)?.closest?.('input, textarea, select, [contenteditable=true]')) spaceDown.current = true;
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
  }, [fitView,zoomFromCenter]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (guides.length) setGuides([]);
    if (editingId) setEditingId(null);
    const middle = e.button === 1;
    const left = e.button === 0;
    if (!(middle || left)) return;
    if (left && !spaceDown.current && e.pointerType !== 'touch') {
      const rect = e.currentTarget.getBoundingClientRect();
      const base = e.ctrlKey || e.metaKey || e.shiftKey ? selectedIds : [];
      marquee.current = {x:e.clientX-rect.left,y:e.clientY-rect.top,base};
      dispatch({type:'SELECT_MANY',ids:base});
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panning.current = {startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y};
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = marquee.current;
    if (start) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX-rect.left, y = e.clientY-rect.top;
      const left=Math.min(start.x,x), top=Math.min(start.y,y);
      const width=Math.abs(x-start.x), height=Math.abs(y-start.y);
      setBox({left,top,width,height});
      const hits=visibleBlocks.filter(b => {
        const angle=(b.rotation ?? 0)*Math.PI/180;
        const w=(Math.abs(Math.cos(angle))*b.width+Math.abs(Math.sin(angle))*b.height)*zoom;
        const h=(Math.abs(Math.sin(angle))*b.width+Math.abs(Math.cos(angle))*b.height)*zoom;
        const cx=pan.x+(b.x+b.width/2)*zoom, cy=pan.y+(b.y+b.height/2)*zoom;
        return !b.locked && cx+w/2>=left && cx-w/2<=left+width && cy+h/2>=top && cy-h/2<=top+height;
      });
      dispatch({type:'SELECT_MANY',ids:[...new Set([...start.base,...hits.map(b=>b.id)])]});
      return;
    }
    if (!panning.current) return;
    const p = panning.current;
    setViewport({zoom, pan: {x: p.px + (e.clientX - p.startX), y: p.py + (e.clientY - p.startY)}});
  };

  const onPointerUp = (e: React.PointerEvent) => {
    marquee.current=null;
    setBox(null);
    panning.current = null;
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden bg-slate-100"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(100,116,139,0.28) 1px, transparent 1px)',
        backgroundSize: `${GRID * zoom}px ${GRID * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: panning.current ? 'grabbing' : 'default',
      }}
      onContextMenu={event=>{
        const target=event.target as Element;
        const id=target.closest<HTMLElement>('[data-object-id]')?.dataset.objectId;
        if(!id || target.closest('input,textarea,[contenteditable=true]')) return;
        event.preventDefault();
        const ids=selectedSet.has(id) ? selectedIds : members(id);
        setEditingId(null);
        dispatch({type:'SELECT_MANY',ids});
        setMenu({x:event.clientX,y:event.clientY,ids});
      }}
      onPointerDownCapture={event => {
        if ((spaceDown.current || event.button === 1) &&
            !(event.target as Element).closest('[data-canvas-controls], input, textarea, select')) {
          event.preventDefault();
          event.stopPropagation();
          onPointerDown(event);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
            snapTargets={selectedSet.has(block.id) ? outsideSelection : visibleBlocks}
            dispatch={dispatch}
            onSelect={(id) => {setEditingId(null); dispatch({type: 'SELECT_MANY', ids:members(id)});}}
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

      <button data-canvas-controls aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onPointerDown={e=>e.stopPropagation()} onClick={()=>help.current?.showModal()} className="icon-btn absolute right-3 top-3 bg-white shadow"><Keyboard size={17}/></button>
      <dialog ref={help} aria-label="Keyboard shortcuts" onPointerDown={e=>e.stopPropagation()} className="m-auto max-h-[85vh] max-w-[92vw] rounded-xl p-5 shadow-xl backdrop:bg-black/30">
        <h2 className="mb-3 font-display font-bold">Keyboard shortcuts</h2>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-2 text-sm">
          {[
            ['Select multiple','Drag on empty canvas'],['Toggle selection','Ctrl / Cmd / Shift + click'],
            ['Select all','Ctrl / Cmd + A'],['Copy, cut, paste','Ctrl / Cmd + C, X, V'],
            ['Duplicate','Ctrl / Cmd + D'],['Undo, redo','Ctrl / Cmd + Z, Shift+Z'],
            ['Group, ungroup','Ctrl / Cmd + G, Shift+G'],['Nudge','Arrows · Shift for 10'],
            ['Delete','Delete / Backspace'],['Pan','Space + drag / middle drag'],
            ['Zoom','+ / −'],['Fit content','Shift + 1'],['Deselect','Esc'],
          ].map(([action,keys])=><div key={action} className="contents"><dt>{action}</dt><dd>{keys}</dd></div>)}
        </dl>
        <button autoFocus className="panel-btn mt-4" onClick={()=>help.current?.close()}>Close</button>
      </dialog>
      {menu && <ObjectMenu {...menu} onClose={()=>setMenu(null)}/>}
      {box && <div className="pointer-events-none absolute border border-blue-500 bg-blue-500/10" style={box}/>}
      <div data-canvas-controls onPointerDown={event => event.stopPropagation()} className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-lg backdrop-blur">
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









