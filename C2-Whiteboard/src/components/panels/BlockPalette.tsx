import {useState} from 'react';
import {ChevronDown, ChevronRight} from 'lucide-react';
import type {BlockType} from '@/types';
import {BLOCK_ICONS} from '@/lib/blockDefaults';
import {cn} from '@/lib/utils';

const PALETTE: {type: BlockType; label: string; desc: string}[] = [
  {type: 'heading', label: 'Heading', desc: 'Title & subtitle'},
  {type: 'text', label: 'Text', desc: 'Notes & paragraphs'},
  {type:'spellSlots',label:'Spell Slots',desc:'Track total and expended slots'},
  {type:'abilityScore',label:'Ability Score',desc:'Spellcasting modifier, DC & attack'},
  {type: 'abilityScores', label: 'Ability Scores', desc: 'STR–CHA + modifiers'},
  {type: 'statBlock', label: 'Stat', desc: 'AC, HP, Speed…'},
  {type: 'list', label: 'List', desc: 'Inventory / features'},
  {type: 'spellList', label: 'Spell List', desc: 'Spells by level + slots'},
  {type: 'image', label: 'Image', desc: 'Portrait or map'},
  {type: 'divider', label: 'Divider', desc: 'Section break'},
];

interface Props {
  onAdd: (type: BlockType) => void;
}

export function BlockPalette({onAdd}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="shrink-0 border-b border-slate-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className="font-display text-sm font-bold uppercase tracking-wide text-slate-700">Blocks</span>
        </span>
      </button>
      {open ? (
        <div className="no-scrollbar max-h-[38vh] space-y-1.5 overflow-auto px-3 pb-3">
          {PALETTE.map(({type, label, desc}) => {
            const Icon = BLOCK_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all',
                  'hover:border-accent/40 hover:bg-accent/5 hover:shadow-sm',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{label}</span>
                  <span className="block truncate text-xs text-slate-400">{desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}


