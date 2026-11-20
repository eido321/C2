import {slotCapacity,setSlotTotal} from '@/lib/slotRows';
import type {BlockViewProps} from './shared';

export function SpellSlotsBlock({block,editing,update}:BlockViewProps<'spellSlots'>) {
  const {rows}=block.content;
  return <div className="slot-card">
    <h3>Spell Slots</h3>
    <div className="slot-columns">{[0,3,6].map(start=><div className="slot-column" key={start}>
      <span/><small>Total</small><small>Expended</small>
      {rows.slice(start,start+3).map((row,j)=>{
        const i=start+j;
        return <div className="contents" key={i}>
          <b>Level {i+1}</b>
          {editing && !block.locked ? <input type="number" aria-label={'Level '+(i+1)+' total'} min={0} max={slotCapacity[i]} value={row.total || ''}
            onPointerDown={e=>e.stopPropagation()} onChange={e=>update({rows:rows.map((r,k)=>k===i?setSlotTotal(r,i,Number(e.target.value)):r)})}/> : <span className="slot-total">{row.total || ''}</span>}
          <span className="slot-marks">{row.used.map((used,k)=><button key={k} disabled={block.locked || k>=row.total} aria-pressed={used}
            aria-label={'Level '+(i+1)+' slot '+(k+1)} onPointerDown={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()}
            onClick={()=>update({rows:rows.map((r,n)=>n===i?{...r,used:r.used.map((v,m)=>m===k?!v:v)}:r)})}>{used?'◆':'◇'}</button>)}</span>
        </div>;
      })}
    </div>)}</div>
  </div>;
}
