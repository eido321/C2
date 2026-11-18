import {useEffect, useState} from 'react';
import {FileText} from 'lucide-react';
import {library} from '@/lib/library';

interface SheetSummary {id: string; name: string; modified: string}
interface Props {
  user: string | null;
  onOpen: (id: string) => void;
  onCopy?: () => void;
}

export function AccountLibrary({user, onOpen, onCopy}: Props) {
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
  const matches = sheets.filter(sheet => (sheet.name || 'Untitled sheet').toLowerCase().includes(search.trim().toLowerCase()));
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
          <li key={sheet.id}><button onClick={() => onOpen(sheet.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-md">
            <FileText size={20} className="shrink-0 text-accent"/><span className="min-w-0"><strong className="block truncate">{sheet.name || 'Untitled sheet'}</strong><small className="text-ink-soft">{new Date(sheet.modified).toLocaleString()}</small></span>
          </button></li>)}</ul> : <p className="text-sm text-ink-soft">{sheets.length ? 'No matching sheets.' : 'Choose a template below to save your first sheet.'}</p>}
      </>}
  </section>;
}
