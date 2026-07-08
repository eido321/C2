import {useEffect, useRef, useState} from 'react';
import {ChevronDown, ChevronRight, Layers, PanelLeftClose, PanelLeftOpen, PanelRightOpen} from 'lucide-react';
import type {BlockType} from '@/types';
import {createBlock} from '@/lib/blockDefaults';
import {LEFT_PANEL, RIGHT_PANEL, usePanelWidth} from '@/lib/panelWidth';
import {useWhiteboard} from '@/store/WhiteboardContext';
import {Canvas} from './canvas/Canvas';
import {BlockPalette} from './panels/BlockPalette';
import {LayersPanel} from './panels/LayersPanel';
import {PropertiesPanel} from './panels/PropertiesPanel';
import {ResizeHandle} from './panels/ResizeHandle';
import {TopBar} from './panels/TopBar';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

export function Workspace({onOpenStart}: {onOpenStart: () => void}) {
  const {state, dispatch} = useWhiteboard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snap, setSnap] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const leftPanel = usePanelWidth(LEFT_PANEL, 'left');
  const rightPanel = usePanelWidth(RIGHT_PANEL, 'right');

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

  const {selectedIds, board} = state;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || editingId) {
        if (e.key === 'Escape') (e.target as HTMLElement)?.blur?.();
        return;
      }
      if (e.key === 'Escape') {
        dispatch({type: 'SELECT', id: null});
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        e.preventDefault();
        dispatch({type: 'DELETE_BLOCKS', ids: selectedIds});
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
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
      if (mod && e.key.toLowerCase() === 'd' && selectedIds.length === 1) {
        e.preventDefault();
        dispatch({type: 'DUPLICATE_BLOCK', id: selectedIds[0]});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, editingId, selectedIds, board.groups]);

  return (
    <div className="flex h-full w-full flex-col">
      <TopBar onOpenStart={onOpenStart} />
      <div className="flex min-h-0 flex-1">
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
            <button className="icon-btn" title="Show layers & blocks" onClick={() => setLeftOpen(true)}>
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
            <button className="icon-btn" title="Show properties" onClick={() => setRightOpen(true)}>
              <PanelRightOpen size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
