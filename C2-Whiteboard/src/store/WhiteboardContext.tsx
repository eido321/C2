import {createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode} from 'react';
import type {Block, Viewport, Whiteboard} from '@/types';
import {WHITEBOARD_SCHEMA_VERSION} from '@/types';
import {loadWhiteboard, saveWhiteboard} from '@/lib/persistence';
import {whiteboardReducer, type WhiteboardAction, type WhiteboardState} from './reducer';

export type SaveStatus = 'idle' | 'saving' | 'saved';

interface WhiteboardContextValue {
  state: WhiteboardState;
  dispatch: React.Dispatch<WhiteboardAction>;
  saveStatus: SaveStatus;
  /** The single selected block, or null when zero or multiple are selected. */
  selectedBlock: Block | null;
  selectedBlocks: Block[];
}

const WhiteboardContext = createContext<WhiteboardContextValue | null>(null);

export function createEmptyBoard(name = 'Untitled Whiteboard'): Whiteboard {
  return {
    id: `wb_${Date.now()}`,
    name,
    blocks: [],
    groups: [],
    viewport: {pan: {x: 0, y: 0}, zoom: 1},
    updatedAt: Date.now(),
    version: WHITEBOARD_SCHEMA_VERSION,
  };
}

interface ProviderProps {
  initialBoard: Whiteboard;
  children: ReactNode;
}

export function WhiteboardProvider({initialBoard, children}: ProviderProps) {
  const [state, dispatch] = useReducer(whiteboardReducer, {board: initialBoard, selectedIds: []});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveStatus('saving');
    const handle = window.setTimeout(() => {
      saveWhiteboard(state.board);
      setSaveStatus('saved');
    }, 600);
    return () => window.clearTimeout(handle);
  }, [state.board]);

  const selectedBlocks = useMemo(
    () => state.board.blocks.filter((b) => state.selectedIds.includes(b.id)),
    [state.board.blocks, state.selectedIds],
  );

  const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : null;

  const value = useMemo<WhiteboardContextValue>(
    () => ({state, dispatch, saveStatus, selectedBlock, selectedBlocks}),
    [state, saveStatus, selectedBlock, selectedBlocks],
  );

  return <WhiteboardContext.Provider value={value}>{children}</WhiteboardContext.Provider>;
}

export function useWhiteboard(): WhiteboardContextValue {
  const ctx = useContext(WhiteboardContext);
  if (!ctx) throw new Error('useWhiteboard must be used within WhiteboardProvider');
  return ctx;
}

export function useViewport(): Viewport {
  return useWhiteboard().state.board.viewport;
}

export {loadWhiteboard};
