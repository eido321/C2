import {useRef} from 'react';
import {Check, Download, LayoutTemplate, Loader2, Upload} from 'lucide-react';
import {exportWhiteboard, parseWhiteboard, readFileAsText} from '@/lib/io';
import {useWhiteboard} from '@/store/WhiteboardContext';

interface Props {
  onOpenStart: () => void;
}

export function TopBar({onOpenStart}: Props) {
  const {state, dispatch, saveStatus} = useWhiteboard();
  const {board} = state;
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const board = parseWhiteboard(text);
      dispatch({type: 'LOAD_BOARD', board});
    } catch (err) {
      window.alert(`Could not import file: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold text-white shadow-sm">
          C2
        </div>
        <div className="hidden sm:block">
          <p className="font-display text-sm font-bold leading-tight text-slate-800">Whiteboard</p>
          <p className="text-[11px] leading-tight text-slate-400">D&D Sheet Builder</p>
        </div>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <input
          value={board.name}
          onChange={(e) => dispatch({type: 'RENAME', name: e.target.value})}
          className="w-48 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-slate-700 outline-none transition-colors hover:border-slate-200 focus:border-accent/50 focus:bg-white"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          {saveStatus === 'saving' ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check size={13} className="text-emerald-500" /> Saved
            </>
          )}
        </span>

        <button className="panel-btn" onClick={onOpenStart}>
          <LayoutTemplate size={16} /> Templates
        </button>
        <button className="panel-btn" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-soft"
          onClick={() => exportWhiteboard(board)}
        >
          <Download size={16} /> Export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}
