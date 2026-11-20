import {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useWhiteboard} from '@/store/WhiteboardContext';
import {readBoard} from '@/lib/readBoard';

interface Props {x:number; y:number; ids:string[]; onClose:()=>void}

export function ObjectMenu({x,y,ids,onClose}:Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error,setError] = useState('');
  const {state:{board},dispatch} = useWhiteboard();
  const blocks = board.blocks.filter(b=>ids.includes(b.id));
  const locked = blocks.some(b=>b.locked);
  const groups = board.groups.filter(g=>g.childIds.every(id=>ids.includes(id)));
  const contained = board.groups.filter(g=>g.childIds.some(id=>ids.includes(id)));
  const payload = {blocks,groups};
  useLayoutEffect(()=>{
    const el=dialog.current!;
    el.showModal();
    el.focus({preventScroll:true});
    const rect=el.getBoundingClientRect();
    el.style.left=Math.max(4,Math.min(x,window.innerWidth-rect.width-4))+'px';
    el.style.top=Math.max(4,Math.min(y,window.innerHeight-rect.height-4))+'px';
    return ()=>el.close();
  },[x,y]);
  const item=(label:string, run:()=>unknown, disabled=false)=><button disabled={disabled} className="block w-full rounded px-3 py-1 text-left text-sm enabled:cursor-pointer enabled:hover:bg-accent enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40" onClick={async()=>{
    try {await run();onClose();} catch {setError('Clipboard unavailable. Use the keyboard shortcut on the canvas.');}
  }}>{label}</button>;
  const copy=()=>navigator.clipboard.writeText('C2 blocks\n'+JSON.stringify(payload));
  const remove=()=>dispatch({type:'DELETE_BLOCKS',ids});
  return createPortal(<dialog tabIndex={-1} ref={dialog} aria-label="Object actions" onCancel={onClose}
    onPointerDown={e=>{e.stopPropagation();if(e.target===e.currentTarget) onClose();}}
    onContextMenu={e=>e.preventDefault()} onKeyDown={e=>e.stopPropagation()}
    className="outline-none fixed inset-auto m-0 max-h-[95vh] w-48 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl backdrop:bg-transparent">
    {item(locked?'Unlock':'Lock',()=>{dispatch({type:'UPDATE_BLOCKS',ids,patch:{locked:!locked}});if(!locked) dispatch({type:'SELECT',id:null});})}
    {item('Group',()=>dispatch({type:'GROUP_BLOCKS',ids}),locked || ids.length<2 || groups.some(g=>g.childIds.length===ids.length))}
    {item('Ungroup',()=>contained.forEach(g=>dispatch({type:'UNGROUP',groupId:g.id})),locked || !contained.length)}
    <hr className="my-1 border-slate-200"/>
    {item('Copy',copy)}
    {item('Cut',async()=>{await copy();remove();},locked)}
    {item('Paste',async()=>{const text=await navigator.clipboard.readText();if(!text.startsWith('C2 blocks\n')) {setError('Copy a board object first.');throw Error();}const data=readBoard(JSON.parse(text.slice(10)));dispatch({type:'PASTE',blocks:data.blocks,groups:data.groups});})}
    {item('Duplicate',()=>dispatch({type:'PASTE',...payload}),locked)}
    {item('Bring to front',()=>blocks.forEach(b=>dispatch({type:'BRING_TO_FRONT',id:b.id})),locked)}
    {item('Send to back',()=>[...blocks].reverse().forEach(b=>dispatch({type:'SEND_TO_BACK',id:b.id})),locked)}
    {item('Hide',()=>{dispatch({type:'UPDATE_BLOCKS',ids,patch:{hidden:true}});dispatch({type:'SELECT',id:null});},locked)}
    {item('Delete',remove,locked)}
    {error && <p role="alert" className="p-2 text-xs">{error}</p>}
  </dialog>,document.body);
}


