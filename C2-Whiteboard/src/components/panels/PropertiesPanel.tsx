import {useRef, useState} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Copy,
  CheckSquare,
  GripVertical,
  Group as GroupIcon,
  List as ListIcon,
  ListOrdered,
  MousePointerClick,
  PanelRightClose,
  Plus,
  SendToBack,
  BringToFront,
  Trash2,
  X,
} from 'lucide-react';
import type {Block, ListContent, ListItem, SpellColumn, SpellEntry, SpellLevelGroup, SpellListContent, TextAlign} from '@/types';
import {BLOCK_LABELS} from '@/lib/blockDefaults';
import {SPELL_COLUMN_LABELS, spellLevelLabel} from '@/components/blocks/shared';
import {
  listItemChecked,
  listItemText,
  makeListItem,
  withListItemChecked,
  withListItemText,
} from '@/lib/listContent';
import {cn, uid} from '@/lib/utils';
import {useWhiteboard} from '@/store/WhiteboardContext';
import type {WhiteboardAction} from '@/store/reducer';

function CollapseButton({onCollapse}: {onCollapse?: () => void}) {
  if (!onCollapse) return null;
  return (
    <button className="icon-btn" title="Collapse panel" onClick={onCollapse}>
      <PanelRightClose size={16} />
    </button>
  );
}

function NumberField({label, value, onChange}: {label: string; value: number; onChange: (v: number) => void}) {
  return (
    <label className="flex-1">
      <span className="field-label">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="field-input"
      />
    </label>
  );
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="border-b border-slate-100 px-4 py-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const ALIGNS: {value: TextAlign; icon: typeof AlignLeft}[] = [
  {value: 'left', icon: AlignLeft},
  {value: 'center', icon: AlignCenter},
  {value: 'right', icon: AlignRight},
];

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
  groupId: string;
  level: number;
}

function SpellRowEditor({
  spell,
  showPrepared,
  canMoveUp,
  canMoveDown,
  isDragTarget,
  levelOptions,
  currentGroupId,
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
  onPatch: (patch: Partial<SpellEntry>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onMoveToLevel: (groupId: string) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const components = spell.components ?? {v: false, s: false, m: false};
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        'space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 transition-shadow',
        isDragTarget && 'ring-2 ring-inset ring-accent/60',
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
          className="mt-2 shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </span>
        {showPrepared ? (
          <button
            type="button"
            onClick={() => onPatch({prepared: !spell.prepared})}
            className={cn(
              'mt-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
              spell.prepared
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600',
            )}
            title={spell.prepared ? 'Prepared' : 'Not prepared'}
          >
            {spell.prepared ? 'Prep' : 'Prep?'}
          </button>
        ) : null}
        <textarea
          value={spell.name}
          onChange={(e) => onPatch({name: e.target.value})}
          placeholder="Spell name"
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium leading-snug text-slate-800 outline-none focus:border-accent/60"
        />
        <div className="flex shrink-0 flex-col gap-1">
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
      </div>
      <label className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
        <span>Expanded in block</span>
        <input
          type="checkbox"
          checked={spell.expanded ?? false}
          onChange={(e) => onPatch({expanded: e.target.checked})}
          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
      </label>
      {levelOptions.length > 1 ? (
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Level</span>
          <select
            value={currentGroupId}
            onChange={(e) => onMoveToLevel(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-accent/60"
            title="Move spell to another level"
          >
            {levelOptions.map((opt) => (
              <option key={opt.groupId} value={opt.groupId}>
                {spellLevelLabel(opt.level)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
        value={spell.description ?? ''}
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
  );
}

function SpellListEditor({
  content,
  set,
}: {
  content: SpellListContent;
  set: (patch: Partial<SpellListContent>) => void;
}) {
  const groups = content.groups;
  const columns = content.columns ?? [];
  const levelOptions: LevelOption[] = groups.map((g) => ({groupId: g.id, level: g.level}));

  const dragged = useRef<{groupId: string; spellId: string} | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(() => new Set(groups.map((g) => g.id)));

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
  const moveSpellToLevel = (fromGroupId: string, spellId: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;
    const source = groups.find((g) => g.id === fromGroupId)?.spells.find((s) => s.id === spellId);
    if (!source) return;
    setGroups(
      groups.map((g) => {
        if (g.id === fromGroupId) return {...g, spells: g.spells.filter((s) => s.id !== spellId)};
        if (g.id === toGroupId) return {...g, spells: [...g.spells, source]};
        return g;
      }),
    );
  };
  const addSpell = (groupId: string) =>
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {...g, spells: [...g.spells, {id: uid('sp'), prepared: true, name: 'New spell', components: {v: true, s: true, m: false}}]}
          : g,
      ),
    );
  const removeSpell = (groupId: string, spellId: string) =>
    setGroups(groups.map((g) => (g.id === groupId ? {...g, spells: g.spells.filter((s) => s.id !== spellId)} : g)));
  const removeGroup = (id: string) => setGroups(groups.filter((g) => g.id !== id));
  const addGroup = () => {
    const used = new Set(groups.map((g) => g.level));
    let level = 0;
    while (used.has(level) && level <= 9) level += 1;
    if (level > 9) return;
    const next: SpellLevelGroup = {id: uid('sg'), level, slotsTotal: level === 0 ? 0 : 2, slotsExpended: 0, spells: []};
    setGroups([...groups, next].sort((a, b) => a.level - b.level));
    setOpenGroupIds((current) => new Set(current).add(next.id));
  };
  const setColumns = (nextColumns: SpellColumn[]) =>
    set({columns: SPELL_COLUMN_ORDER.filter((col) => nextColumns.includes(col))});
  const toggleColumn = (col: SpellColumn, on: boolean) =>
    setColumns(on ? [...columns, col] : columns.filter((c) => c !== col));
  const toggleGroupOpen = (id: string) =>
    setOpenGroupIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
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

      <div>
        <span className="field-label">Visible columns</span>
        <div className="mb-2 grid grid-cols-3 gap-1">
          {SPELL_COLUMN_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setColumns(preset.columns)}
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
        <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
          {SPELL_COLUMN_ORDER.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => toggleColumn(col, !columns.includes(col))}
              className={cn(
                'rounded-md border px-2 py-1 text-left transition-colors',
                columns.includes(col)
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
              title={SPELL_COLUMN_LABELS[col]}
            >
              {SHORT_SPELL_COLUMN_LABELS[col] ?? SPELL_COLUMN_LABELS[col]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="field-label mb-0">Spell levels</span>
          <button type="button" className="panel-btn px-2 py-1 text-xs" onClick={addGroup}>
            <Plus size={13} /> Add level
          </button>
        </div>
        <div className="space-y-2">
          {groups.map((group) => {
            const open = openGroupIds.has(group.id);
            const preparedCount = group.spells.filter((spell) => spell.prepared).length;
            return (
              <div key={group.id} className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 p-2">
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 shrink-0"
                    title={open ? 'Collapse level' : 'Expand level'}
                    onClick={() => toggleGroupOpen(group.id)}
                  >
                    {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroupOpen(group.id)}
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
                          patchGroup(group.id, {slotsExpended: Math.min(group.slotsTotal, Math.max(0, Number(e.target.value) || 0))})
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
                          const slotsTotal = Math.max(0, Number(e.target.value) || 0);
                          patchGroup(group.id, {slotsTotal, slotsExpended: Math.min(group.slotsExpended, slotsTotal)});
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
        <p className="mt-2 text-xs text-slate-400">
          On the canvas: double-click to edit, Enter adds a spell, Backspace removes an empty spell, and slot pips are clickable.
        </p>
      </div>
    </>
  );
}

type ListMode = 'bullets' | 'numbered' | 'checklist';

function ListEditor({content, set}: {content: ListContent; set: (patch: Partial<ListContent>) => void}) {
  const items = content.items.length ? content.items : [makeListItem('', content.checklist)];
  const dragged = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const setItems = (next: ListItem[]) => set({items: next});
  const patchItemText = (index: number, text: string) =>
    setItems(items.map((item, i) => (i === index ? withListItemText(item, text) : item)));
  const patchItemChecked = (index: number, checked: boolean) =>
    setItems(items.map((item, i) => (i === index ? withListItemChecked(item, checked) : item)));
  const addItem = () => setItems([...items, makeListItem('New item', content.checklist)]);
  const removeItem = (index: number) =>
    setItems(items.length === 1 ? [makeListItem('', content.checklist)] : items.filter((_, i) => i !== index));
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const reorderItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  const mode: ListMode = content.checklist ? 'checklist' : content.ordered ? 'numbered' : 'bullets';
  const setMode = (nextMode: ListMode) => {
    set({
      ordered: nextMode === 'numbered',
      checklist: nextMode === 'checklist',
    });
  };

  const modes: {value: ListMode; label: string; icon: typeof ListIcon}[] = [
    {value: 'bullets', label: 'Bullets', icon: ListIcon},
    {value: 'numbered', label: 'Numbers', icon: ListOrdered},
    {value: 'checklist', label: 'Checks', icon: CheckSquare},
  ];

  return (
    <>
      <label>
        <span className="field-label">Title</span>
        <input
          value={content.title ?? ''}
          onChange={(e) => set({title: e.target.value})}
          placeholder="Inventory, Features, Notes..."
          className="field-input"
        />
      </label>

      <div>
        <span className="field-label">List style</span>
        <div className="grid grid-cols-3 gap-1">
          {modes.map(({value, label, icon: Icon}) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                mode === value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="field-label mb-0">Items</span>
          <button type="button" onClick={addItem} className="panel-btn px-2 py-1 text-xs">
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged.current !== null) reorderItem(dragged.current, index);
                dragged.current = null;
                setDropIndex(null);
              }}
              className={cn(
                'rounded-lg border border-slate-200 bg-slate-50 p-2 transition-shadow',
                dropIndex === index && 'ring-2 ring-inset ring-accent/50',
              )}
            >
              <div className="flex items-start gap-1.5">
                <span
                  draggable
                  onDragStart={() => {
                    dragged.current = index;
                  }}
                  onDragEnd={() => {
                    dragged.current = null;
                    setDropIndex(null);
                  }}
                  title="Drag to reorder"
                  className="mt-2 shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                >
                  <GripVertical size={15} />
                </span>
                {content.checklist ? (
                  <input
                    type="checkbox"
                    checked={listItemChecked(item)}
                    onChange={(e) => patchItemChecked(index, e.target.checked)}
                    className="mt-2 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    title="Checked"
                  />
                ) : (
                  <span className="mt-2 min-w-5 shrink-0 text-right text-xs font-semibold text-slate-400">
                    {content.ordered ? `${index + 1}.` : '•'}
                  </span>
                )}
                <textarea
                  value={listItemText(item)}
                  onChange={(e) => patchItemText(index, e.target.value)}
                  rows={2}
                  placeholder="List item"
                  className="min-w-0 flex-1 resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-accent/60"
                />
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 disabled:opacity-30"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ChevronUpIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 disabled:opacity-30"
                    title="Move down"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ChevronDownIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 hover:bg-red-50 hover:text-red-600"
                    title="Remove item"
                    onClick={() => removeItem(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          On the canvas: Enter adds an item, Shift+Enter adds a line break, Backspace removes an empty item, and Tab indents.
        </p>
      </div>
    </>
  );
}

function ContentEditor({block, dispatch}: {block: Block; dispatch: React.Dispatch<WhiteboardAction>}) {
  const setContent = (content: Record<string, unknown>) => dispatch({type: 'UPDATE_CONTENT', id: block.id, content});

  switch (block.type) {
    case 'text':
      return (
        <label>
          <span className="field-label">Text</span>
          <textarea
            aria-label="Text" value={block.content.text}
            onChange={(e) => setContent({text: e.target.value})}
            rows={5}
            className="field-input resize-none"
          />
        </label>
      );
    case 'heading':
      return (
        <>
          <label>
            <span className="field-label">Title</span>
            <input value={block.content.text} onChange={(e) => setContent({text: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Subtitle</span>
            <input
              value={block.content.subtitle ?? ''}
              onChange={(e) => setContent({subtitle: e.target.value})}
              className="field-input"
            />
          </label>
        </>
      );
    case 'abilityScores':
      return (
        <div className="grid grid-cols-3 gap-2">
          {block.content.abilities.map((a, i) => (
            <label key={a.key}>
              <span className="field-label">{a.label}</span>
              <input
                type="number"
                value={a.score}
                onChange={(e) =>
                  setContent({
                    abilities: block.content.abilities.map((x, j) =>
                      j === i ? {...x, score: Number(e.target.value) || 0} : x,
                    ),
                  })
                }
                className="field-input"
              />
            </label>
          ))}
        </div>
      );
    case 'statBlock':
      return (
        <>
          <label>
            <span className="field-label">Label</span>
            <input value={block.content.label} onChange={(e) => setContent({label: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Value</span>
            <input value={block.content.value} onChange={(e) => setContent({value: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Hint</span>
            <input
              value={block.content.hint ?? ''}
              onChange={(e) => setContent({hint: e.target.value})}
              className="field-input"
            />
          </label>
        </>
      );
    case 'image':
      return (
        <>
          <label>
            <span className="field-label">Image URL</span>
            <input value={block.content.src} onChange={(e) => setContent({src: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Alt text</span>
            <input
              value={block.content.alt ?? ''}
              onChange={(e) => setContent({alt: e.target.value})}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Fit</span>
            <select
              value={block.content.fit}
              onChange={(e) => setContent({fit: e.target.value})}
              className="field-input"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
        </>
      );
    case 'divider':
      return (
        <label className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Ornament</span>
          <input
            type="checkbox"
            checked={block.content.ornament}
            onChange={(e) => setContent({ornament: e.target.checked})}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>
      );
    case 'list':
      return (
        <ListEditor
          content={block.content}
          set={(patch) => setContent(patch as Record<string, unknown>)}
        />
      );
    case 'spellList':
      return (
        <SpellListEditor
          content={block.content}
          set={(patch) => setContent(patch as Record<string, unknown>)}
        />
      );
  }
}

export function PropertiesPanel({
  onCollapse,
  width,
  resizeHandle,
}: {
  onCollapse?: () => void;
  width: number;
  resizeHandle?: React.ReactNode;
}) {
  const {selectedBlock, selectedBlocks, state, dispatch} = useWhiteboard();

  if (selectedBlocks.length > 1) {
    const ids = selectedBlocks.map((b) => b.id);
    const canGroup = ids.length >= 2;
    const groupsInSelection = state.board.groups.filter((g) =>
      g.childIds.every((id) => ids.includes(id)),
    );
    return (
      <aside
        className="relative flex shrink-0 flex-col border-l border-slate-200 bg-white"
        style={{width}}
      >
        {resizeHandle}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selection</p>
            <p className="font-display text-sm font-bold text-slate-800">{selectedBlocks.length} blocks</p>
          </div>
          <CollapseButton onCollapse={onCollapse} />
        </div>
        <div className="space-y-2 p-4">
          <button
            className="panel-btn w-full justify-center border border-slate-200"
            disabled={!canGroup}
            onClick={() => dispatch({type: 'GROUP_BLOCKS', ids})}
          >
            <GroupIcon size={16} /> Group selection
          </button>
          {groupsInSelection.length > 0 ? (
            <button
              className="panel-btn w-full justify-center border border-slate-200"
              onClick={() => groupsInSelection.forEach((g) => dispatch({type: 'UNGROUP', groupId: g.id}))}
            >
              Ungroup
            </button>
          ) : null}
          <button
            className="panel-btn w-full justify-center border border-slate-200 hover:bg-red-50 hover:text-red-600"
            onClick={() => dispatch({type: 'DELETE_BLOCKS', ids})}
          >
            <Trash2 size={16} /> Delete selection
          </button>
          <p className="pt-1 text-center text-xs text-slate-400">
            Manage stacking and grouping in the Layers panel.
          </p>
        </div>
      </aside>
    );
  }

  if (!selectedBlock) {
    return (
      <aside
        className="relative flex shrink-0 flex-col items-center justify-center border-l border-slate-200 bg-white p-6 text-center"
        style={{width}}
      >
        {resizeHandle}
        {onCollapse ? (
          <div className="absolute right-2 top-2">
            <CollapseButton onCollapse={onCollapse} />
          </div>
        ) : null}
        <MousePointerClick className="mb-3 text-slate-300" size={32} />
        <p className="text-sm font-medium text-slate-500">No block selected</p>
        <p className="mt-1 text-xs text-slate-400">Select a block to edit its content, size, and style.</p>
      </aside>
    );
  }

  const block = selectedBlock;
  const style = block.style ?? {};
  const setStyle = (patch: Record<string, unknown>) => dispatch({type: 'UPDATE_STYLE', id: block.id, style: patch});
  const patchBlock = (patch: Partial<Block>) =>
    dispatch({type: 'UPDATE_BLOCK', id: block.id, patch: patch as never});

  const hasFontSize =
    block.type === 'text' || block.type === 'heading' || block.type === 'list' || block.type === 'spellList';
  const hasAlign = block.type === 'text' || block.type === 'heading' || block.type === 'statBlock';
  const isContainer =
    block.type === 'text' ||
    block.type === 'statBlock' ||
    block.type === 'image' ||
    block.type === 'list' ||
    block.type === 'abilityScores' ||
    block.type === 'spellList';

  return (
    <aside
      className="no-scrollbar relative flex shrink-0 flex-col overflow-auto border-l border-slate-200 bg-white"
      style={{width}}
    >
      {resizeHandle}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selected</p>
          <p className="font-display text-sm font-bold text-slate-800">{BLOCK_LABELS[block.type]}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="icon-btn" title="Duplicate (Ctrl+D)" onClick={() => dispatch({type: 'DUPLICATE_BLOCK', id: block.id})}>
            <Copy size={16} />
          </button>
          <button className="icon-btn" title="Bring forward" onClick={() => dispatch({type: 'BRING_FORWARD', id: block.id})}>
            <BringToFront size={16} />
          </button>
          <button className="icon-btn" title="Send backward" onClick={() => dispatch({type: 'SEND_BACKWARD', id: block.id})}>
            <SendToBack size={16} />
          </button>
          <button
            className="icon-btn hover:bg-red-50 hover:text-red-600"
            title="Delete (Del)"
            onClick={() => dispatch({type: 'DELETE_BLOCK', id: block.id})}
          >
            <Trash2 size={16} />
          </button>
          <CollapseButton onCollapse={onCollapse} />
        </div>
      </div>

      <Section title="Content">
        <ContentEditor block={block} dispatch={dispatch} />
      </Section>

      {hasFontSize || hasAlign ? (
        <Section title="Typography">
          {hasFontSize ? (
            <label>
              <span className="field-label">Font size ({style.fontSize ?? 15}px)</span>
              <input
                type="range"
                min={10}
                max={64}
                value={style.fontSize ?? 15}
                onChange={(e) => setStyle({fontSize: Number(e.target.value)})}
                className="w-full accent-[var(--color-accent)]"
              />
            </label>
          ) : null}
          {hasAlign ? (
            <div>
              <span className="field-label">Alignment</span>
              <div className="flex gap-1">
                {ALIGNS.map(({value, icon: Icon}) => (
                  <button
                    key={value}
                    aria-label={`Align ${value}`}
                    onClick={() => setStyle({align: value})}
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-lg border py-2 transition-colors',
                      (style.align ?? 'left') === value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {isContainer ? (
        <Section title="Container">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Show border</span>
            <input
              type="checkbox"
              checked={style.showBorder ?? true}
              onChange={(e) => setStyle({showBorder: e.target.checked})}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="field-label">Background</span>
              <input
                type="color"
                value={style.background ?? '#f4ecd8'}
                onChange={(e) => setStyle({background: e.target.value})}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
              />
            </label>
            <label className="flex-1">
              <span className="field-label">Border</span>
              <input
                type="color"
                value={style.borderColor ?? '#b08d57'}
                onChange={(e) => setStyle({borderColor: e.target.value})}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
              />
            </label>
          </div>
        </Section>
      ) : null}

      <Section title="Position & Size">
        <div className="flex gap-3">
          <NumberField label="X" value={block.x} onChange={(v) => patchBlock({x: v})} />
          <NumberField label="Y" value={block.y} onChange={(v) => patchBlock({y: v})} />
        </div>
        <div className="flex gap-3">
          <NumberField label="Width" value={block.width} onChange={(v) => patchBlock({width: Math.max(40, v)})} />
          <NumberField label="Height" value={block.height} onChange={(v) => patchBlock({height: Math.max(40, v)})} />
        </div>
        <NumberField label="Rotation" value={block.rotation ?? 0} onChange={(v) => patchBlock({rotation: v})} />
      </Section>
    </aside>
  );
}


