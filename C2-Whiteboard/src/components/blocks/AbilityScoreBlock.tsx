import {castingFields} from '@/lib/castingFields';
import type {BlockViewProps} from './shared';

export function AbilityScoreBlock({block,editing,update}:BlockViewProps<'abilityScore'>) {
  const field = (key:keyof typeof block.content,label:string) => editing ?
    <input aria-label={label} value={block.content[key]} onPointerDown={e=>e.stopPropagation()}
      className="w-full min-w-0 bg-transparent text-inherit outline-accent"
      onChange={e=>update({[key]:e.target.value})}/> : block.content[key];
  return <div className="casting-card">
    <div className="casting-header"><div>{field('ability','Spellcasting ability')}</div><strong>Spellcasting ability</strong></div>
    {castingFields.slice(1).map(([key,label])=><div className="casting-row" key={key}>
      <span>{field(key,label)}</span><strong>{label}</strong>
    </div>)}
  </div>;
}
