import {useRef} from 'react';
import {Check, FileText, LayoutTemplate, Loader2, LogOut, Upload} from 'lucide-react';
import {exportWhiteboard, parsePdfWhiteboard, parseSheetHtml, parseWhiteboard, readFileAsText} from '@/lib/io';
import {useWhiteboard} from '@/store/WhiteboardContext';

interface Props {
  onOpenStart: (account: boolean) => void;
  onExportSheet: () => void | Promise<void>;
}

export function TopBar({onOpenStart, onExportSheet}: Props) {
  const {state, dispatch, saveStatus, saveError, retrySave} = useWhiteboard();
  const {board} = state;
  const fileRef = useRef<HTMLInputElement>(null);

  function openMenu(account: boolean) {
    if (saveStatus !== 'error' || window.confirm(saveError + ' Leave the editor anyway?')) onOpenStart(account);
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isHtml = file.type === 'text/html' || lower.endsWith('.html') || lower.endsWith('.htm');
      const text = isPdf ? '' : await readFileAsText(file);
      const board = isPdf ? await parsePdfWhiteboard(file) : isHtml ? parseSheetHtml(text) : parseWhiteboard(text);
      if (state.board.blocks.length && !window.confirm('Replace the current sheet with the imported sheet?')) return;
      dispatch({type: 'LOAD_BOARD', board});
    } catch (err) {
      window.alert(`Could not import file: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  return (
    <header className="editor-toolbar flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
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
          aria-label="Sheet name"
          maxLength={300}
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
          ) : saveStatus === 'error' ? (<button title={saveError} onClick={retrySave}>Save failed · Retry</button>) : (
            <>
              <Check size={13} className="text-emerald-500" /> {saveStatus === 'cloud' ? 'Saved to account' : 'Saved on device'}
            </>
          )}
        </span>

        <button className="panel-btn" disabled={saveStatus === 'saving'} onClick={() => openMenu(false)}>
          <LayoutTemplate size={16} /> Templates
        </button>
        <button className="panel-btn" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import sheet
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-soft"
          onClick={() => void onExportSheet()}
          title="Downloads a PDF with editable form fields. Re-import into the app to continue editing."
        >
          <FileText size={16} /> Export PDF
        </button>
        <button className="panel-btn" title="Download an editable JSON backup" onClick={() => exportWhiteboard(board)}>Export JSON</button>
        <button className="editor-exit icon-btn" disabled={saveStatus === 'saving'} onClick={() => openMenu(true)} aria-label="Exit editor" title="Exit editor and return to My sheets">
          <LogOut size={19} />
        </button>
        <input ref={fileRef}
          type="file"
          accept="application/pdf,.pdf,text/html,.html,.htm,application/json,.json"
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




