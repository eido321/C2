import {useEffect, useRef, useState} from 'react';
import {FileText, Trash2} from 'lucide-react';
import {library} from '@/lib/library';

interface SheetSummary {id: string; name: string; modified: string}
interface Props {
  user: string | null;
  onDelete: (id: string) => Promise<boolean>;
  onOpen: (id: string) => void;
  onCopy?: () => void;
}

export function AccountLibrary({user, onOpen, onDelete, onCopy}: Props) {
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');
    library<{sheets: SheetSummary[]}>('list')
      .then(result => { if (active) setSheets(result.sheets); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, refresh]);
  const modal = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<SheetSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (pending) modal.current?.showModal(); }, [pending]);
  async function confirmDelete() {
    if (!pending || deleting) return;
    setDeleting(true);
    try {
      if (await onDelete(pending.id)) setSheets(previous => previous.filter(item => item.id !== pending.id));
    } finally {
      modal.current?.close();
      setDeleting(false);
    }
  }  const matches = sheets.filter(sheet => (sheet.name || 'Untitled sheet').toLowerCase().includes(search.trim().toLowerCase()));
  return <section aria-labelledby="my-sheets" className="mb-10">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id="my-sheets" className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">My sheets</h2>
      {user && onCopy && <button className="text-sm font-semibold text-accent hover:underline" onClick={onCopy}>Copy this device’s draft to my sheets</button>}
    </div>
    {!user ? <p className="text-sm text-ink-soft">Log in to see your saved character sheets.</p> :
      error ? <p role="alert">{error} <button onClick={() => setRefresh(n => n+1)}>Retry</button></p> :
      loading ? <p role="status">Loading sheets…</p> : <>
        {sheets.length > 0 && <input type="search" aria-label="Find a sheet" placeholder="Find a sheet" value={search} onChange={e => setSearch(e.target.value)} className="mb-3 w-full max-w-sm rounded-lg border border-slate-200 bg-white p-2 text-sm" />}
        {matches.length ? <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{matches.map(sheet =>
          <li key={sheet.id} className="flex items-center rounded-xl border border-slate-200 bg-white pr-2 transition-shadow hover:shadow-md"><button onClick={() => onOpen(sheet.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-4 text-left">
            <FileText size={20} className="shrink-0 text-accent"/><span className="min-w-0"><strong className="block truncate">{sheet.name || 'Untitled sheet'}</strong><small className="text-ink-soft">{new Date(sheet.modified).toLocaleString()}</small></span>
          </button><button type="button" aria-label={'Delete ' + (sheet.name || 'Untitled sheet')} title="Delete sheet" onClick={() => setPending(sheet)} className="icon-btn shrink-0 hover:text-red-700"><Trash2 size={17} /></button></li>)}</ul> : <p className="text-sm text-ink-soft">{sheets.length ? 'No matching sheets.' : 'Choose a template below to save your first sheet.'}</p>}
      </>}
    <dialog ref={modal} aria-labelledby="delete-title" aria-describedby="delete-description"
      onCancel={event => { if (deleting) event.preventDefault(); }} onClose={() => setPending(null)}
      className="m-auto w-[min(26rem,90vw)] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
      <Trash2 size={22} className="mb-3 text-red-700"/>
      <h2 id="delete-title" className="font-display text-xl font-bold">Delete character sheet?</h2>
      <p id="delete-description" className="my-3 break-words text-sm text-ink-soft">“{pending?.name || 'Untitled sheet'}” will be permanently deleted from your library.</p>
      <div className="mt-5 flex justify-end gap-2">
        <button autoFocus disabled={deleting} className="panel-btn" onClick={() => modal.current?.close()}>Cancel</button>
        <button disabled={deleting} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete sheet'}</button>
      </div>
    </dialog>
  </section>;
}


