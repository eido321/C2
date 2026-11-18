import {useEffect, useState} from 'react';
import type {Whiteboard, WhiteboardTemplate} from '@/types';
import {loadWhiteboard} from '@/lib/persistence';
import {normalizeBoard} from '@/lib/board';
import {library, saveSheet, type CloudSheet} from '@/lib/library';
import {createEmptyBoard, WhiteboardProvider} from '@/store/WhiteboardContext';
import {StartScreen} from '@/components/templates/StartScreen';
import {LoginScreen} from '@/components/LoginScreen';
import {AccountLibrary} from '@/components/AccountLibrary';
import {Workspace} from '@/components/Workspace';

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [board, setBoard] = useState<Whiteboard | null>(null);
  const [cloud, setCloud] = useState<CloudSheet | null>(null);
  const [showStart, setShowStart] = useState(true);
  const [accountScreen, setAccountScreen] = useState(false);
  const [jumpToTemplates, setJumpToTemplates] = useState(false);
  const [ready, setReady] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  function changeUser(next: string | null) {
    setJumpToTemplates(false);
    setUser(next); setBoard(next ? null : loadWhiteboard()); setCloud(null); setShowStart(true);
  }
  useEffect(() => {
    let active = true;
    library<{username:string|null}>('session').then(result => { if (active) changeUser(result.username); })
      .catch(() => { if (active) {changeUser(null); setError('Account storage is unavailable. Device drafts are available.');} })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
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
      setCloud(sheet); setBoard(next); setShowStart(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create sheet.'); }
    finally { setCreating(false); }
  }
  function template(t: WhiteboardTemplate) {
    const next = createEmptyBoard(t.name);
    return start({...next, blocks:t.build(), viewport:{pan:{x:60,y:40},zoom:1}});
  }
  if (!ready) return <main className="parchment grid h-full place-items-center">Opening whiteboard…</main>;
  async function openSheet(id: string) {
    setCreating(true);
    setError('');
    try {
      const result = await library<{board:Whiteboard; revision:number}>('open', {id});
      setEditorVersion(n => n+1);
      setCloud({id, revision:result.revision});
      setBoard(normalizeBoard(result.board));
      setShowStart(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open sheet.');
    } finally { setCreating(false); }
  }
  async function accountAction() {
    if (!user) { setJumpToTemplates(false); setAccountScreen(true); return; }
    setCreating(true);
    try { await library('logout'); changeUser(null); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign out.'); }
    finally { setCreating(false); }
  }
  return <>
    {board && <WhiteboardProvider key={editorVersion + (cloud?.id ?? board.id)} initialBoard={board} cloud={cloud}>
      <Workspace menuOpen={showStart} onOpenStart={account => {setJumpToTemplates(!account); setShowStart(true);}} />
    </WhiteboardProvider>}
    {showStart && (accountScreen ?
      <LoginScreen onBack={() => setAccountScreen(false)} onLogin={name => {changeUser(name); setAccountScreen(false); setError('');}} /> :
      <StartScreen jumpToTemplates={jumpToTemplates} busy={creating} user={user} onAccount={accountAction}
        onSelectBlank={() => void start(createEmptyBoard())} onSelectTemplate={template}
        onContinue={board ? () => setShowStart(false) : undefined}>
        {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
        <AccountLibrary key={user ?? ''} user={user} onOpen={openSheet}
          onCopy={user && loadWhiteboard() ? () => {const draft = loadWhiteboard(); if (draft) void start(draft);} : undefined}/>
      </StartScreen>)}
  </>;
}

