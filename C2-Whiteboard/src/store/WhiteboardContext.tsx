import {createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode} from 'react';
import type {Block, Viewport, Whiteboard} from '@/types';
import {WHITEBOARD_SCHEMA_VERSION} from '@/types';
import {saveSheet, type CloudSheet} from '@/lib/library';
import {loadWhiteboard, saveWhiteboard} from '@/lib/persistence';
import {whiteboardReducer, type WhiteboardAction, type WhiteboardState} from './reducer';

export type SaveStatus = 'saving' | 'device' | 'cloud' | 'error';

interface WhiteboardContextValue {
  state: WhiteboardState;
  dispatch: React.Dispatch<WhiteboardAction>;
  saveStatus: SaveStatus;
  saveError: string;
  retrySave: () => void;
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
  cloud: CloudSheet | null;
  children: ReactNode;
}

export function WhiteboardProvider({initialBoard, cloud, children}: ProviderProps) {
  const [state, dispatch] = useReducer(whiteboardReducer, {board: initialBoard, selectedIds: []});
  const [persisted, setPersisted] = useState<Whiteboard | null>(cloud ? initialBoard : null);
  const [saveError, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(cloud?.revision ?? 0);
  const queue = useRef(Promise.resolve());
  const saveStatus: SaveStatus = saveError ? 'error' : persisted !== state.board ? 'saving' : cloud ? 'cloud' : 'device';

  useEffect(() => {
    if (persisted === state.board) return;
    let current = true;
    setError('');
    const timer = window.setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (!current) return;
        try {
          if (cloud) {
            const result = await saveSheet({id: cloud.id, revision: revision.current}, state.board);
            revision.current = result.revision;
          } else {
            saveWhiteboard(state.board);
          }
          if (current) setPersisted(state.board);
        } catch (e) {
          if (current) setError(e instanceof Error ? e.message : 'Could not save this sheet.');
        }
      });
    }, 450);
    return () => { current = false; window.clearTimeout(timer); };
  }, [state.board, cloud, persisted, attempt]);

  useEffect(() => {
    if (persisted === state.board) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [persisted, state.board]);
  const selectedBlocks = useMemo(
    () => state.board.blocks.filter((b) => state.selectedIds.includes(b.id)),
    [state.board.blocks, state.selectedIds],
  );

  const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : null;

  const value = useMemo<WhiteboardContextValue>(
    () => ({state, dispatch, saveStatus, saveError, retrySave: () => setAttempt(n => n + 1), selectedBlock, selectedBlocks}),
    [state, saveStatus, saveError, selectedBlock, selectedBlocks],
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

