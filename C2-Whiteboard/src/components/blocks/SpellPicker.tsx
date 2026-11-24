import {useLayoutEffect, useRef, useState, type FormEvent} from 'react';
import {createPortal} from 'react-dom';
import {Check, Plus, Search, X} from 'lucide-react';
import type {SpellEntry, SpellLevelGroup} from '@/types';
import catalog from '@/data/spellCatalog.json';
import {createSpell} from '@/lib/spellList';
import {cn} from '@/lib/utils';
import {SPELL_LEVELS, spellLevelLabel} from './shared';

const classes = [...new Set(catalog.flatMap((spell) => spell.classes ?? []))].sort();
const resultLimit = 50;

interface Props {
  groups: SpellLevelGroup[];
  initialLevel: number | null;
  onAdd: (level: number, spell: SpellEntry) => void;
  onClose: () => void;
}

export function SpellPicker({groups, initialLevel, onAdd, onClose}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState(initialLevel === null ? '' : String(initialLevel));
  const [spellClass, setSpellClass] = useState('');
  const [limit, setLimit] = useState(resultLimit);
  const [name, setName] = useState('');
  const [customLevel, setCustomLevel] = useState(initialLevel ?? 1);

  useLayoutEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    search.current?.focus();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement) trigger.focus({preventScroll: true});
    };
  }, []);

  const term = query.trim().toLowerCase();
  const added = new Set(groups.flatMap((group) => group.spells.map((spell) => `${group.level}:${spell.name.trim().toLowerCase()}`)));
  const matches = catalog.filter((spell) => (
    (level === '' || spell.level === Number(level)) &&
    (!spellClass || spell.classes?.includes(spellClass)) &&
    (!term || spell.name.toLowerCase().includes(term))
  ));

  function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(customLevel, createSpell(name.trim()));
    onClose();
  }

  return createPortal(
    <dialog
      ref={dialog}
      aria-label="Add spells"
      onCancel={(event) => {event.preventDefault(); onClose();}}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className="m-auto max-h-[90dvh] w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gold/40 bg-white text-ink shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex max-h-[90dvh] min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gold/30 bg-parchment px-5 py-4">
          <h2 className="font-display text-xl font-bold text-accent">Add spells</h2>
          <button type="button" aria-label="Close spell picker" className="icon-btn" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="flex shrink-0 gap-2 px-5 pt-4">
          {(['catalog', 'custom'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-semibold', mode === value ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            >
              {value === 'catalog' ? 'Spell catalog' : 'Custom spell'}
            </button>
          ))}
        </div>
        {mode === 'catalog' ? (
          <>
            <div className="shrink-0 space-y-2 px-5 py-3">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 focus-within:border-accent">
                <Search size={16} className="shrink-0 text-slate-500" />
                <input
                  ref={search}
                  type="search"
                  aria-label="Search spell catalog"
                  value={query}
                  placeholder="Search spells by name"
                  className="min-w-0 flex-1 py-2 text-sm outline-none"
                  onChange={(event) => {setQuery(event.target.value); setLimit(resultLimit);}}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Catalog spell level" value={level} className="field-input" onChange={(event) => {setLevel(event.target.value); setLimit(resultLimit);}}>
                  <option value="">All levels</option>
                  {SPELL_LEVELS.map((value) => <option key={value} value={value}>{spellLevelLabel(value)}</option>)}
                </select>
                <select aria-label="Spellcasting class" value={spellClass} className="field-input" onChange={(event) => {setSpellClass(event.target.value); setLimit(resultLimit);}}>
                  <option value="">All classes</option>
                  {classes.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            </div>
            <div className="spell-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100 px-5">
              {matches.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No matches. Try a different name or add a custom spell.</p>}
              <ul className="divide-y divide-slate-100">
                {matches.slice(0, limit).map(({level: spellLevel, classes: _classes, ...spell}) => {
                  const key = `${spellLevel}:${spell.name.toLowerCase()}`;
                  const alreadyAdded = added.has(key);
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="break-words font-semibold text-slate-900">{spell.name}</div>
                        <div className="text-xs text-slate-600">{[spellLevelLabel(spellLevel), spell.school, spell.castingTime, spell.range].filter(Boolean).join(' · ')}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={`${alreadyAdded ? 'Added' : 'Add'} ${spell.name}`}
                        aria-disabled={alreadyAdded}
                        onClick={() => {if (!alreadyAdded) onAdd(spellLevel, {...createSpell(spell.name), ...spell});}}
                        className="panel-btn shrink-0 border border-slate-200 px-2 py-1 text-xs aria-disabled:cursor-default aria-disabled:bg-slate-50 aria-disabled:text-slate-500"
                      >
                        {alreadyAdded ? <Check size={14} /> : <Plus size={14} />}{alreadyAdded ? 'Added' : 'Add'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {matches.length > limit && <button type="button" className="panel-btn my-2" onClick={() => setLimit(limit + resultLimit)}>Show more spells</button>}
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
              <span aria-live="polite" className="text-xs text-slate-500">{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span>
              <button type="button" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white" onClick={onClose}>Done</button>
            </footer>
          </>
        ) : (
          <form onSubmit={addCustom} className="spell-scrollbar min-h-0 space-y-3 overflow-auto px-5 py-4">
            <label className="block">
              <span className="field-label">Spell name</span>
              <input required value={name} onChange={(event) => setName(event.target.value)} className="field-input" />
            </label>
            <label className="block">
              <span className="field-label">Spell level</span>
              <select value={customLevel} onChange={(event) => setCustomLevel(Number(event.target.value))} className="field-input">
                {SPELL_LEVELS.map((value) => <option key={value} value={value}>{spellLevelLabel(value)}</option>)}
              </select>
            </label>
            <button type="submit" disabled={!name.trim()} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add custom spell</button>
          </form>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
