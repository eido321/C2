import {ScrollText, Loader2} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {Whiteboard, WhiteboardTemplate} from '@/types';
import {loadWhiteboard, saveWhiteboard} from '@/lib/persistence';
import {normalizeBoard} from '@/lib/board';
import {library, saveSheet, type CloudSheet} from '@/lib/library';
import {createEmptyBoard, WhiteboardProvider} from '@/store/WhiteboardContext';
import {StartScreen} from '@/components/templates/StartScreen';
import {LoginScreen} from '@/components/LoginScreen';
import {AccountLibrary} from '@/components/AccountLibrary';
import {Workspace} from '@/components/Workspace';

const inEditor = window.location.pathname.replace(/\/$/, '') === '/whiteboard';
const sheetId = inEditor ? new URLSearchParams(window.location.search).get('sheet') : null;
const editorUrl = (id?: string) => id ? '/whiteboard?sheet=' + encodeURIComponent(id) : '/whiteboard';

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [board, setBoard] = useState<Whiteboard | null>(null);
  const [cloud, setCloud] = useState<CloudSheet | null>(null);
  const [showStart, setShowStart] = useState(true);
  const [accountScreen, setAccountScreen] = useState(false);
  const jumpToTemplates = window.location.hash === '#templates';
  const [lastSheet, setLastSheet] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  function changeUser(next: string | null) {
    setLastSheet(next ? sessionStorage.getItem('c2_last_sheet:' + next) : null);
    setUser(next); setBoard(next ? null : loadWhiteboard()); setCloud(null); setShowStart(true);
  }
  useEffect(() => {
    let active = true;
    async function restore() {
      let name: string | null = null;
      try {
        name = (await library<{username:string|null}>('session')).username;
      } catch {
        if (active) setError('Account storage is unavailable. Device drafts are available.');
      }
      if (!active) return;
      changeUser(name);
      if (!inEditor) return;
      if (sheetId) {
        if (!name) { setAccountScreen(true); return; }
        try {
          const result = await library<{board:Whiteboard; revision:number}>('open',{id:sheetId});
          if (!active) return;
          setCloud({id:sheetId, revision:result.revision});
          setBoard(normalizeBoard(result.board));
          sessionStorage.setItem('c2_last_sheet:' + name, sheetId);
        } catch (err) {
          if (active) {
            sessionStorage.removeItem('c2_last_sheet:' + name);
            setLastSheet(null);
            setError(err instanceof Error ? err.message : 'Could not open sheet.');
            window.history.replaceState(null, '', '/');
          }
          return;
        }
      } else {
        const draft = loadWhiteboard();
        if (!draft) { window.location.replace('/'); return; }
        setBoard(draft);
      }
      setShowStart(false);
    }
    const refreshCachedPage = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', refreshCachedPage);
    void restore().finally(() => { if (active) setReady(true); });    return () => { active = false; window.removeEventListener('pageshow', refreshCachedPage); };
  }, []);
  async function start(next: Whiteboard) {
    setCreating(true); setError('');
    try {
      let sheet: CloudSheet | null = null;
      if (user) {
        const id = crypto.randomUUID();
        const {revision} = await saveSheet({id,revision:0}, next);
        sheet = {id, revision};
      }
      if (!sheet) saveWhiteboard(next);
      openEditor(sheet?.id);
    } catch (e) { setCreating(false); setError(e instanceof Error ? e.message : 'Could not create sheet.'); }
  }
  function template(t: WhiteboardTemplate) {
    const next = createEmptyBoard(t.name);
    return start({...next, blocks:t.build(), viewport:{pan:{x:60,y:40},zoom:1}});
  }
  function openEditor(id?: string) {
    setReady(false);
    window.location.assign(editorUrl(id));
  }
  if (!ready) return <main className="parchment grid min-h-full place-items-center p-6">
    <div role="status" className="screen-enter flex flex-col items-center gap-4 text-center">
      <span className="rounded-2xl bg-accent p-4 text-white shadow-lg"><ScrollText size={32}/></span>
      <h1 className="font-display text-2xl font-bold text-ink">{inEditor || showStart && user ? 'Opening character sheet…' : 'Opening whiteboard…'}</h1>
      <Loader2 aria-hidden="true" size={20} className="text-accent motion-safe:animate-spin"/>
    </div>
  </main>;
  async function deleteSheet(id: string) {
    setCreating(true);
    setError('');
    try {
      await library('delete', {id});
      if (lastSheet === id) {
        sessionStorage.removeItem('c2_last_sheet:' + user);
        setLastSheet(null);
      }
      if (cloud?.id === id) {
        setCloud(null);
        setBoard(null);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete sheet.');
      return false;
    } finally { setCreating(false); }
  }
  async function accountAction() {
    if (!user) { setAccountScreen(true); return; }
    setCreating(true);
    try { await library('logout'); changeUser(null); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign out.'); }
    finally { setCreating(false); }
  }
  return <>
    {board && !showStart && <WhiteboardProvider key={cloud?.id ?? board.id} initialBoard={board} cloud={cloud}>
      <Workspace menuOpen={showStart} onOpenStart={account => window.location.assign(account ? '/' : '/#templates')} />
    </WhiteboardProvider>}
    {showStart && (accountScreen ?
      <LoginScreen onBack={() => inEditor ? window.location.replace('/') : setAccountScreen(false)} onLogin={name => {if (sheetId && window.location.pathname === '/whiteboard') {window.location.reload(); return;} changeUser(name); setAccountScreen(false); setError('');}} /> :
      <StartScreen jumpToTemplates={jumpToTemplates} busy={creating} user={user} onAccount={accountAction}
        onSelectBlank={() => void start(createEmptyBoard())} onSelectTemplate={template}
        onContinue={lastSheet || board ? () => openEditor(lastSheet ?? undefined) : undefined}>
        {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
        <AccountLibrary key={user ?? ''} user={user} onOpen={openEditor} onDelete={deleteSheet}
          onCopy={user && loadWhiteboard() ? () => {const draft = loadWhiteboard(); if (draft) void start(draft);} : undefined}/>
      </StartScreen>)}
  </>;
}





