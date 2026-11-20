import {useEffect, useRef, useState} from 'react';
import {ChevronDown, ChevronRight, Layers, PanelLeftClose, PanelLeftOpen, PanelRightOpen} from 'lucide-react';
import type {BlockType} from '@/types';
import {readBoard} from '@/lib/readBoard';
import {createBlock} from '@/lib/blockDefaults';
import {exportWhiteboardPdf} from '@/lib/io';
import {LEFT_PANEL, RIGHT_PANEL, usePanelWidth} from '@/lib/panelWidth';
import {useWhiteboard} from '@/store/WhiteboardContext';
import {Canvas} from './canvas/Canvas';
import {BlockPalette} from './panels/BlockPalette';
import {LayersPanel} from './panels/LayersPanel';
import {PropertiesPanel} from './panels/PropertiesPanel';
import {PrintableBoard} from './print/PrintableBoard';
import {ResizeHandle} from './panels/ResizeHandle';
import {TopBar} from './panels/TopBar';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

export function Workspace({onOpenStart, menuOpen}: {onOpenStart: (account: boolean) => void; menuOpen: boolean}) {
  const {state, dispatch} = useWhiteboard();
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snap, setSnap] = useState(false);
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 850);
  const [layersOpen, setLayersOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 850);
  const leftPanel = usePanelWidth(LEFT_PANEL, 'left');
  const rightPanel = usePanelWidth(RIGHT_PANEL, 'right');
  const {selectedIds, board} = state;

  const exportSheet = async () => {
    dispatch({type: 'SELECT', id: null});
    setEditingId(null);
    try {
      await exportWhiteboardPdf(board);
    } catch (err) {
      window.alert(`Could not export PDF: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const addBlock = (type: BlockType) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const {pan, zoom} = state.board.viewport;
    const cx = rect ? (rect.width / 2 - pan.x) / zoom : 200;
    const cy = rect ? (rect.height / 2 - pan.y) / zoom : 200;
    const block = createBlock(type, 0, 0);
    block.x = Math.round(cx - block.width / 2);
    block.y = Math.round(cy - block.height / 2);
    dispatch({type: 'ADD_BLOCK', block});
  };

  useEffect(() => {
    const selection = board.blocks.filter(b => selectedIds.includes(b.id) && !b.hidden && !b.locked);
    const selectionData = () => {
      const ids = new Set(selection.map(b => b.id));
      return {blocks:selection,groups:board.groups.filter(g=>g.childIds.every(id=>ids.has(id)))};
    };
    const copy = (event: ClipboardEvent) => {
      if (menuOpen || editingId || isTypingTarget(event.target) || !selection.length || !event.clipboardData) return;
      event.clipboardData.setData('text/plain','C2 blocks\n'+JSON.stringify(selectionData()));
      event.preventDefault();
      if (event.type === 'cut') dispatch({type:'DELETE_BLOCKS',ids:selection.map(b=>b.id)});
    };
    const paste = (event: ClipboardEvent) => {
      if (menuOpen || editingId || isTypingTarget(event.target)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (!text?.startsWith('C2 blocks\n')) return;
      try {
        const data = readBoard(JSON.parse(text.slice('C2 blocks\n'.length)));
        dispatch({type:'PASTE',blocks:data.blocks,groups:data.groups});
        event.preventDefault();
      } catch { /* Leave an unrecognized clipboard entry alone. */ }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (menuOpen || (e.target as Element)?.closest?.('dialog')) return;
      if (isTypingTarget(e.target) || editingId) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement)?.blur?.();
          setEditingId(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        dispatch({type: 'SELECT', id: null});
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
        e.preventDefault();
        dispatch({type: 'DELETE_BLOCKS', ids: selection.map(b=>b.id)});
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && (key === 'z' || key === 'y')) {
        e.preventDefault();
        dispatch({type:key === 'y' || e.shiftKey ? 'REDO' : 'UNDO'});
        return;
      }
      if (mod && key === 'a') {
        e.preventDefault();
        dispatch({type:'SELECT_MANY',ids:board.blocks.filter(b=>!b.hidden && !b.locked).map(b=>b.id)});
        return;
      }
      const directions: Record<string,[number,number]> = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
      if (directions[e.key] && selection.length) {
        e.preventDefault();
        const [x,y] = directions[e.key], distance = e.shiftKey ? 10 : 1;
        dispatch({type:'MOVE',ids:selectedIds,dx:x*distance,dy:y*distance});
        return;
      }
      if (mod && e.key.toLowerCase() === 'g') {
        if (e.shiftKey) {
          const groups = board.groups.filter((g) => g.childIds.every((id) => selectedIds.includes(id)));
          if (groups.length) {
            e.preventDefault();
            groups.forEach((g) => dispatch({type: 'UNGROUP', groupId: g.id}));
          }
        } else if (selectedIds.length >= 2) {
          e.preventDefault();
          dispatch({type: 'GROUP_BLOCKS', ids: selectedIds});
        }
        return;
      }
      if (mod && e.key.toLowerCase() === 'd' && selection.length) {
        e.preventDefault();
        dispatch({type:'PASTE', ...selectionData()});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('copy', copy); window.addEventListener('cut', copy); window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('copy',copy); window.removeEventListener('cut',copy); window.removeEventListener('paste',paste);
    };
  }, [dispatch, editingId, selectedIds, board.groups, board.blocks, menuOpen]);

  return (
    <div inert={menuOpen} className={menuOpen ? "hidden" : "flex h-full w-full flex-col"}>
      <TopBar onOpenStart={onOpenStart} onExportSheet={exportSheet} />
      <div className="editor-body relative flex min-h-0 flex-1">
        {leftOpen ? (
          <aside
            className="relative flex shrink-0 flex-col border-r border-slate-200 bg-white"
            style={{width: leftPanel.width}}
          >
            <BlockPalette onAdd={addBlock} />
            <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
              <button
                onClick={() => setLayersOpen((v) => !v)}
                className="flex items-center gap-1.5 text-left"
              >
                {layersOpen ? (
                  <ChevronDown size={14} className="text-slate-400" />
                ) : (
                  <ChevronRight size={14} className="text-slate-400" />
                )}
                <span className="font-display text-sm font-bold uppercase tracking-wide text-slate-700">Layers</span>
              </button>
              <button
                className="icon-btn h-7 w-7"
                title="Collapse panel"
                onClick={() => setLeftOpen(false)}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            {layersOpen ? <LayersPanel /> : null}
            <ResizeHandle
              side="left"
              active={leftPanel.isResizing}
              onPointerDown={leftPanel.startResize}
              onDoubleClick={leftPanel.reset}
            />
          </aside>
        ) : (
          <div className="flex w-10 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-2">
            <button className="icon-btn" title="Show layers & blocks" onClick={() => {setLeftOpen(true); if (window.innerWidth < 850) setRightOpen(false);}}>
              <PanelLeftOpen size={18} />
            </button>
            <Layers size={16} className="mt-3 text-slate-300" />
          </div>
        )}

        <main className="relative min-w-0 flex-1">
          <Canvas
            containerRef={containerRef}
            editingId={editingId}
            setEditingId={setEditingId}
            snap={snap}
            setSnap={setSnap}
          />
        </main>

        {rightOpen ? (
          <PropertiesPanel
            onCollapse={() => setRightOpen(false)}
            width={rightPanel.width}
            resizeHandle={
              <ResizeHandle
                side="right"
                active={rightPanel.isResizing}
                onPointerDown={rightPanel.startResize}
                onDoubleClick={rightPanel.reset}
              />
            }
          />
        ) : (
          <div className="flex w-10 shrink-0 flex-col items-center border-l border-slate-200 bg-white py-2">
            <button className="icon-btn" title="Show properties" onClick={() => {setRightOpen(true); if (window.innerWidth < 850) setLeftOpen(false);}}>
              <PanelRightOpen size={18} />
            </button>
          </div>
        )}
      </div>
      <PrintableBoard ref={printRef} board={board} />
    </div>
  );
}






