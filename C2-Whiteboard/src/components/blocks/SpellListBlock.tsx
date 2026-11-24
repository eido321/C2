import {useRef, useState, type PointerEvent} from 'react';
import {Check, ChevronDown, Minus, Plus, RotateCcw, Search, X} from 'lucide-react';
import type {SpellColumn, SpellEntry, SpellLevelGroup, SpellListContent} from '@/types';
import {makeSpellGroup} from '@/lib/blockDefaults';
import {addSpellToLevel, slotCount} from '@/lib/spellList';
import {cn} from '@/lib/utils';
import {componentsLabel, SPELL_COLUMN_LABELS, SPELL_LEVELS, spellLevelLabel, type BlockViewProps} from './shared';
import {SpellPicker} from './SpellPicker';

const summaryFields = [
  {key: 'ability', label: 'Ability'},
  {key: 'saveDc', label: 'Save DC'},
  {key: 'attackBonus', label: 'Spell Atk'},
] as const;

function stopCanvasDrag(event: PointerEvent) {
  if (event.button === 0) event.stopPropagation();
}

function SpellSummary({content, editing, update}: {content: SpellListContent; editing: boolean; update: BlockViewProps<'spellList'>['update']}) {
  return (
    <div className="grid grid-cols-3 divide-x divide-gold/30 overflow-hidden rounded-lg border border-gold/35 bg-white/45">
      {summaryFields.map(({key, label}) => (
        <div key={key} className="min-w-0 px-2 py-1 text-center">
          <div className="font-sans text-[0.68em] font-semibold uppercase tracking-wide text-accent">{label}</div>
          {editing ? (
            <input aria-label={label} value={content[key] ?? ''} onChange={(e) => update({[key]: e.target.value})} onPointerDown={stopCanvasDrag} className="w-full rounded bg-white/45 text-center font-semibold outline-accent" />
          ) : (
            <div className="break-words font-semibold text-ink">{content[key] || '—'}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function SlotTracker({group, editing, onChange}: {group: SpellLevelGroup; editing: boolean; onChange?: (patch: Partial<SpellLevelGroup>) => void}) {
  const total = slotCount(group.slotsTotal);
  const expended = Math.min(total, slotCount(group.slotsExpended));
  const remaining = total - expended;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 font-sans text-[0.75em] text-ink-soft" onPointerDown={onChange ? stopCanvasDrag : undefined}>
      {onChange && total > 0 && (
        <button type="button" className="spell-control" disabled={remaining === 0} aria-label={`Spend ${spellLevelLabel(group.level)} slot`} title="Spend a slot" onClick={() => onChange({slotsExpended: expended + 1})}>
          <Minus size="1em" />
        </button>
      )}
      <span className="whitespace-nowrap tabular-nums" title="Slots remaining">{remaining}/{total} slots</span>
      {onChange && total > 0 && (
        <button type="button" className="spell-control" disabled={expended === 0} aria-label={`Recover ${spellLevelLabel(group.level)} slot`} title="Recover a slot" onClick={() => onChange({slotsExpended: expended - 1})}>
          <Plus size="1em" />
        </button>
      )}
      {editing && onChange && (
        <input
          type="number"
          min={0}
          value={total}
          aria-label={`${spellLevelLabel(group.level)} total slots`}
          title="Total slots"
          className="w-10 rounded border border-gold/40 bg-white/55 px-1 text-center tabular-nums"
          onChange={(e) => {
            const slotsTotal = slotCount(e.target.value);
            onChange({slotsTotal, slotsExpended: Math.min(expended, slotsTotal)});
          }}
        />
      )}
    </div>
  );
}

function SpellCard({spell, level, columns, editing, onChange, onRemove}: {
  spell: SpellEntry;
  level: number;
  columns: SpellColumn[];
  editing: boolean;
  onChange?: (patch: Partial<SpellEntry>) => void;
  onRemove?: () => void;
}) {
  const name = spell.name || 'Unnamed spell';
  const description = spell.description ?? spell.notes ?? '';
  const expanded = spell.expanded ?? false;
  const [expandedReadOnly, setExpandedReadOnly] = useState<boolean | null>(null);
  const showDetails = onChange ? expanded : expandedReadOnly ?? expanded;
  const values = {
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: componentsLabel(spell.components),
    duration: spell.duration,
    attackSave: spell.attackSave,
    damageEffect: spell.damageEffect,
    source: spell.source,
  };
  const fields = (Object.keys(values) as (keyof typeof values)[]).filter((key) => columns.includes(key) && values[key]);

  return (
    <article aria-label={name} className="min-w-0 rounded-lg border border-gold/25 bg-white/50 px-2.5 py-2">
      <div className="flex min-w-0 items-start gap-2">
        {level > 0 && (
          <button
            type="button"
            aria-label={`Prepare ${name}`}
            aria-pressed={spell.prepared}
            title={spell.prepared ? 'Prepared' : 'Unprepared'}
            disabled={!onChange}
            onPointerDown={stopCanvasDrag}
            onClick={() => onChange?.({prepared: !spell.prepared})}
            className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded border', spell.prepared ? 'border-accent bg-accent text-white' : 'border-gold/65 bg-white/65', onChange && 'cursor-pointer hover:ring-2 hover:ring-accent/25')}
          >
            {spell.prepared && <Check size={12} strokeWidth={3} />}
          </button>
        )}
        {editing ? (
          <textarea aria-label="Spell name" rows={1} value={spell.name} onPointerDown={stopCanvasDrag} onChange={(e) => onChange?.({name: e.target.value})} className="field-sizing-content min-w-0 flex-1 resize-none rounded bg-white/70 px-1.5 font-semibold outline-accent" />
        ) : (
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words font-semibold leading-snug text-ink">{name}</span>
        )}
        {columns.includes('concentration') && spell.concentration && <span className="spell-tag" title="Concentration">C</span>}
        {columns.includes('ritual') && spell.ritual && <span className="spell-tag" title="Ritual">R</span>}
        {(description || editing || showDetails) && (
          <button
            type="button"
            aria-label={`Details for ${name}`}
            aria-expanded={showDetails}
            className="spell-control shrink-0"
            onPointerDown={stopCanvasDrag}
            onClick={() => onChange ? onChange({expanded: !showDetails}) : setExpandedReadOnly(!showDetails)}
          >
            <ChevronDown size="1em" className={cn(showDetails && 'rotate-180')} />
          </button>
        )}
        {onRemove && (
          <button type="button" aria-label={`Remove ${name}`} title="Remove spell" className="spell-control shrink-0" onPointerDown={stopCanvasDrag} onClick={onRemove}>
            <X size="1em" />
          </button>
        )}
      </div>
      {fields.length > 0 && (
        <dl className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 font-sans text-[0.75em] text-ink-soft">
          {fields.map((key) => (
            <div key={key} className="min-w-0 break-words">
              <dt className="mr-1 inline font-semibold text-accent">{SPELL_COLUMN_LABELS[key]}</dt>
              <dd className="inline">{values[key]}</dd>
            </div>
          ))}
        </dl>
      )}
      {showDetails && (description || editing) && (
        <div className="mt-2 border-t border-gold/30 pt-2">
          {editing ? (
            <textarea aria-label="Spell description" rows={3} value={description} onPointerDown={stopCanvasDrag} onChange={(e) => onChange?.({description: e.target.value})} className="w-full resize-y rounded border border-gold/35 bg-white/55 p-1.5 text-[0.9em] outline-accent" />
          ) : (
            <p className="whitespace-pre-wrap break-words text-[0.9em] leading-relaxed text-ink-soft">{description}</p>
          )}
        </div>
      )}
    </article>
  );
}

export function SpellListBlock({block, editing, update, printable}: BlockViewProps<'spellList'> & {printable?: boolean}) {
  const {content, style} = block;
  const groups = content.groups ?? [];
  const canChange = !printable && !block.locked;
  const canEdit = editing && canChange;
  const [level, setLevel] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [preparedOnly, setPreparedOnly] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const term = query.trim().toLowerCase();
  const visibleGroups = groups
    .filter((group) => level === null || group.level === level)
    .map((group) => ({
      group,
      spells: group.spells.filter((spell) => (!preparedOnly || group.level === 0 || spell.prepared) && (!term || spell.name.toLowerCase().includes(term))),
    }))
    .filter(({spells}) => spells.length > 0 || (!term && !preparedOnly));
  const availableLevels = SPELL_LEVELS.filter((value) => !groups.some((group) => group.level === value));
  const canRestore = groups.some((group) => group.level > 0 && group.slotsExpended > 0);

  const updateGroup = (id: string, change: (group: SpellLevelGroup) => SpellLevelGroup) =>
    update({groups: groups.map((group) => group.id === id ? change(group) : group)});
  const pickLevel = (value: number | null) => {
    setLevel(value);
    scrollArea.current?.scrollTo({top: 0});
  };
  const addSpell = (spellLevel: number, spell: SpellEntry) => {
    update({groups: addSpellToLevel(groups, spellLevel, spell)});
    pickLevel(spellLevel);
    setQuery('');
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-ink" style={{fontSize: style?.fontSize ?? 14}}>
      <div className="shrink-0 space-y-2 border-b border-gold/40 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canEdit ? (
            <input aria-label="Spell list title" value={content.title ?? ''} onChange={(e) => update({title: e.target.value})} onPointerDown={stopCanvasDrag} placeholder="Spell list title" className="min-w-20 flex-1 rounded bg-white/45 px-1 font-display text-[1em] font-bold text-accent outline-accent" />
          ) : content.title && (
            <div className="min-w-0 break-words font-display text-[1em] font-bold leading-tight text-accent">{content.title}</div>
          )}
          {canChange && (
            <button type="button" onPointerDown={stopCanvasDrag} onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 font-sans text-[0.8em] font-semibold text-white hover:bg-accent-soft">
              <Plus size="1em" /> Add spell
            </button>
          )}
        </div>
        {content.showHeader && <SpellSummary content={content} editing={canEdit} update={update} />}
        {!printable && (
          <div className="flex flex-wrap items-center gap-1 font-sans text-[0.8em]" onPointerDown={stopCanvasDrag}>
            <select aria-label="Filter spells by level" value={level ?? ''} onChange={(e) => pickLevel(e.target.value === '' ? null : Number(e.target.value))} className="max-w-full rounded-md border border-gold/40 bg-white/55 px-2 py-1 text-ink">
              <option value="">All levels</option>
              {SPELL_LEVELS.map((value) => <option key={value} value={value}>{spellLevelLabel(value)}</option>)}
            </select>
            <button type="button" aria-label={searching ? 'Close spell search' : 'Search your spells'} aria-expanded={searching} title="Search your spells" className="spell-control" onClick={() => {setSearching(!searching); setQuery('');}}>
              {searching ? <X size="1em" /> : <Search size="1em" />}
            </button>
            <button type="button" aria-pressed={preparedOnly} className={cn('rounded-md border border-gold/40 px-2 py-1 font-semibold', preparedOnly ? 'bg-accent text-white' : 'bg-white/45 text-ink-soft hover:bg-white/80')} onClick={() => {setPreparedOnly(!preparedOnly); scrollArea.current?.scrollTo({top: 0});}}>
              Prepared
            </button>
            {canChange && canRestore && (
              <button type="button" title="Restore all spell slots" className="spell-control ml-auto" onClick={() => update({groups: groups.map((group) => group.level > 0 && group.slotsExpended > 0 ? {...group, slotsExpended: 0} : group)})}>
                <RotateCcw size="1em" /><span className="sr-only">Restore all spell slots</span>
              </button>
            )}
            {canEdit && availableLevels.length > 0 && (
              <select aria-label="Add spell level" value="" onChange={(e) => {
                const addedLevel = Number(e.target.value);
                update({groups: [...groups, makeSpellGroup(addedLevel, 0)].sort((a, b) => a.level - b.level)});
                pickLevel(addedLevel);
                setPreparedOnly(false);
                setQuery('');
              }} className="rounded-md border border-gold/40 bg-white/55 px-2 py-1 text-ink">
                <option value="" disabled>Add level…</option>
                {availableLevels.map((value) => <option key={value} value={value}>{spellLevelLabel(value)}</option>)}
              </select>
            )}
            {searching && <input type="search" autoFocus aria-label="Search your spells" value={query} placeholder="Find a spell by name" className="min-w-0 basis-full rounded-md border border-gold/40 bg-white/70 px-2 py-1 outline-accent" onChange={(e) => {setQuery(e.target.value); scrollArea.current?.scrollTo({top: 0});}} />}
          </div>
        )}
      </div>

      <div ref={scrollArea} data-canvas-wheel="internal-scroll" className="spell-scrollbar min-h-0 flex-1 space-y-3 overflow-auto overscroll-contain py-2 pr-1" onWheel={(e) => {if (!e.ctrlKey && !e.metaKey) e.stopPropagation();}}>
        {visibleGroups.length === 0 && <p className="py-3 text-center font-sans text-[0.85em] text-ink-soft">{term || preparedOnly ? 'No spells match these filters.' : level === null ? 'No spells yet.' : `No spells in ${spellLevelLabel(level)}.`}</p>}
        {visibleGroups.map(({group, spells}) => (
          <section key={group.id} aria-label={spellLevelLabel(group.level)} className="space-y-1.5">
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-1 rounded-md border border-gold/30 bg-parchment px-2 py-1">
              <h3 className="font-display text-[0.82em] font-bold text-accent">{spellLevelLabel(group.level)}</h3>
              {group.level > 0 && <SlotTracker group={group} editing={canEdit} onChange={canChange ? (patch) => updateGroup(group.id, (current) => ({...current, ...patch})) : undefined} />}
            </div>
            {spells.length === 0 && <p className="px-2 py-1 font-sans text-[0.8em] text-ink-soft">No spells in this level.</p>}
            {spells.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                level={group.level}
                columns={spell.columns ?? content.columns ?? []}
                editing={canEdit}
                onChange={canChange ? (patch) => updateGroup(group.id, (current) => ({...current, spells: current.spells.map((entry) => entry.id === spell.id ? {...entry, ...patch} : entry)})) : undefined}
                onRemove={canEdit ? () => updateGroup(group.id, (current) => ({...current, spells: current.spells.filter((entry) => entry.id !== spell.id)})) : undefined}
              />
            ))}
          </section>
        ))}
      </div>
      {pickerOpen && canChange && <SpellPicker groups={groups} initialLevel={level} onAdd={addSpell} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
