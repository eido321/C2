import {useRef, useState} from 'react';
import {ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, GripVertical, LibraryBig, Plus, SlidersHorizontal, Trash2, X} from 'lucide-react';
import type {SpellColumn, SpellEntry, SpellLevelGroup, SpellListContent} from '@/types';
import {makeSpellGroup} from '@/lib/blockDefaults';
import {addSpellToLevel, createSpell, slotCount} from '@/lib/spellList';
import {cn} from '@/lib/utils';
import {SpellPicker} from '@/components/blocks/SpellPicker';
import {SPELL_COLUMN_LABELS, SPELL_LEVELS, spellLevelLabel} from '@/components/blocks/shared';

const SPELL_COLUMN_ORDER: SpellColumn[] = [
  'school',
  'castingTime',
  'range',
  'components',
  'duration',
  'concentration',
  'ritual',
  'attackSave',
  'damageEffect',
  'source',
];

const SPELL_COLUMN_PRESETS: {label: string; columns: SpellColumn[]}[] = [
  {label: 'Compact', columns: ['components', 'concentration', 'ritual']},
  {label: 'Play', columns: ['castingTime', 'range', 'components', 'duration', 'attackSave', 'damageEffect', 'concentration']},
  {label: 'Full', columns: SPELL_COLUMN_ORDER},
];

const SHORT_SPELL_COLUMN_LABELS: Partial<Record<SpellColumn, string>> = {
  school: 'School',
  castingTime: 'Time',
  range: 'Range',
  components: 'VSM',
  duration: 'Duration',
  concentration: 'Conc.',
  ritual: 'Ritual',
  attackSave: 'Atk/Save',
  damageEffect: 'Effect',
  source: 'Source',
};

function SmallField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-accent/60"
      />
    </label>
  );
}

function SmallTextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-accent/60"
      />
    </label>
  );
}

interface LevelOption {
  value: string;
  level: number;
}

function SpellDisplayFields({columns, onChange}: {columns: SpellColumn[]; onChange: (columns: SpellColumn[]) => void}) {
  return (
    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
      {SPELL_COLUMN_ORDER.map((col) => {
        const visible = columns.includes(col);
        return (
          <button
            key={col}
            type="button"
            aria-pressed={visible}
            onClick={() => onChange(SPELL_COLUMN_ORDER.filter((item) => item === col ? !visible : columns.includes(item)))}
            className={cn(
              'rounded-md border px-2 py-1 text-left transition-colors',
              visible ? 'border-accent/50 bg-accent/10 text-accent' : 'border-slate-200 text-slate-500 hover:bg-slate-50',
            )}
            title={SPELL_COLUMN_LABELS[col]}
          >
            {SHORT_SPELL_COLUMN_LABELS[col] ?? SPELL_COLUMN_LABELS[col]}
          </button>
        );
      })}
    </div>
  );
}

function SpellRowEditor({
  spell,
  showPrepared,
  canMoveUp,
  canMoveDown,
  isDragTarget,
  levelOptions,
  currentGroupId,
  defaultColumns,
  active,
  onToggleEditor,
  onPatch,
  onRemove,
  onMove,
  onMoveToLevel,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  spell: SpellEntry;
  showPrepared: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDragTarget: boolean;
  levelOptions: LevelOption[];
  currentGroupId: string;
  defaultColumns: SpellColumn[];
  active: boolean;
  onToggleEditor: () => void;
  onPatch: (patch: Partial<SpellEntry>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onMoveToLevel: (destination: string) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const components = spell.components ?? {v: false, s: false, m: false};
  return (
    <div
      role="group"
      aria-label={spell.name || 'Unnamed spell'}
      onDragOver={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        'space-y-2 rounded-lg border border-slate-200 bg-white p-2 transition-shadow',
        active && 'border-accent/35',
        isDragTarget && 'ring-2 ring-inset ring-accent/60',
      )}
    >
      <div className="flex items-center gap-1">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
          className="shrink-0 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </span>
        {showPrepared ? (
          <button
            type="button"
            onClick={() => onPatch({prepared: !spell.prepared})}
            className={cn(
              'rounded-md border px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
              spell.prepared
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600',
            )}
            title={spell.prepared ? 'Prepared' : 'Unprepared'}
            aria-label={`Prepare ${spell.name || 'unnamed spell'}`}
            aria-pressed={spell.prepared}
          >
            {spell.prepared ? 'Prep' : 'Prep?'}
          </button>
        ) : null}
        <textarea
          value={spell.name}
          onChange={(e) => onPatch({name: e.target.value})}
          placeholder="Spell name"
          aria-label="Spell name"
          rows={1}
          className="field-sizing-content min-w-0 flex-1 resize-none rounded-md border border-transparent px-1.5 py-1 text-sm font-semibold leading-snug text-slate-800 outline-none focus:border-accent/60"
        />
        <button type="button" title="Edit spell" aria-label={`Edit ${spell.name || 'unnamed spell'}`} aria-expanded={active} onClick={onToggleEditor} className="icon-btn size-7 shrink-0">
          <SlidersHorizontal size={14} />
        </button>
      </div>
      {active && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="icon-btn h-7 w-7 disabled:opacity-30"
              title="Move up"
              disabled={!canMoveUp}
              onClick={() => onMove(-1)}
            >
              <ChevronUpIcon size={14} />
            </button>
            <button
              type="button"
              className="icon-btn h-7 w-7 disabled:opacity-30"
              title="Move down"
              disabled={!canMoveDown}
              onClick={() => onMove(1)}
            >
              <ChevronDownIcon size={14} />
            </button>
            <button
              type="button"
              className="icon-btn h-7 w-7 hover:bg-red-50 hover:text-red-600"
              title="Remove spell"
              onClick={onRemove}
            >
              <X size={14} />
            </button>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Spell level</span>
            <select
              value={`group:${currentGroupId}`}
              onChange={(e) => onMoveToLevel(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-accent/60"
              title="Move spell to another level"
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{spellLevelLabel(opt.level)}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>Use list display settings</span>
            <input
              type="checkbox"
              checked={spell.columns === undefined}
              onChange={(e) => onPatch({columns: e.target.checked ? undefined : defaultColumns})}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
          </label>
          {spell.columns && <SpellDisplayFields columns={spell.columns} onChange={(columns) => onPatch({columns})} />}
          <label className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
            <span>Expanded in block</span>
            <input
              type="checkbox"
              checked={spell.expanded ?? false}
              onChange={(e) => onPatch({expanded: e.target.checked})}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
          </label>
          <details>
            <summary className="cursor-pointer text-xs font-medium text-accent">Spell details</summary>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <SmallField label="School" value={spell.school ?? ''} onChange={(v) => onPatch({school: v})} placeholder="Evocation" />
                <SmallField label="Source" value={spell.source ?? ''} onChange={(v) => onPatch({source: v})} placeholder="PHB p. 242" />
              </div>
              <div className="flex gap-2">
                <SmallField label="Casting" value={spell.castingTime ?? ''} onChange={(v) => onPatch({castingTime: v})} placeholder="1 action" />
                <SmallField label="Range" value={spell.range ?? ''} onChange={(v) => onPatch({range: v})} placeholder="60 ft" />
              </div>
              <div className="flex gap-2">
                <SmallField label="Duration" value={spell.duration ?? ''} onChange={(v) => onPatch({duration: v})} placeholder="Instant" />
                <SmallField label="Attack / Save" value={spell.attackSave ?? ''} onChange={(v) => onPatch({attackSave: v})} placeholder="DEX save" />
              </div>
              <SmallField
                label="Damage / Effect"
                value={spell.damageEffect ?? ''}
                onChange={(v) => onPatch({damageEffect: v})}
                placeholder="3d6 fire; half on save"
              />
              <SmallTextAreaField
                label="Description"
                value={spell.description ?? spell.notes ?? ''}
                onChange={(v) => onPatch({description: v})}
                placeholder="Rules text summary, targets, area, scaling..."
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                {(['v', 's', 'm'] as const).map((k) => (
                  <label key={k} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={components[k]}
                      onChange={(e) => onPatch({components: {...components, [k]: e.target.checked}})}
                      className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                    />
                    {k.toUpperCase()}
                  </label>
                ))}
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={spell.concentration ?? false}
                    onChange={(e) => onPatch({concentration: e.target.checked})}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                  Conc.
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={spell.ritual ?? false}
                    onChange={(e) => onPatch({ritual: e.target.checked})}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                  Ritual
                </label>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export function SpellListEditor({
  content,
  set,
}: {
  content: SpellListContent;
  set: (patch: Partial<SpellListContent>) => void;
}) {
  const groups = content.groups;
  const columns = content.columns ?? [];
  const availableLevels = SPELL_LEVELS.filter((level) => !groups.some((group) => group.level === level));
  const levelOptions: LevelOption[] = [
    ...groups.map(({id, level}) => ({value: `group:${id}`, level})),
    ...availableLevels.map((level) => ({value: `level:${level}`, level})),
  ].sort((a, b) => a.level - b.level);

  const dragged = useRef<{groupId: string; spellId: string} | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [closedGroupIds, setClosedGroupIds] = useState<Set<string>>(() => new Set());
  const [requestedLevel, setRequestedLevel] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [activeSpellId, setActiveSpellId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const levelToAdd = requestedLevel !== null && availableLevels.includes(requestedLevel) ? requestedLevel : availableLevels[0];
  const visibleGroups = groups.filter((group) => levelFilter === null || group.level === levelFilter);

  const setGroups = (next: SpellLevelGroup[]) => set({groups: next});
  const patchGroup = (id: string, patch: Partial<SpellLevelGroup>) =>
    setGroups(groups.map((g) => (g.id === id ? {...g, ...patch} : g)));
  const patchSpell = (groupId: string, spellId: string, patch: Partial<SpellEntry>) =>
    setGroups(
      groups.map((g) =>
        g.id === groupId ? {...g, spells: g.spells.map((s) => (s.id === spellId ? {...s, ...patch} : s))} : g,
      ),
    );
  const moveSpell = (groupId: string, spellId: string, direction: -1 | 1) =>
    setGroups(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const i = g.spells.findIndex((s) => s.id === spellId);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= g.spells.length) return g;
        const spells = [...g.spells];
        [spells[i], spells[j]] = [spells[j], spells[i]];
        return {...g, spells};
      }),
    );
  const reorderSpell = (groupId: string, draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setGroups(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const source = g.spells.find((s) => s.id === draggedId);
        if (!source) return g;
        const rest = g.spells.filter((s) => s.id !== draggedId);
        const ti = rest.findIndex((s) => s.id === targetId);
        if (ti < 0) return g;
        rest.splice(ti, 0, source);
        return {...g, spells: rest};
      }),
    );
  };
  const moveSpellToLevel = (fromGroupId: string, spellId: string, destination: string) => {
    const option = levelOptions.find((item) => item.value === destination);
    if (!option || destination === `group:${fromGroupId}`) return;
    const source = groups.find((g) => g.id === fromGroupId)?.spells.find((s) => s.id === spellId);
    if (!source) return;
    const existing = groups.find((g) => `group:${g.id}` === destination);
    const target = existing ?? makeSpellGroup(option.level, 0);
    const next = (existing ? groups : [...groups, target]).map((g) => {
      if (g.id === fromGroupId) return {...g, spells: g.spells.filter((s) => s.id !== spellId)};
      if (g.id === target.id) return {...g, spells: [...g.spells, source]};
      return g;
    });
    setGroups(existing ? next : next.sort((a, b) => a.level - b.level));
    if (levelFilter !== null) setLevelFilter(target.level);
    setClosedGroupIds((current) => {
      const next = new Set(current);
      next.delete(target.id);
      return next;
    });
  };
  const addSpell = (groupId: string) =>
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {...g, spells: [...g.spells, createSpell('New spell')]}
          : g,
      ),
    );
  const addFromPicker = (level: number, spell: SpellEntry) => {
    const next = addSpellToLevel(groups, level, spell);
    setGroups(next);
    setLevelFilter(level);
    const group = next.find((item) => item.level === level);
    if (group && closedGroupIds.has(group.id)) toggleGroupOpen(group.id);
  };
  const removeSpell = (groupId: string, spellId: string) =>
    setGroups(groups.map((g) => (g.id === groupId ? {...g, spells: g.spells.filter((s) => s.id !== spellId)} : g)));
  const removeGroup = (id: string) => setGroups(groups.filter((g) => g.id !== id));
  const addGroup = () => {
    if (levelToAdd === undefined) return;
    const next = makeSpellGroup(levelToAdd, 0);
    setGroups([...groups, next].sort((a, b) => a.level - b.level));
    if (levelFilter !== null) setLevelFilter(next.level);
    setRequestedLevel(null);
  };
  const toggleGroupOpen = (id: string) =>
    setClosedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <button type="button" onClick={() => setPickerOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-soft">
        <LibraryBig size={16} /> Browse spells
      </button>

      <details className="rounded-lg border border-slate-200 px-2.5 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Spell List settings</summary>
        <div className="mt-3 space-y-3">
          <label>
            <span className="field-label">Title</span>
            <input value={content.title ?? ''} onChange={(e) => set({title: e.target.value})} className="field-input" />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Show summary header</span>
            <input
              type="checkbox"
              checked={content.showHeader}
              onChange={(e) => set({showHeader: e.target.checked})}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
          </label>

          {content.showHeader ? (
            <div className="grid grid-cols-3 gap-2">
              <label>
                <span className="field-label">Ability</span>
                <input value={content.ability ?? ''} onChange={(e) => set({ability: e.target.value})} className="field-input" />
              </label>
              <label>
                <span className="field-label">Save DC</span>
                <input value={content.saveDc ?? ''} onChange={(e) => set({saveDc: e.target.value})} className="field-input" />
              </label>
              <label>
                <span className="field-label">Atk</span>
                <input
                  value={content.attackBonus ?? ''}
                  onChange={(e) => set({attackBonus: e.target.value})}
                  className="field-input"
                />
              </label>
            </div>
          ) : null}

          <details className="rounded-lg border border-slate-200 px-2.5 py-2">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">List display settings</summary>
            <div className="my-2 grid grid-cols-3 gap-1">
              {SPELL_COLUMN_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => set({columns: preset.columns})}
                  aria-pressed={preset.columns.length === columns.length && preset.columns.every((col) => columns.includes(col))}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
                    preset.columns.length === columns.length && preset.columns.every((col) => columns.includes(col))
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <SpellDisplayFields columns={columns} onChange={(columns) => set({columns})} />
          </details>
        </div>
      </details>

      <div>
        <label className="mb-2 block">
          <span className="field-label">Manage spells</span>
          <select aria-label="Manage spell levels" className="field-input" value={levelFilter ?? ''} onChange={(e) => setLevelFilter(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">All levels</option>
            {SPELL_LEVELS.map((level) => <option key={level} value={level}>{spellLevelLabel(level)}</option>)}
          </select>
        </label>
        {levelToAdd !== undefined && (
          <div className="mb-2 flex gap-1.5">
            <select
              aria-label="New spell level"
              value={levelToAdd}
              onChange={(e) => setRequestedLevel(Number(e.target.value))}
              className="field-input min-w-0 flex-1"
            >
              {availableLevels.map((level) => <option key={level} value={level}>{spellLevelLabel(level)}</option>)}
            </select>
            <button type="button" className="panel-btn shrink-0 px-2 py-1 text-xs" onClick={addGroup}>
              <Plus size={13} /> Add level
            </button>
          </div>
        )}
        <div className="space-y-2">
          {visibleGroups.length === 0 && <p className="py-2 text-center text-xs text-slate-500">No spells at this level yet.</p>}
          {visibleGroups.map((group) => {
            const open = !closedGroupIds.has(group.id);
            const preparedCount = group.spells.filter((spell) => spell.prepared).length;
            return (
              <div key={group.id} role="group" aria-label={spellLevelLabel(group.level)} className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 p-2">
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 shrink-0"
                    title={open ? 'Collapse level' : 'Expand level'}
                    aria-expanded={open}
                    onClick={() => toggleGroupOpen(group.id)}
                  >
                    {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroupOpen(group.id)}
                    aria-expanded={open}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block font-display text-xs font-bold uppercase tracking-wide text-accent">
                      {spellLevelLabel(group.level)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {group.spells.length} spells{group.level > 0 ? ` · ${preparedCount} prepared` : ''}
                    </span>
                  </button>
                  {group.level > 0 ? (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                      <input
                        type="number"
                        min={0}
                        value={group.slotsExpended}
                        onChange={(e) =>
                          patchGroup(group.id, {slotsExpended: Math.min(slotCount(group.slotsTotal), slotCount(e.target.value))})
                        }
                        className="w-10 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-center outline-none focus:border-accent/60"
                        title="Slots expended"
                      />
                      /
                      <input
                        type="number"
                        min={0}
                        value={group.slotsTotal}
                        onChange={(e) => {
                          const slotsTotal = slotCount(e.target.value);
                          patchGroup(group.id, {slotsTotal, slotsExpended: Math.min(slotCount(group.slotsExpended), slotsTotal)});
                        }}
                        className="w-10 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-center outline-none focus:border-accent/60"
                        title="Total slots"
                      />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-600"
                    title="Remove level"
                    onClick={() => removeGroup(group.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {open ? (
                  <div className="space-y-2 p-2">
                    {group.spells.length > 0 ? (
                      group.spells.map((spell, index) => (
                        <SpellRowEditor
                          key={spell.id}
                          spell={spell}
                          showPrepared={group.level > 0}
                          canMoveUp={index > 0}
                          canMoveDown={index < group.spells.length - 1}
                          isDragTarget={dropTargetId === spell.id}
                          levelOptions={levelOptions}
                          currentGroupId={group.id}
                          defaultColumns={columns}
                          active={activeSpellId === spell.id}
                          onToggleEditor={() => setActiveSpellId((current) => current === spell.id ? null : spell.id)}
                          onPatch={(patch) => patchSpell(group.id, spell.id, patch)}
                          onRemove={() => removeSpell(group.id, spell.id)}
                          onMove={(direction) => moveSpell(group.id, spell.id, direction)}
                          onMoveToLevel={(toGroupId) => moveSpellToLevel(group.id, spell.id, toGroupId)}
                          onDragStart={() => {
                            dragged.current = {groupId: group.id, spellId: spell.id};
                          }}
                          onDragEnter={() => {
                            if (dragged.current?.groupId === group.id) setDropTargetId(spell.id);
                          }}
                          onDrop={() => {
                            const item = dragged.current;
                            if (item && item.groupId === group.id) reorderSpell(group.id, item.spellId, spell.id);
                            dragged.current = null;
                            setDropTargetId(null);
                          }}
                          onDragEnd={() => {
                            dragged.current = null;
                            setDropTargetId(null);
                          }}
                        />
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-400">
                        No spells in this level yet.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => addSpell(group.id)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/5"
                    >
                      <Plus size={13} /> Add spell
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {pickerOpen && <SpellPicker groups={groups} initialLevel={levelFilter} onAdd={addFromPicker} onClose={() => setPickerOpen(false)} />}
    </>
  );
}
