import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Character, Ability, Spell, Feature, type SheetTab } from '@/types';
import { SPELL_LIST } from '@/data/spells';
import { AbilityScore } from './AbilityScore';
import { SkillRow } from './SkillRow';
import { SpellRow } from './SpellRow';
import { SpellPickerModal } from '@/components/modals/SpellPickerModal';
import { SpellTemplate } from '@/data/spells';
import { FeatPickerModal } from '@/components/modals/FeatPickerModal';
import { FeatTemplate, FeatCategory } from '@/data/feats';
import type { FeatureLibraryChoicePayload } from '@/lib/featPickerOrderChoices';
import { RacePickerModal } from '@/components/modals/RacePickerModal';
import { RaceTemplate, buildRaceFeatures } from '@/data/races';
import { BackgroundPickerModal, BackgroundResult } from '@/components/modals/BackgroundPickerModal';
import { BACKGROUND_LIST, backgroundRequiresGamingSetChoice } from '@/data/backgrounds';
import { ArmorPickerModal } from '@/components/modals/ArmorPickerModal';
import { ShopModal } from '@/components/modals/ShopModal';
import { LevelUpModal } from '@/components/creation/LevelUpModal';
import { WildShapeTab } from '@/components/tabs/WildShapeTab';
import { ClericDevotionTab } from '@/components/tabs/ClericDevotionTab';
import { CompanionTab } from '@/components/tabs/CompanionTab';
import { SpecialInventoryItemCard } from './SpecialInventoryItemCard';
import {
  ARMOR_LIST,
  effectiveWalkingSpeedFt,
  heavyArmorSpeedPenaltyFt,
  HEAVY_ARMOR_STR_SPEED_PENALTY_FT,
} from '@/data/armor';
import {
  asProficiencyArray,
  isPhb2024WeaponName,
  normalizeArmorProficiencies,
  normalizeWeaponProficiencies,
  PHB_2024_ARMOR_PROFICIENCY_CATEGORIES,
  PHB_2024_TOOL_PROFICIENCY_ALL,
  PHB_2024_WEAPON_PROFICIENCY_ALL,
  PHB_2024_WEAPON_PROFICIENCY_CATEGORIES,
} from '@/data/phb2024EquipmentProficiencies';
import { CustomSelect } from './CustomSelect';
import { WeaponRow } from './WeaponRow';
import {
  getModifier,
  getProficiencyBonus,
  formatModifier,
  formatBonus,
  getSkillEffectiveBonus,
  cn,
  isCompanionTabHidden,
  isWildShapeTabHidden,
  isFaithTabHidden,
} from '@/lib/utils';
import { compressImageFileToDataUrl } from '@/lib/compressImageFileToDataUrl';
import { characterHasToughFeat, toughHpDeltaOnAcquireFeat } from '@/lib/toughFeatHp';
import { applyCharacterLevelChange, resyncSpellSlotRows } from '@/lib/reconcileCharacterLevel';
import { getSpellBudgetSummary } from '@/lib/spellBudget';
import { aggregateSpecialInventoryModifiers } from '@/lib/specialInventoryModifiers';
import { buildClassFeaturesThroughLevel } from '@/lib/buildClassFeatures';
import { getDefaultSpellcastingAbility } from '@/lib/classSpellcasting';
import { formatToolAbilityTag } from '@/lib/toolAbility';
import {
  DND_CLASSES,
  ABILITIES,
  ALIGNMENTS,
  CONDITIONS,
  DAMAGE_TYPES,
  SUBCLASSES,
  maxSpellSlotTrackerSlots,
} from '@/config/constants';
import {
  Shield,
  Zap,
  Heart,
  Dice5,
  Plus,
  Minus,
  RotateCcw,
  Book,
  Sword,
  User,
  Sparkles,
  ScrollText,
  Backpack,
  Activity,
  Target,
  Wind,
  Maximize2,
  Eye,
  Award,
  Clock,
  MapPin,
  Settings as SettingsIcon,
  Trash2,
  AlertCircle,
  Search,
  Store,
  Image as ImageIcon,
  Moon,
  Sun,
  TrendingUp,
  BookOpen,
  ListOrdered,
  PawPrint,
  Bird,
  Church,
  GripVertical,
  Layers,
  Library,
  Wrench,
} from 'lucide-react';

/** Textarea that auto-grows to fit its content — no scrollbar, no drag handle */
function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="grid w-full" style={{ gridTemplateAreas: '"t"' }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        className={className}
        style={{ gridArea: 't', resize: 'none', overflow: 'hidden', minHeight: '1.5em' }}
      />
      {/* Mirror div that sizes the grid cell to fit the content */}
      <div
        aria-hidden
        style={{ gridArea: 't', whiteSpace: 'pre-wrap', wordBreak: 'break-word', visibility: 'hidden', minHeight: '1.5em', pointerEvents: 'none' }}
        className={className}
      >
        {value || placeholder || ''}{'\u200b'}
      </div>
    </div>
  );
}

type SortableFeatureCardProps = {
  feature: Feature;
  namePlaceholder: string;
  descPlaceholder: string;
  onUpdate: (patch: Partial<Feature>) => void;
  onDelete: () => void;
  /** Show a class-level tag for sorting (number input + optional badge). */
  allowAcquiredLevel?: boolean;
};

const SortableFeatureCard: React.FC<SortableFeatureCardProps> = ({
  feature,
  namePlaceholder,
  descPlaceholder,
  onUpdate,
  onDelete,
  allowAcquiredLevel = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-4 bg-slate-50 rounded-xl border border-slate-200 group relative flex gap-3',
        isDragging && 'opacity-50 shadow-2xl border-accent ring-2 ring-accent/20',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1 shrink-0 mt-0.5"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0 relative">
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-0 right-0 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
        >
          <Trash2 size={14} />
        </button>
        <div className="flex items-center gap-2 mb-2 pr-8 flex-wrap">
          <input
            value={feature.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="flex-1 min-w-0 font-black text-sm bg-transparent outline-none placeholder:text-slate-300"
            placeholder={namePlaceholder}
          />
          {allowAcquiredLevel ? (
            <label className="flex items-center gap-1 shrink-0" title="Class level when you gained this (optional; used by By level)">
              <span className="text-[9px] font-black uppercase text-muted">Lv</span>
              <input
                type="number"
                min={1}
                max={20}
                value={feature.acquiredAtLevel ?? ''}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') onUpdate({ acquiredAtLevel: undefined });
                  else {
                    const n = parseInt(v, 10);
                    if (!Number.isFinite(n)) onUpdate({ acquiredAtLevel: undefined });
                    else onUpdate({ acquiredAtLevel: Math.min(20, Math.max(1, n)) });
                  }
                }}
                className="w-11 px-1 py-0.5 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 bg-white outline-none focus:border-accent"
              />
            </label>
          ) : (
            feature.acquiredAtLevel != null && (
              <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-md">
                Lv.{feature.acquiredAtLevel}
              </span>
            )
          )}
        </div>
        <AutoTextarea
          value={feature.description}
          onChange={(v) => onUpdate({ description: v })}
          className="w-full text-xs bg-transparent outline-none text-muted leading-relaxed placeholder:text-slate-300"
          placeholder={descPlaceholder}
        />
      </div>
    </div>
  );
};

const ALIGNMENT_OPTIONS = [...ALIGNMENTS];

/** Skill names granted by a PHB background template (if known). */
function backgroundTemplateSkillNames(bgName: string): string[] {
  const t = BACKGROUND_LIST.find((b) => b.name === bgName);
  return t ? [...t.skills] : [];
}

/** Remove ASI, skill flags, Origin feat row, and Magic Initiate spells from the last background picker apply. */
function revertBackgroundPickerApply(c: Character): Character {
  const prev = c.backgroundPickApplied;
  if (!prev) return c;
  const abilities = { ...c.abilities };
  (Object.entries(prev.asiDeltas) as [Ability, number][]).forEach(([a, v]) => {
    abilities[a] = Math.max(1, (abilities[a] ?? 10) - v);
  });
  const stripNames = new Set<string>(prev.skills);
  for (const n of backgroundTemplateSkillNames(prev.name)) stripNames.add(n);
  const skills = c.skills.map((s) =>
    stripNames.has(s.name) ? { ...s, proficient: false, expert: false } : s,
  );
  const racialTraits = (c.racialTraits || []).filter(
    (t) =>
      !(
        t.source === prev.name &&
        (t.name === `Feat: ${prev.feat}` ||
          t.name.startsWith('Gaming set ('))
      ),
  );
  const dropIds = new Set(prev.miSpellIds ?? []);
  const spells =
    dropIds.size > 0
      ? c.spellcasting.spells.filter((s) => !dropIds.has(s.id))
      : c.spellcasting.spells;
  const toughDrop = prev.feat === 'Tough' ? 2 * c.level : 0;
  const hp =
    toughDrop > 0
      ? {
          max: Math.max(1, c.hp.max - toughDrop),
          current: Math.max(0, c.hp.current - toughDrop),
          temp: c.hp.temp,
        }
      : c.hp;
  return {
    ...c,
    abilities,
    skills,
    racialTraits,
    hp,
    spellcasting: { ...c.spellcasting, spells },
    backgroundPickApplied: undefined,
  };
}

import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CharacterSheetProps {
  character: Character;
  onUpdate: (character: Character) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
}

type Tab = SheetTab;

function toggleProficiencyPick(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
}

/** Searchable multi-select: selected chips (click to remove) + filterable “+ add” chips. */
function ToolProficiencyChipSelect({
  options,
  selected,
  onChange,
  showAdd = true,
  showSelected = true,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  showAdd?: boolean;
  showSelected?: boolean;
}) {
  const [query, setQuery] = useState('');
  const addable = useMemo(() => {
    if (!showAdd) return [];
    const q = query.trim().toLowerCase();
    return options.filter(
      (t) => !selected.includes(t) && (!q || t.toLowerCase().includes(q)),
    );
  }, [options, selected, query, showAdd]);

  const labelFor = (name: string) => {
    const tag = formatToolAbilityTag(name);
    return tag ? `${name} (${tag})` : name;
  };

  return (
    <div className="space-y-3 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
      {showSelected && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Selected</div>
          <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-start">
            {selected.length === 0 ? (
              <span className="text-[10px] text-muted italic py-1">None — search and tap a tool to add.</span>
            ) : (
              [...selected]
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    title="Remove"
                    onClick={() => onChange(selected.filter((x) => x !== t))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-black border border-accent bg-accent text-white hover:bg-accent/90 transition-colors"
                  >
                    {labelFor(t)} ×
                  </button>
                ))
            )}
          </div>
        </div>
      )}
      {showAdd && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools to add…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Add</div>
            <div className="max-h-52 overflow-y-auto flex flex-wrap gap-1.5">
              {addable.length === 0 ? (
                <span className="text-[10px] text-muted italic">No matches.</span>
              ) : (
                addable.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange([...selected, name]);
                      setQuery('');
                    }}
                    className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent transition-colors text-left max-w-full"
                  >
                    + {labelFor(name)}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Searchable multi-select for damage defenses (resist/vuln/immune). */
function DamageTypeChipSelect({
  selected,
  onChange,
  placeholder,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const addable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DAMAGE_TYPES.filter(
      (t) => !selected.includes(t) && (!q || t.toLowerCase().includes(q)),
    );
  }, [selected, query]);

  return (
    <div className="space-y-3 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
      <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-start">
        {selected.length === 0 ? (
          <span className="text-[10px] text-muted italic py-1">None.</span>
        ) : (
          [...selected]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .map((t) => (
              <button
                key={t}
                type="button"
                title="Remove"
                onClick={() => onChange(selected.filter((x) => x !== t))}
                className="px-2.5 py-1 rounded-full text-[10px] font-black border border-accent bg-accent text-white hover:bg-accent/90 transition-colors"
              >
                {t} ×
              </button>
            ))
        )}
      </div>

      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          size={14}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-accent"
        />
      </div>

      <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
        {addable.length === 0 ? (
          <span className="text-[10px] text-muted italic">No matches.</span>
        ) : (
          addable.map((t) => (
            <button
              key={t}
              type="button"
              title={t}
              onClick={() => {
                onChange([...selected, t]);
                setQuery('');
              }}
              className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent transition-colors text-left max-w-full"
            >
              + {t}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Searchable multi-select: weapon names only (not simple/martial categories). */
function WeaponProficiencyChipSelect({
  options,
  selected,
  onChange,
  showAdd = true,
  showSelected = true,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  showAdd?: boolean;
  showSelected?: boolean;
}) {
  const [query, setQuery] = useState('');
  const addable = useMemo(() => {
    if (!showAdd) return [];
    const q = query.trim().toLowerCase();
    return options.filter(
      (w) => !selected.includes(w) && (!q || w.toLowerCase().includes(q)),
    );
  }, [options, selected, query, showAdd]);

  return (
    <div className="space-y-3 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
      {showSelected && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Selected</div>
          <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-start">
            {selected.length === 0 ? (
              <span className="text-[10px] text-muted italic py-1">None — search and tap a weapon to add.</span>
            ) : (
              [...selected]
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .map((w) => (
                  <button
                    key={w}
                    type="button"
                    title="Remove"
                    onClick={() => onChange(selected.filter((x) => x !== w))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-black border border-accent bg-accent text-white hover:bg-accent/90 transition-colors"
                  >
                    {w} ×
                  </button>
                ))
            )}
          </div>
        </div>
      )}
      {showAdd && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search weapons to add…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Add</div>
            <div className="max-h-52 overflow-y-auto flex flex-wrap gap-1.5">
              {addable.length === 0 ? (
                <span className="text-[10px] text-muted italic">No matches.</span>
              ) : (
                addable.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange([...selected, name]);
                      setQuery('');
                    }}
                    className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent transition-colors text-left max-w-full"
                  >
                    + {name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Searchable multi-select: weapon category lines (Simple/Martial). */
function WeaponCategoryChipSelect({
  options,
  selected,
  onChange,
  showAdd = true,
  showSelected = true,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  showAdd?: boolean;
  showSelected?: boolean;
}) {
  const [query, setQuery] = useState('');
  const addable = useMemo(() => {
    if (!showAdd) return [];
    const q = query.trim().toLowerCase();
    return options.filter(
      (w) => !selected.includes(w) && (!q || w.toLowerCase().includes(q)),
    );
  }, [options, selected, query, showAdd]);

  return (
    <div className="space-y-3 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
      {showSelected && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Selected</div>
          <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-start">
            {selected.length === 0 ? (
              <span className="text-[10px] text-muted italic py-1">None — search and tap a category to add.</span>
            ) : (
              [...selected]
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .map((w) => (
                  <button
                    key={w}
                    type="button"
                    title="Remove"
                    onClick={() => onChange(selected.filter((x) => x !== w))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-black border border-accent bg-accent text-white hover:bg-accent/90 transition-colors"
                  >
                    {w} ×
                  </button>
                ))
            )}
          </div>
        </div>
      )}
      {showAdd && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories to add…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Add</div>
            <div className="max-h-52 overflow-y-auto flex flex-wrap gap-1.5">
              {addable.length === 0 ? (
                <span className="text-[10px] text-muted italic">No matches.</span>
              ) : (
                addable.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange([...selected, name]);
                      setQuery('');
                    }}
                    className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent transition-colors text-left max-w-full"
                  >
                    + {name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Searchable multi-select: armor training categories (Light/Medium/Heavy/Shields). */
function ArmorCategoryChipSelect({
  options,
  selected,
  onChange,
  showAdd = true,
  showSelected = true,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  showAdd?: boolean;
  showSelected?: boolean;
}) {
  const [query, setQuery] = useState('');
  const addable = useMemo(() => {
    if (!showAdd) return [];
    const q = query.trim().toLowerCase();
    return options.filter(
      (a) => !selected.includes(a) && (!q || a.toLowerCase().includes(q)),
    );
  }, [options, selected, query, showAdd]);

  return (
    <div className="space-y-3 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
      {showSelected && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Selected</div>
          <div className="flex flex-wrap gap-1.5 min-h-[2rem] items-start">
            {selected.length === 0 ? (
              <span className="text-[10px] text-muted italic py-1">None — search and tap armor to add.</span>
            ) : (
              [...selected]
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .map((name) => (
                  <button
                    key={name}
                    type="button"
                    title="Remove"
                    onClick={() => onChange(selected.filter((x) => x !== name))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-black border border-accent bg-accent text-white hover:bg-accent/90 transition-colors"
                  >
                    {name} ×
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search armor to add…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1.5">Add</div>
            <div className="max-h-52 overflow-y-auto flex flex-wrap gap-1.5">
              {addable.length === 0 ? (
                <span className="text-[10px] text-muted italic">No matches.</span>
              ) : (
                addable.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange([...selected, name]);
                      setQuery('');
                    }}
                    className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent transition-colors text-left max-w-full"
                  >
                    + {name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const ACCENT_PALETTES = [
  { name: 'Blue',    value: '#2563eb' },
  { name: 'Indigo',  value: '#4f46e5' },
  { name: 'Violet',  value: '#7c3aed' },
  { name: 'Rose',    value: '#e11d48' },
  { name: 'Pink',    value: '#db2777' },
  { name: 'Orange',  value: '#ea580c' },
  { name: 'Amber',   value: '#d97706' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal',    value: '#0d9488' },
  { name: 'Cyan',    value: '#0891b2' },
  { name: 'Slate',   value: '#475569' },
  { name: 'Black',   value: '#1a1a1a' },
];

const SHEET_TAB_ORDER: Tab[] = [
  'core',
  'combat',
  'spells',
  'features',
  'wildshape',
  'faith',
  'companions',
  'bio',
  'lore',
  'settings',
];

function normalizeSheetTab(t: SheetTab | undefined): Tab {
  return t && SHEET_TAB_ORDER.includes(t) ? t : 'core';
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdate, darkMode, setDarkMode, accentColor, setAccentColor }) => {
  const [activeTab, setActiveTab] = useState<Tab>(() => normalizeSheetTab(character.sheetActiveTab));
  const [activeSpellLevel, setActiveSpellLevel] = useState<number>(-1);
  const [skillSearch, setSkillSearch] = useState('');
  const [spellPickerOpen, setSpellPickerOpen] = useState(false);
  const [spellPickerLevel, setSpellPickerLevel] = useState<number>(1);
  const [featPickerOpen, setFeatPickerOpen] = useState(false);
  const [featPickerCategory, setFeatPickerCategory] = useState<FeatCategory>('Class Feature');
  const [featPickerTarget, setFeatPickerTarget] = useState<
    'classFeatures' | 'subclassFeatures' | 'racialTraits'
  >('classFeatures');
  /** Inner tabs on the Features sheet tab */
  const [featuresSubTab, setFeaturesSubTab] = useState<'class' | 'subclass' | 'traits'>('class');
  const [racePickerOpen, setRacePickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [armorPickerOpen, setArmorPickerOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [weaponCategoryOpen, setWeaponCategoryOpen] = useState(false);
  const [weaponSpecificOpen, setWeaponSpecificOpen] = useState(false);
  const [toolProfsOpen, setToolProfsOpen] = useState(false);
  const [armorProfsOpen, setArmorProfsOpen] = useState(false);
  const [portraitDragActive, setPortraitDragActive] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [initiativeFocused, setInitiativeFocused] = useState(false);
  const [initiativeEditingText, setInitiativeEditingText] = useState('');
  const portraitZoneRef = useRef<HTMLDivElement>(null);
  const portraitFileRef = useRef<HTMLInputElement>(null);
  const characterRef = useRef(character);
  characterRef.current = character;

  const goToTab = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      const c = characterRef.current;
      if (c.sheetActiveTab === tab) return;
      onUpdate({ ...c, sheetActiveTab: tab });
    },
    [onUpdate],
  );

  useEffect(() => {
    setActiveTab(normalizeSheetTab(character.sheetActiveTab));
  }, [character.id]);

  const compactSpells = character.compactSpellbook ?? false;
  const profBonus = character.proficiencyBonus ?? getProficiencyBonus(character.level);
  const [levelDraft, setLevelDraft] = useState(() => String(character.level));
  const levelDraftRef = useRef(levelDraft);
  levelDraftRef.current = levelDraft;
  const levelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLevelDraft(String(character.level));
  }, [character.level, character.id]);

  useEffect(() => {
    return () => {
      if (levelDebounceRef.current) clearTimeout(levelDebounceRef.current);
    };
  }, []);

  const flushLevelDraft = () => {
    const c = characterRef.current;
    const raw = levelDraftRef.current;
    const n = parseInt(raw, 10);
    const next = Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : c.level;
    const nextStr = String(next);
    setLevelDraft(nextStr);
    levelDraftRef.current = nextStr;
    if (next !== c.level) onUpdate(applyCharacterLevelChange(c, next));
  };

  const scheduleLevelCommit = (draft: string) => {
    if (levelDebounceRef.current) clearTimeout(levelDebounceRef.current);
    levelDebounceRef.current = setTimeout(() => {
      levelDebounceRef.current = null;
      const c = characterRef.current;
      const n = parseInt(draft, 10);
      if (!Number.isFinite(n)) return;
      const next = Math.min(20, Math.max(1, n));
      if (next !== c.level) onUpdate(applyCharacterLevelChange(c, next));
    }, 550);
  };

  const consumePortraitFile = async (file: File | undefined) => {
    setPortraitError(null);
    if (!file) return;
    setPortraitBusy(true);
    try {
      const result = await compressImageFileToDataUrl(file);
      if (!result.ok) {
        setPortraitError(result.error);
        return;
      }
      onUpdate({ ...characterRef.current, image: result.dataUrl });
    } finally {
      setPortraitBusy(false);
    }
  };

  const endPortraitDragIfLeaving = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && portraitZoneRef.current?.contains(next)) return;
    setPortraitDragActive(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const walkingSpeed = useMemo(() => {
    const penalty = heavyArmorSpeedPenaltyFt(character.equippedArmor, character.abilities.str);
    const effective = effectiveWalkingSpeedFt(
      character.speed,
      character.equippedArmor,
      character.abilities.str,
    );
    const armor = ARMOR_LIST.find(
      (a) => a.name === character.equippedArmor && a.category === 'Heavy',
    );
    const strReq = armor?.strRequirement;
    return { penalty, effective, strReq };
  }, [character.speed, character.equippedArmor, character.abilities.str]);

  const invItemMods = useMemo(
    () => aggregateSpecialInventoryModifiers(character.specialInventoryItems),
    [character.specialInventoryItems],
  );

  const skillNamesForSpecialItems = useMemo(
    () => [...new Set(character.skills.map((s) => s.name))],
    [character.skills],
  );

  const weaponProfsRaw = useMemo(
    () => asProficiencyArray(character.weaponProficiencies),
    [character.weaponProficiencies],
  );
  const weaponCategoryProfs = useMemo(
    () => normalizeWeaponProficiencies(weaponProfsRaw),
    [weaponProfsRaw],
  );
  const weaponSpecificProfs = useMemo(
    () => weaponProfsRaw.filter((p) => isPhb2024WeaponName(p)),
    [weaponProfsRaw],
  );
  const weaponCategoryPicks = useMemo(() => {
    const cats = new Set<string>(PHB_2024_WEAPON_PROFICIENCY_CATEGORIES);
    return weaponProfsRaw.filter((p) => cats.has(p));
  }, [weaponProfsRaw]);
  const armorProfsRaw = useMemo(
    () => asProficiencyArray(character.armorProficiencies),
    [character.armorProficiencies],
  );
  const armorProfs = useMemo(
    () => normalizeArmorProficiencies(armorProfsRaw),
    [armorProfsRaw],
  );
  const toolProfs = useMemo(
    () => asProficiencyArray(character.toolProficiencies),
    [character.toolProficiencies],
  );

  const initiativeTotal = useMemo(() => {
    const dexMod = getModifier(character.abilities.dex);
    const misc = character.initiative ?? 0;
    const prof = character.initiativeProficient ? profBonus : 0;
    return dexMod + prof + misc + invItemMods.initiative;
  }, [
    character.abilities.dex,
    character.initiative,
    character.initiativeProficient,
    profBonus,
    invItemMods.initiative,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = character.spellcasting.spells.findIndex(s => s.id === active.id);
      const newIndex = character.spellcasting.spells.findIndex(s => s.id === over.id);
      
      const newSpells = arrayMove(character.spellcasting.spells, oldIndex, newIndex);
      onUpdate({
        ...character,
        spellcasting: { ...character.spellcasting, spells: newSpells }
      });
    }
  };

  const handleClassFeaturesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = character.classFeatures || [];
    const oldIndex = list.findIndex((f) => f.id === active.id);
    const newIndex = list.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onUpdate({ ...character, classFeatures: arrayMove(list, oldIndex, newIndex) });
  };

  const sortClassFeaturesByLevel = () => {
    const list = [...(character.classFeatures || [])];
    list.sort((a, b) => {
      const da = a.acquiredAtLevel;
      const db = b.acquiredAtLevel;
      if (da != null && db != null && da !== db) return da - db;
      if (da != null && db == null) return -1;
      if (da == null && db != null) return 1;
      return 0;
    });
    onUpdate({ ...character, classFeatures: list });
  };

  const handleSubclassFeaturesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = character.subclassFeatures || [];
    const oldIndex = list.findIndex((f) => f.id === active.id);
    const newIndex = list.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onUpdate({ ...character, subclassFeatures: arrayMove(list, oldIndex, newIndex) });
  };

  const sortSubclassFeaturesByLevel = () => {
    const list = [...(character.subclassFeatures || [])];
    list.sort((a, b) => {
      const da = a.acquiredAtLevel;
      const db = b.acquiredAtLevel;
      if (da != null && db != null && da !== db) return da - db;
      if (da != null && db == null) return -1;
      if (da == null && db != null) return 1;
      return 0;
    });
    onUpdate({ ...character, subclassFeatures: list });
  };

  const handleRacialTraitsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = character.racialTraits || [];
    const oldIndex = list.findIndex((t) => t.id === active.id);
    const newIndex = list.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onUpdate({ ...character, racialTraits: arrayMove(list, oldIndex, newIndex) });
  };

  const updateAbility = (ability: Ability, score: number) => {
    const updated: Character = {
      ...character,
      abilities: { ...character.abilities, [ability]: score },
    };

    // Auto-recalculate AC when DEX changes
    if (ability === 'dex') {
      const newDexMod = getModifier(score);
      const armor = ARMOR_LIST.find(a => a.name === character.equippedArmor);
      const shieldBonus = character.equippedShield ? 2 : 0;
      if (armor && armor.category !== 'Shield') {
        let base = armor.acBase;
        if (armor.dexBonus === 'full')  base += newDexMod;
        else if (armor.dexBonus === 'max2') base += Math.min(2, newDexMod);
        updated.ac = base + shieldBonus;
      } else if (!character.equippedArmor) {
        updated.ac = 10 + newDexMod + shieldBonus;
      }
    }

    // Auto-recalculate max & current HP when CON changes (+1 HP per level per point of CON mod delta)
    if (ability === 'con') {
      const oldConMod = getModifier(character.abilities.con);
      const newConMod = getModifier(score);
      const diff = (newConMod - oldConMod) * character.level;
      const newMax = Math.max(1, character.hp.max + diff);
      const newCurrent = Math.min(newMax, Math.max(0, character.hp.current + diff));
      updated.hp = {
        ...character.hp,
        max: newMax,
        current: newCurrent,
      };
    }

    onUpdate(updated);
  };

  const updateSkill = (index: number, proficient: boolean, expert: boolean) => {
    const newSkills = [...character.skills];
    newSkills[index] = { ...newSkills[index], proficient, expert };
    onUpdate({ ...character, skills: newSkills });
  };

  const updateSkillBonusOverride = (index: number, bonusOverride: number | undefined) => {
    const newSkills = [...character.skills];
    const prev = newSkills[index];
    if (bonusOverride === undefined) {
      const { bonusOverride: _, ...rest } = prev;
      newSkills[index] = rest;
    } else {
      newSkills[index] = { ...prev, bonusOverride };
    }
    onUpdate({ ...character, skills: newSkills });
  };

  const updateSpellSlot = (level: number, total: number, expended: number) => {
    const cap = maxSpellSlotTrackerSlots(level);
    const limitedTotal = Math.min(Math.max(total, 0), cap);
    
    // Ensure expended mask doesn't exceed total slots
    const mask = (1 << limitedTotal) - 1;
    const sanitizedExpended = expended & mask;
    
    onUpdate({
      ...character,
      spellcasting: {
        ...character.spellcasting,
        slots: {
          ...character.spellcasting.slots,
          [level]: { total: limitedTotal, expended: sanitizedExpended }
        }
      }
    });
  };

  // Clamp legacy saves where totals exceeded PHB tracker caps
  useEffect(() => {
    const nextSlots = { ...character.spellcasting.slots };
    let changed = false;
    for (let lvl = 1; lvl <= 9; lvl++) {
      const cap = maxSpellSlotTrackerSlots(lvl);
      const s = nextSlots[lvl] ?? { total: 0, expended: 0 };
      if (s.total > cap) {
        const lt = cap;
        const mask = (1 << lt) - 1;
        nextSlots[lvl] = { total: lt, expended: s.expended & mask };
        changed = true;
      }
    }
    if (!changed) return;
    onUpdate({
      ...character,
      spellcasting: { ...character.spellcasting, slots: nextSlots },
    });
  }, [character.id, JSON.stringify(character.spellcasting.slots)]);

  const addSpell = (level: number) => {
    const newSpell: Spell = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      level: level,
      prepared: false,
      castingTime: '1 Action',
      range: '60 ft',
      description: '',
      components: { v: true, s: true, m: false },
      isRitual: false,
      isConcentration: false,
    };
    onUpdate({
      ...character,
      spellcasting: {
        ...character.spellcasting,
        spells: [...character.spellcasting.spells, newSpell]
      }
    });
  };

  const addSpellFromTemplate = (template: SpellTemplate) => {
    const newSpell: Spell = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      prepared: false,
    };
    onUpdate({
      ...character,
      spellcasting: {
        ...character.spellcasting,
        spells: [...character.spellcasting.spells, newSpell]
      }
    });
  };

  const addFeatFromTemplate = (feat: FeatTemplate, libraryChoice?: FeatureLibraryChoicePayload) => {
    if (featPickerTarget === 'classFeatures' && feat.category !== 'Class Feature') return;
    if (featPickerTarget === 'subclassFeatures' && feat.category !== 'Subclass Feature') return;
    if (
      featPickerTarget === 'racialTraits' &&
      feat.category !== 'Feat' &&
      feat.category !== 'Racial Trait'
    ) {
      return;
    }
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: feat.name,
      description: feat.description,
      source: feat.source,
      ...(feat.acquiredAtLevel != null ? { acquiredAtLevel: feat.acquiredAtLevel } : {}),
    };
    const isTough = feat.name.trim().toLowerCase() === 'tough';
    const toughDelta =
      isTough && !characterHasToughFeat(character)
        ? toughHpDeltaOnAcquireFeat(character.level)
        : 0;
    const applyToughHp = (c: Character): Character =>
      toughDelta > 0
        ? {
            ...c,
            hp: {
              max: c.hp.max + toughDelta,
              current: c.hp.current + toughDelta,
              temp: c.hp.temp,
            },
          }
        : c;

    const applyOrderChoice = (c: Character): Character => {
      if (!libraryChoice) return c;
      if (libraryChoice.kind === 'cleric_divine_order') {
        return {
          ...c,
          clericDevotion: {
            ...(c.clericDevotion ?? { deityId: null }),
            divineOrder: libraryChoice.value,
          },
        };
      }
      if (libraryChoice.kind === 'druid_primal_order') {
        return {
          ...c,
          wildShape: {
            ...(c.wildShape ?? { usesExpended: 0, bookmarkedBeastIds: [] }),
            primalOrder: libraryChoice.value,
          },
        };
      }
      if (libraryChoice.kind === 'feat_crafter_fast_crafting') {
        const next = new Set<string>(c.toolProficiencies ?? []);
        for (const t of libraryChoice.value) next.add(t);
        return { ...c, toolProficiencies: [...next] };
      }
      return c;
    };

    if (featPickerTarget === 'classFeatures') {
      onUpdate(
        applyOrderChoice(
          applyToughHp({
            ...character,
            classFeatures: [...(character.classFeatures || []), newEntry],
          }),
        ),
      );
    } else if (featPickerTarget === 'subclassFeatures') {
      onUpdate(applyOrderChoice({ ...character, subclassFeatures: [...(character.subclassFeatures || []), newEntry] }));
    } else {
      onUpdate(
        applyOrderChoice(
          applyToughHp({
            ...character,
            racialTraits: [...(character.racialTraits || []), newEntry],
          }),
        ),
      );
    }
  };

  const handleRaceSelected = (
    race: RaceTemplate,
    features: ReturnType<typeof buildRaceFeatures>,
  ) => {
    onUpdate({
      ...character,
      race: race.name,
      racialTraits: [...(character.racialTraits || []), ...features],
    });
    setRacePickerOpen(false);
  };

  const handleBackgroundSelected = ({
    background,
    asiDeltas,
    miCantrips = [],
    miSpell = '',
    gamingSetPick = '',
  }: BackgroundResult) => {
    const hadStructuredPick = Boolean(character.backgroundPickApplied);
    const previousBackgroundName = character.background;
    const base = revertBackgroundPickerApply(character);
    const newAbilities = { ...base.abilities };
    (Object.entries(asiDeltas) as [Ability, number][]).forEach(([a, v]) => {
      newAbilities[a] = Math.min(20, (newAbilities[a] ?? 10) + v);
    });
    // Blank / legacy sheets: no backgroundPickApplied, so revert did not strip old PHB background skills.
    let skills = base.skills;
    if (
      !hadStructuredPick &&
      previousBackgroundName &&
      previousBackgroundName !== background.name
    ) {
      const inferred = BACKGROUND_LIST.find((b) => b.name === previousBackgroundName);
      if (inferred) {
        skills = skills.map((s) =>
          inferred.skills.includes(s.name) && !background.skills.includes(s.name)
            ? { ...s, proficient: false, expert: false }
            : s,
        );
      }
    }
    const newSkills = skills.map((s) =>
      background.skills.includes(s.name) ? { ...s, proficient: true } : s,
    );
    const featFeature = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Feat: ${background.feat}`,
      description: background.featDescription,
      source: background.name,
    };

    const gamingTraits =
      gamingSetPick.trim() && backgroundRequiresGamingSetChoice(background)
        ? [
            {
              id: Math.random().toString(36).substr(2, 9),
              name: `Gaming set (${background.name})`,
              description: gamingSetPick.trim(),
              source: background.name,
            },
          ]
        : [];

    const miSpellIds: string[] = [];
    const miSpells: Spell[] = [];
    if (
      background.feat.startsWith('Magic Initiate') &&
      miCantrips.length === 2 &&
      miSpell
    ) {
      for (const name of miCantrips) {
        const tmpl = SPELL_LIST.find((sp) => sp.name === name);
        const id = Math.random().toString(36).substr(2, 9);
        miSpellIds.push(id);
        miSpells.push({
          id,
          name,
          level: 0,
          prepared: true,
          spellBudgetExempt: true,
          castingTime: tmpl?.castingTime ?? '1 Action',
          range: tmpl?.range ?? '—',
          description: tmpl?.description ?? '',
          components: tmpl?.components ?? { v: true, s: true, m: false },
          isRitual: false,
          isConcentration: tmpl?.isConcentration ?? false,
        });
      }
      const tmpl = SPELL_LIST.find((sp) => sp.name === miSpell);
      const id = Math.random().toString(36).substr(2, 9);
      miSpellIds.push(id);
      miSpells.push({
        id,
        name: miSpell,
        level: 1,
        prepared: true,
        isFree: true,
        spellBudgetExempt: true,
        castingTime: tmpl?.castingTime ?? '1 Action',
        range: tmpl?.range ?? '—',
        description: tmpl?.description ?? '',
        components: tmpl?.components ?? { v: true, s: true, m: false },
        isRitual: tmpl?.isRitual ?? false,
        isConcentration: tmpl?.isConcentration ?? false,
      });
    }

    const toughAdd = background.feat === 'Tough' ? 2 * base.level : 0;
    const hpFromTough =
      toughAdd > 0
        ? {
            max: base.hp.max + toughAdd,
            current: base.hp.current + toughAdd,
            temp: base.hp.temp,
          }
        : base.hp;

    onUpdate({
      ...base,
      background: background.name,
      abilities: newAbilities,
      skills: newSkills,
      hp: hpFromTough,
      racialTraits: [...(base.racialTraits || []), featFeature, ...gamingTraits],
      spellcasting: {
        ...base.spellcasting,
        spells: [...base.spellcasting.spells, ...miSpells],
      },
      backgroundPickApplied: {
        name: background.name,
        asiDeltas: { ...asiDeltas },
        skills: [background.skills[0], background.skills[1]],
        feat: background.feat,
        ...(miSpellIds.length ? { miSpellIds } : {}),
      },
    });
    setBgPickerOpen(false);
  };

  const handleBackgroundTextChange = (newName: string) => {
    if (
      character.backgroundPickApplied &&
      character.backgroundPickApplied.name !== newName
    ) {
      onUpdate({ ...revertBackgroundPickerApply(character), background: newName });
      return;
    }
    onUpdate({ ...character, background: newName });
  };

  const updateSpell = (id: string, spell: Spell) => {
    const newSpells = character.spellcasting.spells.map(s => s.id === id ? spell : s);
    onUpdate({
      ...character,
      spellcasting: { ...character.spellcasting, spells: newSpells }
    });
  };

  const deleteSpell = (id: string) => {
    const newSpells = character.spellcasting.spells.filter(s => s.id !== id);
    onUpdate({
      ...character,
      spellcasting: { ...character.spellcasting, spells: newSpells }
    });
  };

  const perceptionSkill = character.skills.find((s) => s.name === 'Perception');
  const perceptionItemSkill = invItemMods.skills['Perception'] ?? 0;
  const passiveSkillPart = perceptionSkill
    ? getSkillEffectiveBonus(perceptionSkill, character.abilities.wis, profBonus) + perceptionItemSkill
    : getModifier(character.abilities.wis) + perceptionItemSkill;
  const passivePerception = 10 + passiveSkillPart + invItemMods.passivePerception;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'core' as Tab, label: 'Core Stats', icon: User },
    { id: 'combat' as Tab, label: 'Combat', icon: Sword },
    { id: 'spells' as Tab, label: 'Spellbook', icon: Sparkles },
    { id: 'features' as Tab, label: 'Features', icon: ScrollText },
    { id: 'wildshape' as Tab, label: 'Wild Shape', icon: PawPrint },
    { id: 'faith' as Tab, label: 'Faith', icon: Church },
    { id: 'companions' as Tab, label: 'Companions', icon: Bird },
    { id: 'bio' as Tab, label: 'Inventory', icon: Backpack },
    { id: 'lore' as Tab, label: 'Lore', icon: BookOpen },
    { id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon },
  ].filter((tab) => {
    if (tab.id === 'settings') return true;
    if (tab.id === 'lore') {
      if (!character.hiddenTabs?.includes('lore')) return true;
      return activeTab === 'lore';
    }
    if (tab.id === 'wildshape') {
      if (!isWildShapeTabHidden(character)) return true;
      return activeTab === 'wildshape';
    }
    if (tab.id === 'faith') {
      if (!isFaithTabHidden(character)) return true;
      return activeTab === 'faith';
    }
    if (tab.id === 'companions') {
      if (!isCompanionTabHidden(character)) return true;
      return activeTab === 'companions';
    }
    return !character.hiddenTabs?.includes(tab.id);
  });

  useEffect(() => {
    const h = character.hiddenTabs ?? [];
    const tabInNav = (id: Tab, current: Tab): boolean => {
      if (id === 'settings') return true;
      if (id === 'wildshape') {
        if (!isWildShapeTabHidden(character)) return true;
        return current === 'wildshape';
      }
      if (id === 'faith') {
        if (!isFaithTabHidden(character)) return true;
        return current === 'faith';
      }
      if (id === 'lore') {
        if (!h.includes('lore')) return true;
        return current === 'lore';
      }
      if (id === 'companions') {
        if (!isCompanionTabHidden(character)) return true;
        return current === 'companions';
      }
      return !h.includes(id);
    };
    if (!tabInNav(activeTab, activeTab)) {
      const next = SHEET_TAB_ORDER.find((id) => tabInNav(id, activeTab));
      if (next) goToTab(next);
    }
  }, [character.hiddenTabs, activeTab, goToTab]);

  return (
    <div id="character-sheet" className="sheet-container min-h-screen flex flex-col gap-8">
      {spellPickerOpen && (
        <SpellPickerModal
          currentLevel={spellPickerLevel}
          onAdd={addSpellFromTemplate}
          onClose={() => setSpellPickerOpen(false)}
        />
      )}
      {featPickerOpen && (
        <FeatPickerModal
          defaultCategory={featPickerCategory}
          characterClass={character.class}
          allowedCategories={
            featPickerTarget === 'classFeatures'
              ? ['Class Feature']
              : featPickerTarget === 'subclassFeatures'
                ? ['Subclass Feature']
                : ['Feat', 'Racial Trait']
          }
          onAdd={addFeatFromTemplate}
          onClose={() => setFeatPickerOpen(false)}
        />
      )}
      {racePickerOpen && (
        <RacePickerModal
          onConfirm={handleRaceSelected}
          onClose={() => setRacePickerOpen(false)}
        />
      )}
      {bgPickerOpen && (
        <BackgroundPickerModal
          onConfirm={handleBackgroundSelected}
          onClose={() => setBgPickerOpen(false)}
        />
      )}
      {armorPickerOpen && (
        <ArmorPickerModal
          equippedArmor={character.equippedArmor ?? ''}
          equippedShield={character.equippedShield ?? false}
          dexMod={getModifier(character.abilities.dex)}
          strScore={character.abilities.str}
          onConfirm={(armorName, hasShield, newAC) => {
            onUpdate({ ...character, equippedArmor: armorName, equippedShield: hasShield, ac: newAC });
          }}
          onClose={() => setArmorPickerOpen(false)}
        />
      )}
      {shopOpen && (
        <ShopModal
          character={character}
          onClose={() => setShopOpen(false)}
          onPurchase={({ currency, inventory }) => {
            onUpdate({ ...character, currency, inventory });
          }}
        />
      )}
      {levelUpOpen && (
        <LevelUpModal
          character={character}
          onConfirm={(updated) => { onUpdate(updated); setLevelUpOpen(false); }}
          onClose={() => setLevelUpOpen(false)}
        />
      )}
      {/* Header */}
      <header className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 items-end border-b border-border pb-8">
        <div className="flex flex-col gap-1 items-start">
          <div
            ref={portraitZoneRef}
            className={cn(
              'relative group w-32 h-32 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all hover:border-accent',
              portraitDragActive && 'ring-2 ring-inset ring-accent border-accent shadow-[inset_0_0_0_9999px_rgba(37,99,235,0.08)]',
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.types.includes('Files')) setPortraitDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={endPortraitDragIfLeaving}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPortraitDragActive(false);
              if (!portraitBusy) void consumePortraitFile(e.dataTransfer.files?.[0]);
            }}
          >
            {character.image ? (
              <img
                src={character.image}
                alt={character.name}
                className="pointer-events-none h-full w-full object-cover select-none"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            ) : (
              <ImageIcon size={32} className="text-slate-300 group-hover:text-accent transition-colors pointer-events-none" />
            )}
            <input
              ref={portraitFileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload character portrait"
              onChange={(e) => {
                void consumePortraitFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={portraitBusy}
              className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
              aria-label="Upload or change character portrait"
              title="Click or drop an image"
              aria-busy={portraitBusy}
              onClick={() => {
                if (!portraitBusy) portraitFileRef.current?.click();
              }}
            />
            {character.image && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ ...character, image: '' });
                }}
                className="absolute top-2 right-2 z-10 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                title="Remove portrait"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          {portraitBusy && (
            <p className="max-w-[8.5rem] text-[9px] font-medium leading-tight text-muted" role="status">
              Compressing…
            </p>
          )}
          {!portraitBusy && portraitError && (
            <p className="max-w-[8.5rem] text-[9px] font-medium leading-tight text-red-600" role="alert">
              {portraitError}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <input
            value={character.name}
            onChange={(e) => onUpdate({ ...character, name: e.target.value })}
            className="text-5xl font-black tracking-tighter w-full bg-transparent border-b-4 border-accent outline-none py-2"
            placeholder="Character Name"
          />
          <div className="flex items-end gap-4 flex-nowrap overflow-x-auto">
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Class</span>
              <CustomSelect
                value={character.class}
                options={DND_CLASSES}
                onChange={(cls) => {
                  let updated: Character = {
                    ...character,
                    class: cls,
                    subclass: '',
                    classFeatures: buildClassFeaturesThroughLevel(cls, character.level),
                    spellcasting: {
                      ...character.spellcasting,
                      ability: getDefaultSpellcastingAbility(cls),
                      slots: resyncSpellSlotRows(cls, character.level, character.spellcasting.slots),
                    },
                  };
                  if (cls === 'Druid' && !updated.wildShape) {
                    updated = {
                      ...updated,
                      wildShape: { usesExpended: 0, bookmarkedBeastIds: [], primalOrder: null },
                    };
                  }
                  if (cls === 'Cleric' && !updated.clericDevotion) {
                    updated = {
                      ...updated,
                      clericDevotion: { deityId: null, divineOrder: null },
                    };
                  }
                  onUpdate(updated);
                }}
                width="w-32"
              />
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Level</span>
              <div className="flex items-center gap-1.5 border-b border-border">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={levelDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLevelDraft(v);
                    levelDraftRef.current = v;
                    scheduleLevelCommit(v);
                  }}
                  onBlur={() => {
                    if (levelDebounceRef.current) {
                      clearTimeout(levelDebounceRef.current);
                      levelDebounceRef.current = null;
                    }
                    flushLevelDraft();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="font-bold text-lg bg-transparent outline-none w-10"
                />
                {character.level < 20 && (
                  <button
                    onClick={() => setLevelUpOpen(true)}
                    title={`Level up to ${character.level + 1}`}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 mb-0.5 bg-accent text-white rounded-md text-[9px] font-black uppercase tracking-wide hover:bg-accent/80 transition-all"
                  >
                    <TrendingUp size={9} />↑
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Background</span>
              <div className="flex items-center gap-1 border-b border-border">
                <input
                  value={character.background}
                  onChange={(e) => handleBackgroundTextChange(e.target.value)}
                  className="font-bold text-lg bg-transparent outline-none w-24"
                  placeholder="Background"
                />
                <button
                  onClick={() => setBgPickerOpen(true)}
                  className="shrink-0 p-1 text-accent hover:bg-accent/10 rounded-lg transition-all"
                  title="Pick from list"
                >
                  <Search size={14} />
                </button>
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Race</span>
              <div className="flex items-center gap-1 border-b border-border">
                <input
                  value={character.race}
                  onChange={(e) => onUpdate({ ...character, race: e.target.value })}
                  className="font-bold text-lg bg-transparent outline-none w-24"
                  placeholder="Race"
                />
                <button
                  onClick={() => setRacePickerOpen(true)}
                  className="shrink-0 p-1 text-accent hover:bg-accent/10 rounded-lg transition-all"
                  title="Pick from list"
                >
                  <Search size={14} />
                </button>
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Subclass</span>
              {character.level >= 3 ? (
                <CustomSelect
                  value={character.subclass || ''}
                  options={SUBCLASSES[character.class] ?? []}
                  onChange={(sub) => onUpdate({ ...character, subclass: sub })}
                  width="w-36"
                  showSearch={false}
                  placeholder="Pick..."
                />
              ) : (
                <span className="font-bold text-lg text-slate-400 italic border-b border-border py-0.5 whitespace-nowrap">
                  Lvl 3+
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 no-print">
          <div className="hardware-box flex flex-col items-center justify-center min-w-[100px]">
            <span className="text-[10px] font-black uppercase text-muted mb-1">Inspiration</span>
            <input
              type="checkbox"
              checked={character.inspiration}
              onChange={(e) => onUpdate({ ...character, inspiration: e.target.checked })}
              className="w-6 h-6 accent-accent"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl no-print">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => goToTab(tab.id)}
            className={cn(
              "tab-btn flex-1",
              activeTab === tab.id 
                ? "bg-white text-accent shadow-sm" 
                : "text-muted hover:text-ink hover:bg-white/50"
            )}
          >
            <div className="flex items-center gap-2">
              {React.createElement(tab.icon, { size: 16 })}
              <span className="hidden sm:inline">{tab.label}</span>
            </div>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'core' && (
            <motion.div
              key="core"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10"
            >
              <div className="space-y-4">
                {(Object.keys(character.abilities) as Ability[]).map((ability) => (
                  <AbilityScore
                    key={ability}
                    label={ability}
                    ability={ability}
                    score={character.abilities[ability]}
                    onChange={(score) => updateAbility(ability, score)}
                  />
                ))}
              </div>

              <div className="space-y-8">
                <div className="hardware-box grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                      <Award size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-muted">Proficiency</div>
                      <div className="flex items-center">
                        <span className="text-xl font-black text-accent">+</span>
                        <input
                          type="number"
                          value={profBonus}
                          onChange={(e) => onUpdate({ ...character, proficiencyBonus: parseInt(e.target.value) || 0 })}
                          className="text-xl font-black text-accent bg-transparent outline-none w-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                      <Eye size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-muted">Passive Perception</div>
                      <div className="text-xl font-black">{passivePerception}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-muted">Spell Save DC</div>
                      <div className="text-xl font-black tabular-nums">
                        {8 + profBonus + getModifier(character.abilities[character.spellcasting.ability]) + invItemMods.spellSaveDc}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                      <Target size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-muted">Spell Attack</div>
                      <div className="text-xl font-black text-accent tabular-nums">
                        {formatBonus(
                          profBonus +
                            getModifier(character.abilities[character.spellcasting.ability]) +
                            invItemMods.spellAttack,
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                      <Activity size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-muted">Initiative</div>
                      <div className="text-xl font-black">{formatBonus(initiativeTotal)}</div>
                    </div>
                  </div>
                </div>

                {/* Size selector */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Maximize2 size={13} className="text-muted" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Size</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Tiny','Small','Medium','Large','Huge','Gargantuan'].map(s => (
                      <button
                        key={s}
                        onClick={() => onUpdate({ ...character, size: s })}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all',
                          (character.size ?? 'Medium') === s
                            ? 'bg-accent text-white border-accent shadow-sm'
                            : 'bg-transparent text-muted border-border hover:border-accent/50 hover:text-accent'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="section-header flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Award size={18} className="text-accent" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Skills</h3>
                      </div>
                      <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" />
                        <input
                          type="text"
                          placeholder="Search skills..."
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-accent focus:bg-white transition-all w-32 sm:w-48"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const ABILITY_ORDER: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                        const ABILITY_LABELS: Record<Ability, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
                        const indexed = character.skills.map((skill, originalIndex) => ({ ...skill, originalIndex }));
                        const filtered = indexed.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()));
                        if (filtered.length === 0) return (
                          <div className="text-center py-8 text-muted italic text-[10px] font-bold uppercase tracking-widest">No skills found</div>
                        );
                        return ABILITY_ORDER.map((ability) => {
                          const group = filtered.filter(s => s.ability === ability);
                          if (group.length === 0) return null;
                          const mod = getModifier(character.abilities[ability]);
                          return (
                            <div key={ability}>
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">{ABILITY_LABELS[ability]}</span>
                                <span className="text-[9px] font-black text-slate-400">({mod >= 0 ? '+' : ''}{mod})</span>
                                <div className="flex-1 h-px bg-slate-100" />
                              </div>
                              <div className="space-y-0.5">
                                {ability === 'dex' && (
                                  <div className="flex items-center gap-2 py-0.5 group">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdate({
                                          ...character,
                                          initiativeProficient: !character.initiativeProficient,
                                        })
                                      }
                                      title={
                                        character.initiativeProficient
                                          ? 'Remove initiative proficiency'
                                          : 'Add initiative proficiency'
                                      }
                                      className={cn(
                                        'w-3.5 h-3.5 rounded-full border transition-colors shrink-0',
                                        character.initiativeProficient
                                          ? 'bg-accent border-accent'
                                          : 'bg-transparent border-ink/30 hover:border-accent/60',
                                      )}
                                    />
                                    {/* spacer to align with SkillRow's expertise dot */}
                                    <span className="w-3.5 h-3.5 shrink-0" />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      title="Initiative modifier (DEX + proficiency if checked + misc + item bonuses). Edit misc on blur."
                                      value={
                                        initiativeFocused
                                          ? initiativeEditingText
                                          : formatBonus(initiativeTotal)
                                      }
                                      onFocus={() => {
                                        setInitiativeFocused(true);
                                        setInitiativeEditingText(String(character.initiative ?? 0));
                                      }}
                                      onChange={(e) => setInitiativeEditingText(e.target.value)}
                                      onBlur={() => {
                                        setInitiativeFocused(false);
                                        const t = initiativeEditingText
                                          .trim()
                                          .replace(/\u2212/g, '-')
                                          .replace(/^\+/, '');
                                        if (t === '' || t === '-') {
                                          onUpdate({ ...character, initiative: 0 });
                                          setInitiativeEditingText('');
                                          return;
                                        }
                                        const n = parseInt(t, 10);
                                        if (!Number.isNaN(n)) onUpdate({ ...character, initiative: n });
                                        setInitiativeEditingText('');
                                      }}
                                      className={cn(
                                        'w-10 shrink-0 font-mono text-xs text-center tabular-nums rounded border py-0.5 outline-none focus:border-accent',
                                        'border-transparent bg-slate-50/50 text-ink/70 group-hover:border-slate-200 dark:group-hover:border-dark-border',
                                      )}
                                    />
                                    <span className="flex-1 text-xs font-medium truncate">Initiative</span>
                                    <span className="text-[9px] uppercase font-bold text-ink/30 italic shrink-0">dex</span>
                                  </div>
                                )}
                                {group.map((skill) => (
                                  <SkillRow
                                    key={skill.name}
                                    skill={skill}
                                    abilityScore={character.abilities[skill.ability]}
                                    profBonus={profBonus}
                                    itemBonus={invItemMods.skills[skill.name] ?? 0}
                                    onToggle={(prof, exp) => updateSkill(skill.originalIndex, prof, exp)}
                                    onBonusOverrideChange={(v) =>
                                      updateSkillBonusOverride(skill.originalIndex, v)
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="section-header">
                      <Shield size={18} className="text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Saving Throws</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {(Object.keys(character.abilities) as Ability[]).map((ability) => {
                        const isProf = character.proficiencies.includes(ability);
                        const mod = getModifier(character.abilities[ability]);
                        const total = (isProf ? mod + profBonus : mod) + (invItemMods.saves[ability] ?? 0);
                        return (
                          <div key={ability} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  const newProfs = isProf 
                                    ? character.proficiencies.filter(p => p !== ability)
                                    : [...character.proficiencies, ability];
                                  onUpdate({ ...character, proficiencies: newProfs });
                                }}
                                className={cn(
                                  "w-4 h-4 rounded border-2 border-slate-300 transition-all",
                                  isProf ? "bg-accent border-accent" : "bg-white hover:border-accent"
                                )}
                              />
                              <span className="text-[10px] font-black uppercase text-muted">{ability}</span>
                            </div>
                            <span className="font-bold text-lg">{formatBonus(total)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="section-header">
                        <Sword size={18} className="text-accent" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Weapon proficiencies</h3>
                      </div>
                      <p className="text-[10px] text-muted leading-snug">
                        PHB categories — simple vs martial weapons — plus optional specific weapon proficiencies.
                      </p>
                      <WeaponCategoryChipSelect
                        options={PHB_2024_WEAPON_PROFICIENCY_CATEGORIES}
                        selected={weaponCategoryPicks}
                        onChange={(nextCats) => {
                          const cats = new Set<string>(PHB_2024_WEAPON_PROFICIENCY_CATEGORIES);
                          const kept = weaponProfsRaw.filter((p) => !cats.has(p));
                          const merged = Array.from(new Set<string>([...kept, ...nextCats]));
                          onUpdate({ ...character, weaponProficiencies: merged });
                        }}
                        showAdd={false}
                      />
                      <button
                        type="button"
                        onClick={() => setWeaponCategoryOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                          Weapon categories ({weaponCategoryPicks.length})
                        </span>
                        <span className="text-xs font-black text-muted">
                          {weaponCategoryOpen ? '▾' : '▸'}
                        </span>
                      </button>
                      {weaponCategoryOpen && (
                        <WeaponCategoryChipSelect
                          options={PHB_2024_WEAPON_PROFICIENCY_CATEGORIES}
                          selected={weaponCategoryPicks}
                          onChange={(nextCats) => {
                            const cats = new Set<string>(PHB_2024_WEAPON_PROFICIENCY_CATEGORIES);
                            const kept = weaponProfsRaw.filter((p) => !cats.has(p));
                            const merged = Array.from(new Set<string>([...kept, ...nextCats]));
                            onUpdate({ ...character, weaponProficiencies: merged });
                          }}
                          showSelected={false}
                        />
                      )}
                      <WeaponProficiencyChipSelect
                        options={PHB_2024_WEAPON_PROFICIENCY_ALL}
                        selected={weaponSpecificProfs}
                        onChange={(nextSpecific) => {
                          const kept = weaponProfsRaw.filter((p) => !isPhb2024WeaponName(p));
                          const merged = Array.from(new Set<string>([...kept, ...nextSpecific]));
                          onUpdate({ ...character, weaponProficiencies: merged });
                        }}
                        showAdd={false}
                      />
                      <button
                        type="button"
                        onClick={() => setWeaponSpecificOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                          Specific weapons ({weaponSpecificProfs.length})
                        </span>
                        <span className="text-xs font-black text-muted">
                          {weaponSpecificOpen ? '▾' : '▸'}
                        </span>
                      </button>
                      {weaponSpecificOpen && (
                        <WeaponProficiencyChipSelect
                          options={PHB_2024_WEAPON_PROFICIENCY_ALL}
                          selected={weaponSpecificProfs}
                          onChange={(nextSpecific) => {
                            // Preserve any existing non-weapon-name entries (categories, legacy strings, etc.),
                            // and replace only the specific weapon-name picks.
                            const kept = weaponProfsRaw.filter((p) => !isPhb2024WeaponName(p));
                            const merged = Array.from(new Set<string>([...kept, ...nextSpecific]));
                            onUpdate({ ...character, weaponProficiencies: merged });
                          }}
                          showSelected={false}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="section-header">
                        <Layers size={18} className="text-accent" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Armor proficiencies</h3>
                      </div>
                      <p className="text-[10px] text-muted leading-snug">
                        PHB armor training — light, medium, heavy, and shields.
                      </p>
                      <ArmorCategoryChipSelect
                        options={PHB_2024_ARMOR_PROFICIENCY_CATEGORIES}
                        selected={armorProfs}
                        onChange={(nextCats) => {
                          const cats = new Set<string>(PHB_2024_ARMOR_PROFICIENCY_CATEGORIES);
                          const kept = armorProfsRaw.filter((p) => !cats.has(p));
                          const merged = Array.from(new Set<string>([...kept, ...nextCats]));
                          onUpdate({ ...character, armorProficiencies: merged });
                        }}
                        showAdd={false}
                      />
                      <button
                        type="button"
                        onClick={() => setArmorProfsOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                          Armor list ({armorProfs.length})
                        </span>
                        <span className="text-xs font-black text-muted">
                          {armorProfsOpen ? '▾' : '▸'}
                        </span>
                      </button>
                      {armorProfsOpen && (
                        <ArmorCategoryChipSelect
                          options={PHB_2024_ARMOR_PROFICIENCY_CATEGORIES}
                          selected={armorProfs}
                          onChange={(nextCats) => {
                            const cats = new Set<string>(PHB_2024_ARMOR_PROFICIENCY_CATEGORIES);
                            const kept = armorProfsRaw.filter((p) => !cats.has(p));
                            const merged = Array.from(new Set<string>([...kept, ...nextCats]));
                            onUpdate({ ...character, armorProficiencies: merged });
                          }}
                          showSelected={false}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="section-header">
                        <Wrench size={18} className="text-accent" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Tool proficiencies</h3>
                      </div>
                      <p className="text-[10px] text-muted leading-snug">
                        Search the PHB tool list, then tap <span className="font-black">+ name</span> to add. Selected tools appear as chips (tap × to remove).
                      </p>
                      <ToolProficiencyChipSelect
                        options={PHB_2024_TOOL_PROFICIENCY_ALL}
                        selected={toolProfs}
                        onChange={(next) => onUpdate({ ...character, toolProficiencies: next })}
                        showAdd={false}
                      />
                      <button
                        type="button"
                        onClick={() => setToolProfsOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                          Tool list ({toolProfs.length})
                        </span>
                        <span className="text-xs font-black text-muted">
                          {toolProfsOpen ? '▾' : '▸'}
                        </span>
                      </button>
                      {toolProfsOpen && (
                        <ToolProficiencyChipSelect
                          options={PHB_2024_TOOL_PROFICIENCY_ALL}
                          selected={toolProfs}
                          onChange={(next) => onUpdate({ ...character, toolProficiencies: next })}
                          showSelected={false}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'combat' && (
            <motion.div
              key="combat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* Combat HUD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="hardware-box relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-4">Armor Class</div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={character.ac}
                        onChange={(e) => onUpdate({ ...character, ac: parseInt(e.target.value) || 0 })}
                        className="text-6xl font-black bg-transparent outline-none w-24"
                      />
                      {invItemMods.ac !== 0 ? (
                        <div className="flex flex-col gap-0.5 text-xs font-black tabular-nums leading-tight">
                          <span className="text-accent">→ {character.ac + invItemMods.ac}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wide text-muted">
                            effective (items {formatBonus(invItemMods.ac)})
                          </span>
                        </div>
                      ) : null}
                      <div className="text-xs text-muted font-medium leading-tight">
                        {(() => {
                          const armor = ARMOR_LIST.find(a => a.name === character.equippedArmor);
                          const shield = character.equippedShield ? ' + Shield' : '';
                          if (!armor) return <>Base 10 + <br /> Dex Mod{shield}</>;
                          if (armor.dexBonus === 'full')  return <>{armor.name} ({armor.acBase}) <br /> + Dex{shield}</>;
                          if (armor.dexBonus === 'max2')  return <>{armor.name} ({armor.acBase}) <br /> + Dex (max +2){shield}</>;
                          return <>{armor.name} ({armor.acBase})<br />No Dex{shield}</>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hardware-box relative overflow-hidden group bg-accent/5 border-accent/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-accent">
                    <Heart size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">Hit Points</div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={character.hp.current}
                        onChange={(e) => onUpdate({ ...character, hp: { ...character.hp, current: parseInt(e.target.value) || 0 } })}
                        className="text-6xl font-black bg-transparent outline-none w-24 text-accent"
                      />
                      <div className="text-2xl font-black text-accent/40">/</div>
                      <input
                        type="number"
                        value={character.hp.max}
                        onChange={(e) => onUpdate({ ...character, hp: { ...character.hp, max: parseInt(e.target.value) || 0 } })}
                        className="text-3xl font-black bg-transparent outline-none w-16 text-accent/60"
                      />
                    </div>
                  </div>
                </div>

                <div className="hardware-box relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wind size={80} />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Speed</div>
                    <div className="text-[9px] font-bold text-muted/80 uppercase tracking-wide mb-2">
                      Walking (worn armor)
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-6xl font-black tabular-nums tracking-tight min-w-[4.5rem]">
                        {walkingSpeed.effective + invItemMods.speed}
                      </div>
                      <div className="text-xl font-black text-muted">FT.</div>
                    </div>
                    {invItemMods.speed !== 0 ? (
                      <p className="text-[10px] font-bold text-muted mt-1 leading-snug">
                        Includes special items {formatBonus(invItemMods.speed)} ft.; armor-adjusted base{' '}
                        {walkingSpeed.effective} ft.
                      </p>
                    ) : null}
                    {walkingSpeed.penalty > 0 && walkingSpeed.strReq != null ? (
                      <p className="text-[10px] font-bold text-amber-800 mt-2 leading-snug">
                        −{HEAVY_ARMOR_STR_SPEED_PENALTY_FT} ft. from heavy armor (Str {character.abilities.str}; requires{' '}
                        {walkingSpeed.strReq})
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <span className="font-black uppercase tracking-wide shrink-0">Normal speed</span>
                      <input
                        value={character.speed}
                        onChange={(e) => onUpdate({ ...character, speed: e.target.value })}
                        className="font-bold bg-white/60 dark:bg-black/20 border border-border rounded-lg px-2 py-1 min-w-[4rem] outline-none focus:border-accent"
                        title="Racial or usual speed before heavy-armor penalty"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="stat-card space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <Sword size={18} className="text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Attacks & Weapons</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const newWeapon = {
                          id: Math.random().toString(36).substr(2, 9),
                          name: 'New Weapon',
                          proficient: true,
                          damageDice: '1d8',
                          damageType: '',
                          bonus: 0,
                          properties: '',
                          attackAbility: 'str' as Ability,
                        };
                        onUpdate({ ...character, weapons: [...(character.weapons || []), newWeapon] });
                      }}
                      className="p-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {(character.weapons || []).map((weapon, idx) => (
                      <WeaponRow
                        key={weapon.id}
                        weapon={weapon}
                        abilities={character.abilities}
                        profBonus={profBonus}
                        onUpdate={(updatedWeapon) => {
                          const newWeapons = [...(character.weapons || [])];
                          newWeapons[idx] = updatedWeapon;
                          onUpdate({ ...character, weapons: newWeapons });
                        }}
                        onDelete={() => {
                          const newWeapons = character.weapons?.filter(w => w.id !== weapon.id);
                          onUpdate({ ...character, weapons: newWeapons });
                        }}
                      />
                    ))}
                    {(character.weapons || []).length === 0 && (
                      <div className="text-center py-12 text-muted italic text-xs">No weapons added yet. Click + to add one.</div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="stat-card">
                    <div className="section-header">
                      <Activity size={18} className="text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Hit Dice & Death Saves</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-muted">Hit Dice</span>
                        <div className="flex items-center gap-2">
                          <input
                            value={character.hitDice.total}
                            onChange={(e) => onUpdate({ ...character, hitDice: { ...character.hitDice, total: e.target.value } })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-accent"
                          />
                          <input
                            type="number"
                            value={character.hitDice.remaining}
                            onChange={(e) => onUpdate({ ...character, hitDice: { ...character.hitDice, remaining: parseInt(e.target.value) || 0 } })}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-accent text-center"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-muted">Death Saves</span>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold uppercase text-green-600">Success</span>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(i => (
                                <button
                                  key={i}
                                  onClick={() => onUpdate({ ...character, deathSaves: { ...character.deathSaves, successes: i === character.deathSaves.successes ? i - 1 : i } })}
                                  className={cn(
                                    "w-4 h-4 rounded-full border-2 transition-all",
                                    i <= character.deathSaves.successes ? "bg-green-500 border-green-500" : "border-slate-200"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold uppercase text-red-600">Failure</span>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(i => (
                                <button
                                  key={i}
                                  onClick={() => onUpdate({ ...character, deathSaves: { ...character.deathSaves, failures: i === character.deathSaves.failures ? i - 1 : i } })}
                                  className={cn(
                                    "w-4 h-4 rounded-full border-2 transition-all",
                                    i <= character.deathSaves.failures ? "bg-red-500 border-red-500" : "border-slate-200"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="section-header">
                      <AlertCircle size={18} className="text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Conditions & Exhaustion</h3>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                        {CONDITIONS.map(condition => (
                          <label key={condition} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={character.conditions?.includes(condition)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const currentConditions = character.conditions || [];
                                const newConditions = checked 
                                  ? [...currentConditions, condition]
                                  : currentConditions.filter(c => c !== condition);
                                onUpdate({ ...character, conditions: newConditions });
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-accent focus:ring-accent accent-accent"
                            />
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-tight transition-colors",
                              character.conditions?.includes(condition) ? "text-accent" : "text-slate-400 group-hover:text-slate-600"
                            )}>
                              {condition}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[80px]">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted mb-2">Exhaustion</span>
                        <input
                          type="number"
                          min="0"
                          max="6"
                          value={character.exhaustion || 0}
                          onChange={(e) => onUpdate({ ...character, exhaustion: parseInt(e.target.value) || 0 })}
                          className="w-12 text-center text-xl font-black bg-transparent outline-none focus:text-accent"
                        />
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Level</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="section-header">
                      <Layers size={18} className="text-accent" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Damage defenses</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">Resistances</div>
                        <DamageTypeChipSelect
                          selected={character.damageResistances ?? []}
                          onChange={(next) => onUpdate({ ...character, damageResistances: next })}
                          placeholder="Search damage types to resist…"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">Vulnerabilities</div>
                        <DamageTypeChipSelect
                          selected={character.damageVulnerabilities ?? []}
                          onChange={(next) => onUpdate({ ...character, damageVulnerabilities: next })}
                          placeholder="Search damage types to be vulnerable to…"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">Immunities</div>
                        <DamageTypeChipSelect
                          selected={character.damageImmunities ?? []}
                          onChange={(next) => onUpdate({ ...character, damageImmunities: next })}
                          placeholder="Search damage types to be immune to…"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="stat-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-start gap-3">
                    <Zap size={18} className="text-accent shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">Ability uses</h3>
                      <p className="text-[10px] text-muted mt-1 max-w-xl leading-relaxed">
                        Track limited-use features (e.g. Second Wind, Action Surge). Set a name and max uses, spend with −, recover one with +, or reset to full after a rest.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const id = Math.random().toString(36).substr(2, 9);
                      onUpdate({
                        ...character,
                        abilityUses: [
                          ...(character.abilityUses ?? []),
                          { id, name: 'New ability', max: 1, remaining: 1 },
                        ],
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center text-[10px] font-black uppercase tracking-widest text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent/5 px-3 py-2 rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                <div className="space-y-3">
                  {(character.abilityUses ?? []).map((track, idx) => {
                    const list = character.abilityUses ?? [];
                    const patch = (next: typeof track) => {
                      const abilityUses = [...list];
                      abilityUses[idx] = next;
                      onUpdate({ ...character, abilityUses });
                    };
                    const remove = () => {
                      onUpdate({
                        ...character,
                        abilityUses: list.filter((_, i) => i !== idx),
                      });
                    };
                    return (
                      <div
                        key={track.id}
                        className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <input
                          value={track.name}
                          onChange={(e) => patch({ ...track, name: e.target.value })}
                          className="flex-1 min-w-0 font-black text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                          placeholder="Ability name"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-muted whitespace-nowrap">Max</span>
                            <input
                              type="number"
                              min={0}
                              value={track.max}
                              onChange={(e) => {
                                const max = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                patch({
                                  ...track,
                                  max,
                                  remaining: Math.min(max, Math.max(0, track.remaining)),
                                });
                              }}
                              className="w-14 text-center font-black text-sm bg-white border border-slate-200 rounded-lg py-2 outline-none focus:border-accent"
                            />
                          </div>
                          <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white px-1 py-1">
                            <button
                              type="button"
                              title="Spend one use"
                              onClick={() =>
                                patch({ ...track, remaining: Math.max(0, track.remaining - 1) })
                              }
                              disabled={track.remaining <= 0}
                              className="p-2 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="min-w-[4.5rem] text-center font-black text-lg tabular-nums text-slate-800 px-1">
                              {track.remaining}
                              <span className="text-slate-400 font-bold text-sm"> / {track.max}</span>
                            </span>
                            <button
                              type="button"
                              title="Recover one use"
                              onClick={() =>
                                patch({
                                  ...track,
                                  remaining: Math.min(track.max, track.remaining + 1),
                                })
                              }
                              disabled={track.remaining >= track.max}
                              className="p-2 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <button
                            type="button"
                            title="Reset to full (after rest)"
                            onClick={() => patch({ ...track, remaining: track.max })}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent border border-accent/30 hover:bg-accent/10 px-3 py-2 rounded-lg transition-colors"
                          >
                            <RotateCcw size={14} />
                            Reset
                          </button>
                          <button
                            type="button"
                            title="Remove"
                            onClick={remove}
                            className="p-2 text-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(character.abilityUses ?? []).length === 0 && (
                    <div className="text-center py-10 text-muted italic text-xs border border-dashed border-slate-200 rounded-xl">
                      No ability uses yet. Click <span className="font-bold not-italic text-slate-500">Add</span> for Second Wind, Channel Divinity, or anything else.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'spells' && (
            <motion.div
              key="spells"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="stat-card space-y-4">
                <div className="section-header">
                  <Sparkles size={18} className="text-accent" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest">Spellcasting ability</h3>
                    <p className="text-[10px] text-muted mt-0.5 font-normal normal-case tracking-normal">
                      Spell save DC, spell attack bonus, and prepared-spell limits use this ability.
                    </p>
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">
                    Ability
                  </label>
                  <CustomSelect
                    showSearch={false}
                    width="w-full"
                    variant="field"
                    value={ABILITIES.find((a) => a.id === character.spellcasting.ability)?.label ?? ''}
                    options={ABILITIES.map((a) => a.label)}
                    placeholder="Choose ability…"
                    onChange={(label) => {
                      const id = ABILITIES.find((a) => a.label === label)?.id;
                      if (!id) return;
                      onUpdate({
                        ...character,
                        spellcasting: { ...character.spellcasting, ability: id as Ability },
                      });
                    }}
                  />
                </div>
              </div>

              {/* All Spell Slots Container */}
              <div className="stat-card space-y-4">
                <div className="text-center border-b border-slate-200 pb-2 mb-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em]">Spell Slots</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                  {/* Vertical Dividers for Desktop */}
                  <div className="hidden md:block absolute left-1/3 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="hidden md:block absolute left-2/3 top-0 bottom-0 w-px bg-slate-200" />

                  {[
                    [1, 2, 3],
                    [4, 5, 6],
                    [7, 8, 9]
                  ].map((columnLevels, colIdx) => (
                    <div key={colIdx} className="space-y-4">
                      {/* Column Header */}
                      <div className="grid grid-cols-[1fr_40px_1fr] gap-4 items-end px-2">
                        <div />
                        <span className="text-[8px] font-black uppercase text-slate-400 text-center">Total</span>
                        <span className="text-[8px] font-black uppercase text-slate-400">Expended</span>
                      </div>

                      {/* Level Rows */}
                      <div className="space-y-3">
                        {columnLevels.map((level) => {
                          const cap = maxSpellSlotTrackerSlots(level);
                          const raw = character.spellcasting.slots[level] ?? { total: 0, expended: 0 };
                          const total = Math.min(Math.max(raw.total, 0), cap);
                          const expended = raw.expended & ((1 << total) - 1);
                          return (
                            <div key={level} className="grid grid-cols-[1fr_40px_1fr] gap-4 items-center px-2">
                              <span className="text-[10px] font-black uppercase text-slate-600 whitespace-nowrap">Level {level}</span>
                              
                              <div className="relative h-8 w-10">
                                <input
                                  type="number"
                                  min="0"
                                  max={cap}
                                  value={total}
                                  onChange={(e) => updateSpellSlot(level, parseInt(e.target.value) || 0, raw.expended)}
                                  className="w-full h-full bg-blue-50/50 border-b border-slate-300 text-center font-black text-xs outline-none focus:border-accent transition-colors no-print"
                                />
                                <span className="absolute inset-0 flex items-center justify-center font-black text-xs print:block hidden">{total}</span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {Array.from({ length: Math.max(total, 0) }).map((_, i) => {
                                  const isExpended = (expended & (1 << i)) !== 0;
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => updateSpellSlot(level, raw.total, raw.expended ^ (1 << i))}
                                      className={cn(
                                        "w-4 h-4 border-2 rotate-45 transition-all flex items-center justify-center shrink-0",
                                        isExpended
                                          ? "bg-white border-accent shadow-sm"
                                          : "bg-slate-50 border-slate-300"
                                      )}
                                    >
                                      {isExpended && (
                                        <div className="w-1.5 h-1.5 bg-accent rounded-sm" />
                                      )}
                                    </button>
                                  );
                                })}
                                {total === 0 && <div className="h-4" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spell budget: class table + feat/subclass extras; exempt rows don’t count toward caps */}
              {(() => {
                const spellAb = character.spellcasting.ability as Ability;
                const spellMod = getModifier(character.abilities[spellAb]);
                const cls = character.class;
                const nonCasters = ['Barbarian', 'Fighter', 'Monk', 'Rogue'];
                if (nonCasters.includes(cls)) return null;
                const b = getSpellBudgetSummary(character);
                const cantripCap = b.cantripCapTotal;
                const cantripsTotal = character.spellcasting.spells.filter((sp) => sp.level === 0).length;
                const cantripOver =
                  cantripCap != null &&
                  cantripCap > 0 &&
                  b.cantripsCountingTowardCap > cantripCap;
                const cantripOk =
                  cantripCap != null &&
                  cantripCap > 0 &&
                  b.cantripsCountingTowardCap === cantripCap;
                const prepCap = b.preparedCap;
                const prepOver =
                  prepCap != null && b.discretionaryPrepared > prepCap;
                const prepOk =
                  prepCap != null && b.discretionaryPrepared === prepCap;
                const cantripTitle =
                  b.cantripCapBonus > 0 && b.cantripCapBase != null
                    ? `Class cantrips ${b.cantripCapBase} + extras ${b.cantripCapBonus} (feats / subclass). Rows marked exempt don’t count toward the cap.`
                    : b.cantripsExemptOnSheet > 0
                      ? `${b.cantripsExemptOnSheet} cantrip(s) marked exempt — not counted toward your class cantrip limit.`
                      : undefined;
                const prepTitle =
                  prepCap != null
                    ? [
                        `${b.discretionaryPrepared}/${prepCap} counts toward your class prepared limit (PHB table).`,
                        b.preparedSubclassExemptBonus > 0
                          ? ` Subclass features allow up to ${b.preparedSubclassExemptBonus} more prepared spell(s) that don’t count toward that limit (e.g. Acolyte of Nature) — toggle Extra (exempt) on those spell rows.`
                          : '',
                        b.preparedExemptBonusHint > b.preparedSubclassExemptBonus
                          ? ` Feats and other sources can add more; full hint total up to ${b.preparedTotalMaxHint ?? prepCap} prepared rows including exempt.`
                          : '',
                        b.exemptPreparedOnSheet > 0
                          ? ` You have ${b.exemptPreparedOnSheet} level 1+ spell(s) marked exempt on this sheet.`
                          : '',
                      ].join('')
                    : undefined;
                const cantripLabel =
                  cantripCap != null && cantripCap > 0
                    ? `${b.cantripsCountingTowardCap}/${cantripCap} cantrips`
                    : `${cantripsTotal} cantrip${cantripsTotal !== 1 ? 's' : ''}`;
                return (
                  <div className="flex flex-col gap-1 px-1 py-2 text-[10px] font-bold text-muted">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        title={cantripTitle}
                        className={
                          cantripOver
                            ? 'text-red-500 font-black'
                            : cantripOk
                              ? 'text-emerald-600 font-black'
                              : ''
                        }
                      >
                        {cantripLabel}
                        {b.cantripsExemptOnSheet > 0 && (
                          <span className="font-normal text-slate-400 ml-1">
                            (+{b.cantripsExemptOnSheet} exempt)
                          </span>
                        )}
                      </span>
                      <span className="text-slate-200">·</span>
                      {prepCap != null ? (
                        <span
                          title={prepTitle}
                          className={
                            prepOver
                              ? 'text-red-500 font-black'
                              : prepOk
                                ? 'text-emerald-600 font-black'
                                : ''
                          }
                        >
                          {b.discretionaryPrepared}/{prepCap}
                          {b.preparedSubclassExemptBonus > 0 && (
                            <span className="font-normal text-violet-700/90 ml-1">
                              · +{b.preparedSubclassExemptBonus} exempt
                            </span>
                          )}{' '}
                          prepared
                          {b.exemptPreparedOnSheet > 0 && (
                            <span className="font-normal text-slate-400 ml-1">
                              ({b.exemptPreparedOnSheet} marked exempt)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Prepared —</span>
                      )}
                      <span className="text-slate-200">·</span>
                      <span className="italic font-normal">
                        Spellcasting: {spellAb.toUpperCase()} (mod {spellMod >= 0 ? '+' : ''}
                        {spellMod})
                      </span>
                    </div>
                    {(b.cantripCapBonus > 0 || b.preparedExemptBonusHint > 0) && (
                      <p className="text-[9px] font-normal text-slate-400 leading-snug max-w-2xl">
                        {b.cantripCapBonus > 0 && (
                          <>
                            {b.cantripCapBase != null ? (
                              <>
                                Cantrips: class {b.cantripCapBase} + extras {b.cantripCapBonus}.{' '}
                              </>
                            ) : (
                              <>
                                Cantrips: {b.cantripCapBonus} from feats or fighting styles (no class
                                cantrip column).{' '}
                              </>
                            )}
                          </>
                        )}
                        {b.preparedExemptBonusHint > 0 && (
                          <>
                            Feats/subclass can add up to {b.preparedExemptBonusHint} always-prepared
                            spell
                            {b.preparedExemptBonusHint !== 1 ? 's' : ''} beyond your cap — use
                            <span className="font-black"> Extra (exempt) </span>
                            on a spell row or rely on Magic Initiate / free-cast rows.
                          </>
                        )}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Spell Level Tabs + From List button in same row */}
              <div className="flex items-center gap-2 no-print">
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl flex-1">
                <button
                  onClick={() => setActiveSpellLevel(-1)}
                  className={cn(
                    "flex-1 min-w-[48px] py-2 text-xs font-black uppercase tracking-tighter rounded-lg transition-all",
                    activeSpellLevel === -1 ? "bg-accent text-white shadow-md" : "text-muted hover:bg-white/50"
                  )}
                >All</button>
                <button
                  onClick={() => setActiveSpellLevel(0)}
                  className={cn(
                    "flex-1 min-w-[48px] py-2 text-xs font-black uppercase tracking-tighter rounded-lg transition-all",
                    activeSpellLevel === 0 ? "bg-accent text-white shadow-md" : "text-muted hover:bg-white/50"
                  )}
                >Cantrips</button>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActiveSpellLevel(level)}
                    className={cn(
                      "flex-1 min-w-[48px] py-2 text-xs font-black uppercase tracking-tighter rounded-lg transition-all",
                      activeSpellLevel === level ? "bg-accent text-white shadow-md" : "text-muted hover:bg-white/50"
                    )}
                  >{level}</button>
                ))}
                </div>
                <button
                  onClick={() => { setSpellPickerLevel(Math.max(activeSpellLevel, 0)); setSpellPickerOpen(true); }}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 border border-accent/30 hover:border-accent/60 px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  <Search size={12} /> Add Spell
                </button>
              </div>

              {/* Spell Content */}
              <div className="space-y-6">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  {activeSpellLevel >= 0 ? (
                    /* Single level (Cantrips = 0, or level 1-9) */
                    <div className={cn("grid grid-cols-1", compactSpells ? "gap-1" : "gap-4")}>
                      <div className="flex items-center justify-between px-2 mb-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted">
                          {activeSpellLevel === 0 ? 'Cantrips' : `Level ${activeSpellLevel} Spells`}
                        </h3>
                        <button
                          onClick={() => addSpell(activeSpellLevel)}
                          className="flex items-center justify-center w-6 h-6 rounded-lg border border-accent/30 hover:border-accent/60 text-accent hover:text-accent/80 transition-colors"
                          title="Add empty spell"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <SortableContext
                        items={character.spellcasting.spells.filter(s => s.level === activeSpellLevel).map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {character.spellcasting.spells
                          .filter(s => s.level === activeSpellLevel)
                          .map(spell => (
                            <SpellRow
                              key={spell.id}
                              spell={spell}
                              onUpdate={(s) => updateSpell(spell.id, s)}
                              onDelete={() => deleteSpell(spell.id)}
                              compact={compactSpells}
                            />
                          ))}
                      </SortableContext>
                      {character.spellcasting.spells.filter(s => s.level === activeSpellLevel).length === 0 && (
                        <div className={cn(
                          "text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-muted italic",
                          compactSpells ? "py-2 text-xs" : "py-12 text-sm"
                        )}>
                          No {activeSpellLevel === 0 ? 'cantrips' : `Level ${activeSpellLevel} spells`} recorded
                        </div>
                      )}
                    </div>
                  ) : (
                    /* All view — cantrips first, then levels 1–9 */
                    <div className={compactSpells ? "space-y-3" : "space-y-12"}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                        const levelSpells = character.spellcasting.spells.filter(s => s.level === level);
                        const label = level === 0 ? 'Cantrips' : `Level ${level}`;
                        return (
                          <div key={level} className={compactSpells ? "space-y-1" : "space-y-4"}>
                            <div className="flex items-center justify-between px-2">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="h-px w-8 bg-slate-200" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">
                                  {label}
                                </h3>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                              <button
                                onClick={() => addSpell(level)}
                                className="ml-4 flex items-center justify-center w-6 h-6 rounded-lg border border-accent/30 hover:border-accent/60 text-accent hover:text-accent/80 transition-colors shrink-0"
                                title="Add empty spell"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <div className={cn("grid grid-cols-1", compactSpells ? "gap-1" : "gap-4")}>
                              {levelSpells.length > 0 ? (
                                <SortableContext items={levelSpells.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                  {levelSpells.map(spell => (
                                    <SpellRow
                                      key={spell.id}
                                      spell={spell}
                                      onUpdate={(s) => updateSpell(spell.id, s)}
                                      onDelete={() => deleteSpell(spell.id)}
                                      compact={compactSpells}
                                    />
                                  ))}
                                </SortableContext>
                              ) : (
                                <div className={cn(
                                  "text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-300 font-black uppercase tracking-widest",
                                  compactSpells ? "py-1 text-[8px]" : "py-6 text-[10px]"
                                )}>
                                  Empty
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DndContext>
              </div>
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFeaturesSubTab('class')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all',
                    featuresSubTab === 'class'
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-accent/40',
                  )}
                >
                  <Award size={16} className={featuresSubTab === 'class' ? 'text-white' : 'text-slate-400'} />
                  Class Features
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturesSubTab('subclass')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all',
                    featuresSubTab === 'subclass'
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-accent/40',
                  )}
                >
                  <Library size={16} className={featuresSubTab === 'subclass' ? 'text-white' : 'text-slate-400'} />
                  Subclass Features
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturesSubTab('traits')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all',
                    featuresSubTab === 'traits'
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-accent/40',
                  )}
                >
                  <Sparkles size={16} className={featuresSubTab === 'traits' ? 'text-white' : 'text-slate-400'} />
                  Traits & Feats
                </button>
              </div>

              {featuresSubTab === 'class' && (
              <div className="stat-card space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <Award size={18} className="text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Class Features</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeatPickerTarget('classFeatures');
                        setFeatPickerCategory('Class Feature');
                        setFeatPickerOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors border border-accent/30 hover:border-accent/60 px-2.5 py-1 rounded-lg"
                    >
                      <Search size={12} />
                      From List
                    </button>
                    <button
                      type="button"
                      onClick={sortClassFeaturesByLevel}
                      disabled={(character.classFeatures || []).length < 2}
                      title="Order rows by class level (Lv. tags from level-up or “From list” class summary). Rows without a level stay at the bottom."
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 hover:border-slate-300 px-2.5 py-1 rounded-lg disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ListOrdered size={12} />
                      By level
                    </button>
                    <button 
                      onClick={() => {
                        const newFeature = { id: Math.random().toString(36).substr(2, 9), name: 'New Feature', description: '' };
                        onUpdate({ ...character, classFeatures: [...(character.classFeatures || []), newFeature] });
                      }}
                      className="p-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleClassFeaturesDragEnd}>
                    <SortableContext
                      items={(character.classFeatures || []).map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-4">
                      {(character.classFeatures || []).map((feature) => (
                        <SortableFeatureCard
                          key={feature.id}
                          feature={feature}
                          namePlaceholder="Feature Name"
                          descPlaceholder="Feature description..."
                          allowAcquiredLevel
                          onUpdate={(patch) => {
                            const list = [...(character.classFeatures || [])];
                            const i = list.findIndex((f) => f.id === feature.id);
                            if (i === -1) return;
                            list[i] = { ...list[i], ...patch };
                            onUpdate({ ...character, classFeatures: list });
                          }}
                          onDelete={() => {
                            const newFeatures = (character.classFeatures || []).filter((f) => f.id !== feature.id);
                            onUpdate({ ...character, classFeatures: newFeatures });
                          }}
                        />
                      ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {(character.classFeatures || []).length === 0 && (
                    <div className="text-center py-12 text-muted italic text-xs">No class features added yet.</div>
                  )}
                </div>
              </div>
              )}

              {featuresSubTab === 'subclass' && (
              <div className="stat-card space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <Library size={18} className="text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Subclass Features</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeatPickerTarget('subclassFeatures');
                        setFeatPickerCategory('Subclass Feature');
                        setFeatPickerOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors border border-accent/30 hover:border-accent/60 px-2.5 py-1 rounded-lg"
                    >
                      <Search size={12} />
                      From List
                    </button>
                    <button
                      type="button"
                      onClick={sortSubclassFeaturesByLevel}
                      disabled={(character.subclassFeatures || []).length < 2}
                      title="Order rows by subclass level (from PHB list or Lv. field)."
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 hover:border-slate-300 px-2.5 py-1 rounded-lg disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ListOrdered size={12} />
                      By level
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newFeature = {
                          id: Math.random().toString(36).substr(2, 9),
                          name: 'New Subclass Feature',
                          description: '',
                        };
                        onUpdate({
                          ...character,
                          subclassFeatures: [...(character.subclassFeatures || []), newFeature],
                        });
                      }}
                      className="p-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSubclassFeaturesDragEnd}
                  >
                    <SortableContext
                      items={(character.subclassFeatures || []).map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-4">
                        {(character.subclassFeatures || []).map((feature) => (
                          <SortableFeatureCard
                            key={feature.id}
                            feature={feature}
                            namePlaceholder="Subclass feature name"
                            descPlaceholder="Subclass feature description..."
                            allowAcquiredLevel
                            onUpdate={(patch) => {
                              const list = [...(character.subclassFeatures || [])];
                              const i = list.findIndex((f) => f.id === feature.id);
                              if (i === -1) return;
                              list[i] = { ...list[i], ...patch };
                              onUpdate({ ...character, subclassFeatures: list });
                            }}
                            onDelete={() => {
                              const newFeatures = (character.subclassFeatures || []).filter(
                                (f) => f.id !== feature.id,
                              );
                              onUpdate({ ...character, subclassFeatures: newFeatures });
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {(character.subclassFeatures || []).length === 0 && (
                    <div className="text-center py-12 text-muted italic text-xs">
                      No subclass features added yet.
                    </div>
                  )}
                </div>
              </div>
              )}

              {featuresSubTab === 'traits' && (
              <div className="stat-card space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Traits & Feats</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setFeatPickerTarget('racialTraits'); setFeatPickerCategory('Feat'); setFeatPickerOpen(true); }}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors border border-accent/30 hover:border-accent/60 px-2.5 py-1 rounded-lg"
                    >
                      <Search size={12} />
                      From List
                    </button>
                    <button 
                      onClick={() => {
                        const newTrait = { id: Math.random().toString(36).substr(2, 9), name: 'New Trait', description: '' };
                        onUpdate({ ...character, racialTraits: [...(character.racialTraits || []), newTrait] });
                      }}
                      className="p-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRacialTraitsDragEnd}>
                    <SortableContext
                      items={(character.racialTraits || []).map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-4">
                      {(character.racialTraits || []).map((trait) => (
                        <SortableFeatureCard
                          key={trait.id}
                          feature={trait}
                          namePlaceholder="Trait/Feat Name"
                          descPlaceholder="Trait description..."
                          onUpdate={(patch) => {
                            const list = [...(character.racialTraits || [])];
                            const i = list.findIndex((t) => t.id === trait.id);
                            if (i === -1) return;
                            list[i] = { ...list[i], ...patch };
                            onUpdate({ ...character, racialTraits: list });
                          }}
                          onDelete={() => {
                            const newTraits = (character.racialTraits || []).filter((t) => t.id !== trait.id);
                            onUpdate({ ...character, racialTraits: newTraits });
                          }}
                        />
                      ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {(character.racialTraits || []).length === 0 && (
                    <div className="text-center py-12 text-muted italic text-xs">No racial traits or feats added yet.</div>
                  )}
                </div>
              </div>
              )}
            </motion.div>
          )}

          {activeTab === 'wildshape' && (
            <motion.div
              key="wildshape"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WildShapeTab character={character} onUpdate={onUpdate} />
            </motion.div>
          )}

          {activeTab === 'faith' && (
            <motion.div
              key="faith"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ClericDevotionTab character={character} onUpdate={onUpdate} />
            </motion.div>
          )}

          {activeTab === 'companions' && (
            <motion.div
              key="companions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CompanionTab character={character} onUpdate={onUpdate} />
            </motion.div>
          )}

          {activeTab === 'bio' && (
            <motion.div
              key="bio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8"
            >
              <div className="space-y-6 md:space-y-8">
                <div className="stat-card space-y-6">
                  <div className="section-header flex-wrap justify-between gap-y-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Backpack size={18} className="text-accent shrink-0" />
                      <h3 className="text-xs font-black uppercase tracking-widest">Equipment & Inventory</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShopOpen(true)}
                      className="flex items-center gap-1.5 shrink-0 text-[10px] font-black uppercase tracking-widest text-accent border border-accent/30 hover:bg-accent/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Store size={14} /> Shop
                    </button>
                  </div>

                  {/* Equipped Armor */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Shield size={16} className="text-accent shrink-0" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">Equipped Armor</div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {character.equippedArmor || 'Unarmored'}
                          {character.equippedShield ? ' + Shield' : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setArmorPickerOpen(true)}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Search size={11} /> Change
                    </button>
                  </div>

                  <textarea
                    value={character.inventory}
                    onChange={(e) => onUpdate({ ...character, inventory: e.target.value })}
                    placeholder="List your gear, weapons, and magical artifacts..."
                    className="w-full min-h-[280px] h-[380px] bg-slate-50 border border-slate-200 rounded-xl p-6 font-mono text-sm outline-none focus:border-accent resize-y leading-relaxed"
                  />
                </div>

                <div className="stat-card space-y-6">
                  <div className="section-header flex-wrap justify-between gap-y-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles size={18} className="text-accent shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-xs font-black uppercase tracking-widest">Special items</h3>
                        <p className="text-[10px] text-muted mt-0.5 font-normal normal-case tracking-normal">
                          Card-style gear with optional sheet bonuses (skills, saves, AC, initiative, spells, speed).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const id = Math.random().toString(36).substr(2, 9);
                        onUpdate({
                          ...character,
                          specialInventoryItems: [
                            ...(character.specialInventoryItems ?? []),
                            { id, name: 'New item', imageUrl: '', description: '' },
                          ],
                        });
                      }}
                      className="flex items-center gap-1 shrink-0 text-[10px] font-black uppercase tracking-widest text-accent border border-accent/30 hover:bg-accent/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add card
                    </button>
                  </div>
                  {(character.specialInventoryItems ?? []).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[min(70vh,520px)] overflow-y-auto custom-scrollbar pr-1 pb-1">
                      {(character.specialInventoryItems ?? []).map((it, idx) => (
                        <div key={it.id} className="contents">
                          <SpecialInventoryItemCard
                            item={it}
                            skillNames={skillNamesForSpecialItems}
                            onChange={(next) => {
                              const list = [...(character.specialInventoryItems ?? [])];
                              list[idx] = next;
                              onUpdate({ ...character, specialInventoryItems: list });
                            }}
                            onRemove={() => {
                              onUpdate({
                                ...character,
                                specialInventoryItems: (character.specialInventoryItems ?? []).filter((_, i) => i !== idx),
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-[11px] text-muted italic">
                      No special item cards yet. Use <span className="font-bold not-italic text-slate-500">Add card</span> for artifacts with art.
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-8">
                <div className="stat-card">
                  <div className="section-header">
                    <Zap size={18} className="text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-widest">Currency</h3>
                  </div>
                  <div className="space-y-4">
                    {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((key) => {
                      const label = key.toUpperCase();
                      const raw = character.currency?.[key];
                      const n = typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0;
                      return (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-black uppercase text-muted">{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={n}
                            onChange={(e) => {
                              const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              onUpdate({
                                ...character,
                                currency: { ...character.currency, [key]: v },
                              });
                            }}
                            className="w-20 text-right font-bold bg-transparent outline-none focus:text-accent"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'lore' && (
            <motion.div
              key="lore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 max-w-3xl"
            >
              <div className="stat-card space-y-6">
                <div className="section-header">
                  <BookOpen size={18} className="text-accent" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest">Lore &amp; identity</h3>
                    <p className="text-[10px] text-muted mt-0.5">Alignment, mechanical background, and narrative backstory stay on this tab so the header stays compact.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Alignment</span>
                  <CustomSelect
                    value={character.alignment || ''}
                    options={ALIGNMENT_OPTIONS}
                    onChange={(alignment) => onUpdate({ ...character, alignment })}
                    width="w-full max-w-md"
                    placeholder="Choose alignment…"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Background (rulebook)</span>
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      value={character.background}
                      onChange={(e) => handleBackgroundTextChange(e.target.value)}
                      className="flex-1 font-bold text-lg bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent"
                      placeholder="Background name"
                    />
                    <button
                      type="button"
                      onClick={() => setBgPickerOpen(true)}
                      className="shrink-0 p-2.5 text-accent hover:bg-accent/10 rounded-xl border border-slate-200 transition-all"
                      title="Pick from list"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Languages</span>
                  <input
                    type="text"
                    value={character.languages ?? ''}
                    onChange={(e) => onUpdate({ ...character, languages: e.target.value })}
                    placeholder="Common, Elvish, Dwarvish…"
                    className="w-full max-w-2xl font-bold text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-muted leading-snug">
                    List every language you know (from species, background, class, or other sources). Comma-separated is fine.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Character lore &amp; backstory</span>
                  <textarea
                    value={character.lore ?? ''}
                    onChange={(e) => onUpdate({ ...character, lore: e.target.value })}
                    placeholder="Where they came from, personality, ideals, bonds, flaws, secrets, goals…"
                    rows={12}
                    className="w-full min-h-[14rem] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm leading-relaxed outline-none focus:border-accent placeholder:text-slate-400 resize-y"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="stat-card space-y-6">
                <div className="section-header">
                  <SettingsIcon size={18} className="text-accent" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Display</h3>
                </div>
                <div className="space-y-3">
                  {/* Dark Mode toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      {darkMode
                        ? <Moon size={14} className="text-accent shrink-0" />
                        : <Sun size={14} className="text-accent shrink-0" />
                      }
                      <div>
                        <span className="text-[10px] font-black uppercase text-muted">Dark Mode</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Switch to a darker colour theme</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDarkMode(!darkMode)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
                        darkMode ? "bg-accent" : "bg-slate-300"
                      )}
                      aria-label="Toggle dark mode"
                    >
                      <span className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                        darkMode ? "translate-x-[18px]" : "translate-x-[3px]"
                      )} />
                    </button>
                  </div>

                  {/* Compact Spellbook toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted">Compact Spellbook</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Show more spells with reduced row height</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate({ ...character, compactSpellbook: !(character.compactSpellbook ?? false) })
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
                        compactSpells ? "bg-accent" : "bg-slate-300"
                      )}
                      aria-label="Toggle compact spellbook"
                    >
                      <span className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                        compactSpells ? "translate-x-[18px]" : "translate-x-[3px]"
                      )} />
                    </button>
                  </div>

                  {/* Accent colour palette */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-black uppercase text-muted">Accent Colour</span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {ACCENT_PALETTES.map(p => (
                        <button
                          key={p.value}
                          title={p.name}
                          onClick={() => setAccentColor(p.value)}
                          style={{ backgroundColor: p.value }}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                            accentColor === p.value ? "border-white scale-110 shadow-md" : "border-transparent"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Current: <span className="font-black" style={{ color: accentColor }}>{ACCENT_PALETTES.find(p => p.value === accentColor)?.name ?? 'Custom'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="stat-card space-y-6">
                <div className="section-header">
                  <SettingsIcon size={18} className="text-accent" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Tab Visibility</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] text-muted italic">Toggle which tabs are visible in the navigation bar.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'core', label: 'Core Stats' },
                      { id: 'combat', label: 'Combat' },
                      { id: 'spells', label: 'Spellbook' },
                      { id: 'features', label: 'Features' },
                      { id: 'wildshape', label: 'Wild Shape' },
                      { id: 'faith', label: 'Faith' },
                      { id: 'companions', label: 'Companions' },
                      { id: 'bio', label: 'Inventory' },
                      { id: 'lore', label: 'Lore' },
                    ].map((tab) => (
                      <div key={tab.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-black uppercase text-muted">{tab.label}</span>
                        <input
                          type="checkbox"
                          checked={
                            tab.id === 'companions'
                              ? !isCompanionTabHidden(character)
                              : tab.id === 'wildshape'
                                ? !isWildShapeTabHidden(character)
                                : tab.id === 'faith'
                                  ? !isFaithTabHidden(character)
                                  : !character.hiddenTabs?.includes(tab.id)
                          }
                          onChange={(e) => {
                            const isVisible = e.target.checked;
                            const hiddenTabs = character.hiddenTabs ?? [];
                            const newHiddenTabs = isVisible
                              ? hiddenTabs.filter(id => id !== tab.id)
                              : [...hiddenTabs, tab.id];
                            onUpdate({ ...character, hiddenTabs: newHiddenTabs });
                          }}
                          className="w-5 h-5 accent-accent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
