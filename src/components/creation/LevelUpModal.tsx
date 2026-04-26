import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight, Check, TrendingUp,
  Dices, Star, Sparkles, Zap, Award, BookOpen,
} from 'lucide-react';
import { cn, getModifier } from '@/lib/utils';
import { Character, Ability, Spell, Feature } from '@/types';
import { SPELL_CLASS_MAP } from '@/data/spellClasses';
import { SUBCLASSES } from '@/config/constants';
import {
  PROF_BONUS,
  hitDieMax, isASILevel, SUBCLASS_LEVEL,
  getSpellSlots,
  ABILITY_SCORE_IMPROVEMENT_NAME,
} from '@/data/levelData';
import { mergeClassAndSubclassLevelFeatures } from '@/data/subclassFeatures';
import { FeatPickerModal } from '@/components/modals/FeatPickerModal';
import type { FeatTemplate } from '@/data/feats';
import { getLevelUpSpellPicks } from '@/data/spellLevelUp';
import type { SpellTemplate } from '@/data/spells';

function isSwappableClassCantrip(sp: Spell, cls: string): boolean {
  if (sp.level !== 0 || sp.isFree || sp.spellBudgetExempt) return false;
  const lists = SPELL_CLASS_MAP[sp.name] ?? [];
  if (cls === 'Ranger') return lists.includes('Druid');
  if (cls === 'Paladin') return lists.includes('Cleric');
  return lists.includes(cls);
}

function isSwappableClassLeveled(sp: Spell, cls: string): boolean {
  if (sp.level < 1 || sp.isFree || sp.spellBudgetExempt) return false;
  return (SPELL_CLASS_MAP[sp.name] ?? []).includes(cls);
}

function templateToSpellEntry(t: SpellTemplate, prepared: boolean): Spell {
  return {
    ...t,
    id: Math.random().toString(36).substr(2, 9),
    prepared,
  };
}
import { SpellPickerModal } from '@/components/modals/SpellPickerModal';
import { resyncSpellSlotRows } from '@/lib/reconcileCharacterLevel';
import {
  characterHasToughFeat,
  toughHpDeltaOnLevelUp,
  levelUpSelectionGrantsTough,
} from '@/lib/toughFeatHp';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const AB_SHORT: Record<Ability, string> = {
  str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA',
};
const AB_FULL: Record<Ability, string> = {
  str:'Strength', dex:'Dexterity', con:'Constitution',
  int:'Intelligence', wis:'Wisdom', cha:'Charisma',
};

// Infer hit die from hitDice.total string ("3d10" → "d10")
function inferHitDie(char: Character): string {
  const m = char.hitDice.total.match(/d\d+/);
  return m ? m[0] : 'd8';
}

type ModalStep = 'features' | 'subclass' | 'asi' | 'spells' | 'hp' | 'summary';

interface ASIState {
  mode: '+2+0' | '+1+1';
  a: Ability | null;
  b: Ability | null;
}

type ImprovementChoice = 'asi' | 'feat';

interface Props {
  character: Character;
  onConfirm: (updated: Character) => void;
  onClose: () => void;
}

export const LevelUpModal: React.FC<Props> = ({ character, onConfirm, onClose }) => {
  const newLevel = character.level + 1;
  const hitDie   = inferHitDie(character);
  const conMod   = getModifier(character.abilities.con);
  const maxRoll  = hitDieMax(hitDie);
  const newProf  = PROF_BONUS[newLevel] ?? 2;
  const oldProf  = PROF_BONUS[character.level] ?? 2;
  const profUp   = newProf > oldProf;
  /** Always show at subclass tier if the class has options — supports changing after level-down / re-level. */
  const needsSubclassStep =
    newLevel === SUBCLASS_LEVEL && (SUBCLASSES[character.class]?.length ?? 0) > 0;
  const needsASI      = isASILevel(character.class, newLevel);
  const newSlots      = getSpellSlots(character.class, newLevel);

  const [stepIdx, setStepIdx] = useState(0);

  // Per-step state (subclass needed before merged feature list)
  const [subclass,  setSubclass]  = useState(character.subclass || '');
  const [asi,       setAsi]       = useState<ASIState>({ mode: '+2+0', a: null, b: null });
  const [improvementChoice, setImprovementChoice] = useState<ImprovementChoice>('asi');
  const [featFromLibrary, setFeatFromLibrary] = useState<FeatTemplate | null>(null);
  const [customFeatName, setCustomFeatName] = useState('');
  const [customFeatDesc, setCustomFeatDesc] = useState('');
  const [featPickerOpen, setFeatPickerOpen] = useState(false);
  const [hpRoll,    setHpRoll]    = useState<number | ''>('');
  const [usedAvg,   setUsedAvg]   = useState(false);
  const [levelUpCantripsPicked, setLevelUpCantripsPicked] = useState<SpellTemplate[]>([]);
  const [levelUpSpellsPicked, setLevelUpSpellsPicked] = useState<SpellTemplate[]>([]);
  const [spellPickOpen, setSpellPickOpen] = useState(false);
  const [spellPickLevels, setSpellPickLevels] = useState<number[] | undefined>(undefined);
  type SpellPickPurpose = 'addCantrip' | 'addLeveled' | 'swapCantripIn' | 'swapSpellIn' | null;
  const [spellPickPurpose, setSpellPickPurpose] = useState<SpellPickPurpose>(null);
  const [cantripSwapOutId, setCantripSwapOutId] = useState<string | null>(null);
  const [cantripSwapIn, setCantripSwapIn] = useState<SpellTemplate | null>(null);
  const [spellSwapOutId, setSpellSwapOutId] = useState<string | null>(null);
  const [spellSwapIn, setSpellSwapIn] = useState<SpellTemplate | null>(null);

  const effectiveSubclassForFeatures = useMemo(() => {
    if (needsSubclassStep) return subclass.trim();
    return (character.subclass || '').trim();
  }, [needsSubclassStep, subclass, character.subclass]);

  const features = useMemo(
    () =>
      mergeClassAndSubclassLevelFeatures(
        character.class,
        newLevel,
        effectiveSubclassForFeatures || undefined,
      ),
    [character.class, newLevel, effectiveSubclassForFeatures],
  );

  const summaryFeatures = useMemo(() => {
    if (needsASI && improvementChoice === 'feat') {
      return features.filter(
        (x) =>
          !(
            x.featureSource === 'class' &&
            x.name === ABILITY_SCORE_IMPROVEMENT_NAME
          ),
      );
    }
    return features;
  }, [features, needsASI, improvementChoice]);

  const spellPicks = useMemo(
    () => getLevelUpSpellPicks(character.class, character.level, newLevel),
    [character.class, character.level, newLevel],
  );
  const needsSpellStep =
    spellPicks.cantrips > 0 ||
    spellPicks.spells > 0 ||
    spellPicks.allowCantripSwap ||
    spellPicks.allowSpellSwap;

  // Subclass before the features preview so merged class + subclass rows are accurate at level 3
  const steps: ModalStep[] = useMemo(() => {
    const s: ModalStep[] = [];
    if (needsSubclassStep) s.push('subclass');
    s.push('features');
    if (needsASI) s.push('asi');
    if (needsSpellStep) s.push('spells');
    s.push('hp', 'summary');
    return s;
  }, [needsSubclassStep, needsASI, needsSpellStep]);

  const currentStep = steps[stepIdx];

  // CON mod after applying ASI (ASI step comes before HP step, so this is live)
  const effectiveConMod = useMemo(() => {
    let newCon = character.abilities.con;
    if (needsASI && improvementChoice === 'asi' && asi.a) {
      if (asi.mode === '+2+0' && asi.a === 'con') newCon = Math.min(20, newCon + 2);
      else if (asi.mode === '+1+1') {
        if (asi.a === 'con') newCon = Math.min(20, newCon + 1);
        if (asi.b === 'con') newCon = Math.min(20, newCon + 1);
      }
    }
    return getModifier(newCon);
  }, [character.abilities.con, needsASI, improvementChoice, asi]);

  // Average HP gain using the effective (post-ASI) CON mod
  const effectiveAvgGain = useMemo(
    () => Math.max(1, Math.ceil((maxRoll + 1) / 2) + effectiveConMod),
    [maxRoll, effectiveConMod],
  );

  // Retroactive HP from a CON ASI (+1 per level already attained, including this one)
  const retroConBonus = (effectiveConMod - conMod) * newLevel;

  /** PHB 2024 Tough — +2 per level if you already have it; +2×new level when you take it this level-up */
  const toughHpDelta = useMemo(() => {
    const had = characterHasToughFeat(character);
    const gains = levelUpSelectionGrantsTough(
      needsASI,
      improvementChoice,
      featFromLibrary,
      customFeatName,
    );
    return toughHpDeltaOnLevelUp(had, gains, newLevel);
  }, [character, needsASI, improvementChoice, featFromLibrary, customFeatName, newLevel]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const canNext = (): boolean => {
    switch (currentStep) {
      case 'subclass': return subclass.trim().length > 0;
      case 'asi':
        if (improvementChoice === 'feat') {
          return !!featFromLibrary || customFeatName.trim().length > 0;
        }
        if (asi.mode === '+2+0') return !!asi.a;
        return !!asi.a && !!asi.b && asi.a !== asi.b;
      case 'spells':
        if (cantripSwapOutId && !cantripSwapIn) return false;
        if (spellSwapOutId && !spellSwapIn) return false;
        return (
          levelUpCantripsPicked.length >= spellPicks.cantrips &&
          levelUpSpellsPicked.length >= spellPicks.spells
        );
      case 'hp':
        if (usedAvg) return true;
        return typeof hpRoll === 'number' && hpRoll >= 1 && hpRoll <= maxRoll;
      default: return true;
    }
  };

  const go = (dir: 1 | -1) => {
    const next = stepIdx + dir;
    if (next >= 0 && next < steps.length) setStepIdx(next);
  };

  // ── Build updated character ─────────────────────────────────────────────────
  const applyLevelUp = () => {
    // Updated abilities from ASI first (needed to know final CON)
    const newAbilities = { ...character.abilities };
    if (needsASI && improvementChoice === 'asi' && asi.a) {
      if (asi.mode === '+2+0') {
        newAbilities[asi.a] = Math.min(20, newAbilities[asi.a] + 2);
      } else {
        if (asi.a) newAbilities[asi.a] = Math.min(20, newAbilities[asi.a] + 1);
        if (asi.b) newAbilities[asi.b] = Math.min(20, newAbilities[asi.b] + 1);
      }
    }

    // HP this level uses the effective (post-ASI) CON mod.
    // Additionally, if CON mod increased, grant +1 HP retroactively for every
    // level already attained (including this one) — PHB 2024 rule.
    const gainedHP = usedAvg
      ? effectiveAvgGain
      : Math.max(1, (typeof hpRoll === 'number' ? hpRoll : 1) + effectiveConMod);
    const totalHPGain = gainedHP + retroConBonus + toughHpDelta;

    // Full resync: Pact Magic replaces slot tier (e.g. Warlock L2→L3 drops 1st-level slots); partial merge left stale rows.
    const currentSlots = resyncSpellSlotRows(
      character.class,
      newLevel,
      character.spellcasting.slots,
    );

    // Update hit dice count
    const newHDTotal = `${newLevel}${hitDie}`;
    const newHDRemaining = Math.min(character.hitDice.remaining + 1, newLevel);

    const resolvedSubclass =
      (needsSubclassStep ? subclass.trim() : (character.subclass || '').trim()) || undefined;
    const mergedForApply = mergeClassAndSubclassLevelFeatures(
      character.class,
      newLevel,
      resolvedSubclass,
    );

    const customNameTrim = customFeatName.trim();
    const resolvedFeatEntry =
      needsASI && improvementChoice === 'feat'
        ? customNameTrim
          ? {
              name: customNameTrim,
              description:
                customFeatDesc.trim() ||
                'Use the full rules text from public/rules.pdf (or your Player’s Handbook) for this feat.',
              source: 'Feat',
            }
          : featFromLibrary
            ? {
                name: featFromLibrary.name,
                description: featFromLibrary.description,
                source: featFromLibrary.source,
              }
            : null
        : null;

    let mergedRows = mergedForApply;
    if (resolvedFeatEntry) {
      mergedRows = mergedForApply.filter(
        (f) =>
          !(
            f.featureSource === 'class' &&
            f.name === ABILITY_SCORE_IMPROVEMENT_NAME
          ),
      );
    }

    const swapCantripDone = !!(cantripSwapOutId && cantripSwapIn);
    const swapSpellDone = !!(spellSwapOutId && spellSwapIn);
    const newPickedSpellEntries: Spell[] =
      spellPicks.cantrips > 0 || spellPicks.spells > 0
        ? [
            ...levelUpCantripsPicked.map((t) => ({
              ...t,
              id: Math.random().toString(36).substr(2, 9),
              prepared: spellPicks.mode !== 'spellbook',
            })),
            ...levelUpSpellsPicked.map((t) => ({
              ...t,
              id: Math.random().toString(36).substr(2, 9),
              prepared: spellPicks.mode !== 'spellbook',
            })),
          ]
        : [];
    const spellListChanged =
      needsSpellStep &&
      (swapCantripDone || swapSpellDone || newPickedSpellEntries.length > 0);

    let nextSpells = character.spellcasting.spells;
    if (spellListChanged) {
      nextSpells = character.spellcasting.spells.filter((s) => {
        if (swapCantripDone && s.id === cantripSwapOutId) return false;
        if (swapSpellDone && s.id === spellSwapOutId) return false;
        return true;
      });
      if (swapCantripDone && cantripSwapIn) {
        const prev = character.spellcasting.spells.find((s) => s.id === cantripSwapOutId);
        nextSpells = [...nextSpells, templateToSpellEntry(cantripSwapIn, prev?.prepared ?? true)];
      }
      if (swapSpellDone && spellSwapIn) {
        const prev = character.spellcasting.spells.find((s) => s.id === spellSwapOutId);
        nextSpells = [...nextSpells, templateToSpellEntry(spellSwapIn, prev?.prepared ?? true)];
      }
      nextSpells = [...nextSpells, ...newPickedSpellEntries];
    }

    const prevSubclassTrim = (character.subclass || '').trim();
    const incomingSubclassTrim = (needsSubclassStep ? subclass.trim() : prevSubclassTrim) || '';
    const subclassChoiceChanged =
      needsSubclassStep &&
      newLevel === SUBCLASS_LEVEL &&
      prevSubclassTrim.length > 0 &&
      incomingSubclassTrim.length > 0 &&
      prevSubclassTrim !== incomingSubclassTrim;

    const priorFeatures: Feature[] = [...(character.classFeatures ?? [])];
    let classFeaturesBase: Feature[] = priorFeatures;
    if (subclassChoiceChanged) {
      classFeaturesBase = priorFeatures.filter((f) => f.source !== prevSubclassTrim);
    } else {
      classFeaturesBase = priorFeatures.filter((f) => f.acquiredAtLevel !== newLevel);
    }

    const newClassFeatures = [
      ...classFeaturesBase,
      ...mergedRows.map((f) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        description: f.desc,
        source:
          f.featureSource === 'subclass' && resolvedSubclass
            ? resolvedSubclass
            : character.class,
        acquiredAtLevel: newLevel,
      })),
      ...(resolvedFeatEntry
        ? [
            {
              id: Math.random().toString(36).substr(2, 9),
              name: resolvedFeatEntry.name,
              description: resolvedFeatEntry.description,
              source: resolvedFeatEntry.source,
              acquiredAtLevel: newLevel,
            },
          ]
        : []),
    ];

    onConfirm({
      ...character,
      level: newLevel,
      subclass: needsSubclassStep ? subclass.trim() : character.subclass,
      proficiencyBonus: newProf,
      abilities: newAbilities,
      hp: {
        max: character.hp.max + totalHPGain,
        current: character.hp.current + totalHPGain,
        temp: character.hp.temp,
      },
      hitDice: {
        total: newHDTotal,
        remaining: newHDRemaining,
      },
      classFeatures: newClassFeatures,
      spellcasting: {
        ...character.spellcasting,
        slots: currentSlots,
        spells: spellListChanged ? nextSpells : character.spellcasting.spells,
      },
    });
  };

  // ── UI building blocks ──────────────────────────────────────────────────────
  const renderStepBadge = (step: ModalStep, idx: number) => {
    const ICONS: Record<ModalStep, React.ReactNode> = {
      features: <Sparkles size={12} />,
      subclass:  <Star size={12} />,
      asi:       <TrendingUp size={12} />,
      spells:    <BookOpen size={12} />,
      hp:        <Dices size={12} />,
      summary:   <Check size={12} />,
    };
    const LABELS: Record<ModalStep, string> = {
      features: 'Features', subclass: 'Subclass',
      asi: 'ASI / Feat', spells: 'Spells', hp: 'Hit Points', summary: 'Done',
    };
    const done   = idx < stepIdx;
    const active = idx === stepIdx;
    return (
      <div key={step} className={cn('flex flex-col items-center gap-1 flex-1')}>
        <div className={cn(
          'w-full h-1 rounded-full transition-all',
          done ? 'bg-accent' : active ? 'bg-accent/50' : 'bg-slate-100',
        )} />
        <div className={cn(
          'flex items-center gap-0.5 text-[9px] font-black uppercase hidden sm:flex',
          active ? 'text-accent' : done ? 'text-slate-500' : 'text-slate-300',
        )}>
          {ICONS[step]}{LABELS[step]}
        </div>
      </div>
    );
  };

  // ── STEP: Features ──────────────────────────────────────────────────────────
  const StepFeatures = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-accent rounded-xl text-white">
        <TrendingUp size={24} />
        <div>
          <div className="text-xs font-black uppercase tracking-widest opacity-80">Level Up!</div>
          <div className="text-2xl font-black">{character.name} → Level {newLevel}</div>
        </div>
      </div>

      {/* Prof bonus increase */}
      {profUp && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Zap size={16} className="text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-black text-emerald-800">Proficiency Bonus Increases!</div>
            <div className="text-[11px] text-emerald-600">+{oldProf} → <span className="font-black">+{newProf}</span></div>
          </div>
        </div>
      )}

      {/* Spell slots update */}
      {Object.keys(newSlots).length > 0 && (
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="text-xs font-black text-violet-800 mb-2">Updated Spell Slots</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(newSlots).map(([slotLvl, count]) => (
              <div key={slotLvl} className="bg-white rounded-lg px-2 py-1 border border-violet-100 text-center">
                <div className="text-[9px] font-black text-violet-500 uppercase">Lvl {slotLvl}</div>
                <div className="text-sm font-black text-violet-700">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New features */}
      {features.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            New Features at Level {newLevel}
          </div>
          {features.map((f, i) => (
            <div
              key={`${f.featureSource}-${f.name}-${i}`}
              className="p-3 bg-slate-50 border border-slate-100 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-accent shrink-0" />
                <span className="text-sm font-black text-slate-800">{f.name}</span>
                {f.featureSource === 'subclass' && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-md">
                    Subclass
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pl-5">{f.desc}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-sm">
          No major features at this level — check your class table for details.
        </div>
      )}

      {/* Upcoming steps preview (subclass is chosen first when you hit level 3) */}
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
        {needsASI && (
          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full font-bold text-blue-700">
            → Ability scores or feat
          </span>
        )}
        {needsSpellStep && (
          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-full font-bold text-indigo-700">
            → Spells
          </span>
        )}
        <span className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-full font-bold text-red-700">
          → Roll HP
        </span>
      </div>
    </div>
  );

  // ── STEP: Subclass ──────────────────────────────────────────────────────────
  const availableSubclasses = SUBCLASSES[character.class] ?? [];
  const StepSubclass = (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-800">Choose your Subclass</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          At level 3, your {character.class} journey takes a specialized path.
        </p>
        {character.subclass && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2 leading-relaxed">
            You already have a subclass on this sheet. Keep your current choice or pick another — if you switch, all features
            listed under your old subclass are removed so they do not stack with the new path.
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
        {availableSubclasses.map(sc => (
          <button
            key={sc}
            onClick={() => setSubclass(sc)}
            className={cn(
              'text-left px-4 py-3 rounded-xl border-2 transition-all',
              subclass === sc
                ? 'border-accent bg-accent/5'
                : 'border-slate-200 hover:border-slate-300 bg-white',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-slate-800">{sc}</span>
              {subclass === sc && <Check size={16} className="text-accent" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── STEP: ASI or Feat (PHB / rules.pdf) ─────────────────────────────────────
  const StepASI = (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-800">Ability scores or feat</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
          At this level you can increase your ability scores <span className="font-bold">or</span> take a{' '}
          <span className="font-bold">Feat</span> for which you qualify — same as the Player’s Handbook (
          <span className="font-mono text-[10px]">public/rules.pdf</span>). Half-feats that grant +1 to an
          ability still count as your feat; apply that +1 on your sheet after leveling if you pick one.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setImprovementChoice('asi');
            setFeatFromLibrary(null);
            setCustomFeatName('');
            setCustomFeatDesc('');
          }}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-xs font-black border transition-all',
            improvementChoice === 'asi'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
          )}
        >
          Ability scores
        </button>
        <button
          type="button"
          onClick={() => {
            setImprovementChoice('feat');
            setAsi({ mode: '+2+0', a: null, b: null });
          }}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-xs font-black border transition-all',
            improvementChoice === 'feat'
              ? 'bg-violet-700 text-white border-violet-700'
              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300',
          )}
        >
          Feat instead
        </button>
      </div>

      {improvementChoice === 'asi' ? (
        <>
          <p className="text-[10px] text-muted">
            Increase one ability by 2, or two different abilities by 1 each (maximum 20 before other effects).
          </p>
          <div className="flex gap-2">
            {(['+2+0', '+1+1'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAsi({ mode: m, a: null, b: null })}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-xs font-black border transition-all',
                  asi.mode === m
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                )}
              >
                {m === '+2+0' ? '+2 to one ability' : '+1 to two abilities'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ABILITIES.map((ab) => {
              const score = character.abilities[ab];
              const isMaxed = score >= 20;
              const isA = asi.a === ab;
              const isB = asi.b === ab;
              const isSelected = isA || isB;

              let preview = score;
              if (isA) preview += asi.mode === '+2+0' ? 2 : 1;
              else if (isB) preview += 1;
              preview = Math.min(20, preview);

              const handleClick = () => {
                if (isMaxed) return;
                if (asi.mode === '+2+0') {
                  setAsi((s) => ({ ...s, a: s.a === ab ? null : ab, b: null }));
                } else {
                  setAsi((s) => {
                    if (s.a === ab) return { ...s, a: s.b, b: null };
                    if (s.b === ab) return { ...s, b: null };
                    if (!s.a) return { ...s, a: ab };
                    if (!s.b) return { ...s, b: ab };
                    return { ...s, b: ab };
                  });
                }
              };

              return (
                <button
                  key={ab}
                  type="button"
                  onClick={handleClick}
                  disabled={isMaxed}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all',
                    isSelected ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300 bg-white',
                    isMaxed && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <div className="text-[10px] font-black uppercase text-slate-500">{AB_SHORT[ab]}</div>
                  <div className="text-xs font-black text-slate-400 mt-0.5">{AB_FULL[ab]}</div>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className={cn('font-black text-lg', isSelected ? 'text-accent' : 'text-slate-700')}>
                      {isSelected ? preview : score}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black text-emerald-600">
                        +{asi.mode === '+2+0' && isA ? 2 : 1}
                      </span>
                    )}
                  </div>
                  {isMaxed && <div className="text-[9px] text-slate-400 mt-0.5">MAX</div>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFeatPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-800 font-black text-sm hover:border-violet-400 transition-all"
          >
            <Award size={18} />
            Browse feat library
          </button>
          {featFromLibrary && !customFeatName.trim() && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
              <div className="font-black text-slate-800 mb-1">{featFromLibrary.name}</div>
              <p className="text-slate-500 line-clamp-4 whitespace-pre-wrap">{featFromLibrary.description}</p>
              <button
                type="button"
                onClick={() => setFeatFromLibrary(null)}
                className="mt-2 text-[10px] font-black uppercase text-red-600 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Or enter a feat from your book
            </div>
            <input
              value={customFeatName}
              onChange={(e) => {
                setCustomFeatName(e.target.value);
                if (e.target.value.trim()) setFeatFromLibrary(null);
              }}
              placeholder="Feat name (e.g. from rules.pdf)"
              className="w-full font-bold text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400"
            />
            <textarea
              value={customFeatDesc}
              onChange={(e) => setCustomFeatDesc(e.target.value)}
              placeholder="Rules text (optional — you can edit later on the Features tab)"
              rows={4}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 resize-y leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );

  const excludedSpellNamesForPicker = useMemo(() => {
    const s = new Set<string>();
    character.spellcasting.spells.forEach((x) => s.add(x.name));
    levelUpCantripsPicked.forEach((x) => s.add(x.name));
    levelUpSpellsPicked.forEach((x) => s.add(x.name));
    return Array.from(s);
  }, [character.spellcasting.spells, levelUpCantripsPicked, levelUpSpellsPicked]);

  const swappableCantripsOnChar = useMemo(
    () =>
      character.spellcasting.spells.filter((s) =>
        isSwappableClassCantrip(s, character.class),
      ),
    [character.spellcasting.spells, character.class],
  );

  const swappableLeveledOnChar = useMemo(
    () =>
      character.spellcasting.spells.filter((s) =>
        isSwappableClassLeveled(s, character.class),
      ),
    [character.spellcasting.spells, character.class],
  );

  const swapCantripExcludeNames = useMemo(() => {
    const s = new Set<string>();
    for (const sp of character.spellcasting.spells) {
      if (sp.level !== 0) continue;
      if (sp.id === cantripSwapOutId) continue;
      s.add(sp.name);
    }
    for (const t of levelUpCantripsPicked) s.add(t.name);
    return Array.from(s);
  }, [character.spellcasting.spells, cantripSwapOutId, levelUpCantripsPicked]);

  const swapSpellExcludeNames = useMemo(() => {
    const s = new Set<string>();
    for (const sp of character.spellcasting.spells) {
      if (sp.level === 0) continue;
      if (sp.id === spellSwapOutId) continue;
      s.add(sp.name);
    }
    for (const t of levelUpSpellsPicked) s.add(t.name);
    return Array.from(s);
  }, [character.spellcasting.spells, spellSwapOutId, levelUpSpellsPicked]);

  const spellPickerExcludeNames = useMemo(() => {
    if (spellPickPurpose === 'swapCantripIn') return swapCantripExcludeNames;
    if (spellPickPurpose === 'swapSpellIn') return swapSpellExcludeNames;
    return excludedSpellNamesForPicker;
  }, [
    spellPickPurpose,
    swapCantripExcludeNames,
    swapSpellExcludeNames,
    excludedSpellNamesForPicker,
  ]);

  /** Ranger / Paladin fighting-style cantrips use another class’s spell list in the book. */
  const spellPickerLockClass = useMemo(() => {
    if (spellPickPurpose === 'swapCantripIn' && character.class === 'Ranger') return 'Druid';
    if (spellPickPurpose === 'swapCantripIn' && character.class === 'Paladin') return 'Cleric';
    return character.class;
  }, [spellPickPurpose, character.class]);

  const leveledSpellRestrictLevels =
    spellPicks.maxSpellLevel >= 1
      ? Array.from({ length: spellPicks.maxSpellLevel }, (_, i) => i + 1)
      : [];

  const handleLevelUpSpellAdd = (t: SpellTemplate) => {
    if (spellPickPurpose === 'swapCantripIn') {
      setCantripSwapIn(t);
      return;
    }
    if (spellPickPurpose === 'swapSpellIn') {
      if (spellPicks.maxSpellLevel > 0 && t.level > spellPicks.maxSpellLevel) return;
      setSpellSwapIn(t);
      return;
    }
    if (t.level === 0) {
      if (levelUpCantripsPicked.length >= spellPicks.cantrips) return;
      if (levelUpCantripsPicked.some((x) => x.name === t.name)) return;
      setLevelUpCantripsPicked((p) => [...p, t]);
    } else {
      if (levelUpSpellsPicked.length >= spellPicks.spells) return;
      if (spellPicks.maxSpellLevel > 0 && t.level > spellPicks.maxSpellLevel) return;
      if (levelUpSpellsPicked.some((x) => x.name === t.name)) return;
      setLevelUpSpellsPicked((p) => [...p, t]);
    }
  };

  // ── STEP: Spells ────────────────────────────────────────────────────────────
  const StepSpells = (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-800">Spells for level {newLevel}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{spellPicks.blurb}</p>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
          The spell library closes after you add each spell so you can confirm your list here. Use{' '}
          <span className="font-bold text-slate-500">+ From library</span> again for another choice, then press{' '}
          <span className="font-bold text-slate-500">Next</span> when your picks are complete.
        </p>
      </div>
      {spellPicks.cantrips > 0 && (
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              Cantrips ({levelUpCantripsPicked.length}/{spellPicks.cantrips})
            </span>
            <button
              type="button"
              disabled={levelUpCantripsPicked.length >= spellPicks.cantrips}
              onClick={() => {
                setSpellPickPurpose('addCantrip');
                setSpellPickLevels([0]);
                setSpellPickOpen(true);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-accent border border-accent/40 px-2.5 py-1 rounded-lg hover:bg-accent/10 disabled:opacity-40"
            >
              + From library
            </button>
          </div>
          <ul className="space-y-1">
            {levelUpCantripsPicked.map((sp) => (
              <li
                key={sp.name}
                className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white border border-slate-100 rounded-lg px-2 py-1.5"
              >
                {sp.name}
                <button
                  type="button"
                  onClick={() =>
                    setLevelUpCantripsPicked((p) => p.filter((x) => x.name !== sp.name))
                  }
                  className="text-red-500 text-[10px] font-black uppercase"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {spellPicks.spells > 0 && (
        <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800">
              {spellPicks.mode === 'spellbook' ? 'Spellbook' : spellPicks.mode === 'prepared' ? 'Spells to add' : 'Spells known'} (
              {levelUpSpellsPicked.length}/{spellPicks.spells})
            </span>
            <button
              type="button"
              disabled={
                levelUpSpellsPicked.length >= spellPicks.spells ||
                leveledSpellRestrictLevels.length === 0
              }
              onClick={() => {
                setSpellPickPurpose('addLeveled');
                setSpellPickLevels(leveledSpellRestrictLevels);
                setSpellPickOpen(true);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-700 border border-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-100 disabled:opacity-40"
            >
              + From library
            </button>
          </div>
          {leveledSpellRestrictLevels.length === 0 && (
            <p className="text-[10px] text-amber-700 font-bold">
              No leveled spell slots yet — if this is wrong, add spells manually on the Spellbook tab.
            </p>
          )}
          <ul className="space-y-1">
            {levelUpSpellsPicked.map((sp) => (
              <li
                key={sp.name}
                className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white border border-slate-100 rounded-lg px-2 py-1.5"
              >
                <span>
                  {sp.name}{' '}
                  <span className="text-[10px] text-slate-400 font-black">(Lvl {sp.level})</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setLevelUpSpellsPicked((p) => p.filter((x) => x.name !== sp.name))
                  }
                  className="text-red-500 text-[10px] font-black uppercase"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {spellPicks.allowCantripSwap && (
        <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
            Optional — replace a cantrip
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            When you gain a level, you may replace one of your class cantrips with another from your class list (2024 PHB).
          </p>
          {swappableCantripsOnChar.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">
              No eligible class cantrips on your sheet yet (Magic Initiate and similar are excluded).
            </p>
          ) : (
            <div className="space-y-2">
              <select
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-emerald-400"
                value={cantripSwapOutId ?? ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setCantripSwapOutId(v);
                  setCantripSwapIn(null);
                }}
              >
                <option value="">— Cantrip to remove —</option>
                {swappableCantripsOnChar.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!cantripSwapOutId}
                onClick={() => {
                  setSpellPickPurpose('swapCantripIn');
                  setSpellPickLevels([0]);
                  setSpellPickOpen(true);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 disabled:opacity-40"
              >
                Choose replacement…
              </button>
              {cantripSwapIn && (
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 bg-white border border-emerald-100 rounded-lg px-2 py-1.5">
                  <span>→ {cantripSwapIn.name}</span>
                  <button
                    type="button"
                    className="text-red-500 text-[10px] font-black uppercase"
                    onClick={() => setCantripSwapIn(null)}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {spellPicks.allowSpellSwap && (
        <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/40 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-violet-800">
            Optional — swap one spell on your list
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            You may replace one spell on your list with another {character.class} spell you can learn (2024 PHB).
          </p>
          {swappableLeveledOnChar.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic">No eligible leveled class spells on your sheet yet.</p>
          ) : (
            <div className="space-y-2">
              <select
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-violet-400"
                value={spellSwapOutId ?? ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setSpellSwapOutId(v);
                  setSpellSwapIn(null);
                }}
              >
                <option value="">— Spell to remove —</option>
                {swappableLeveledOnChar.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} (Lv {sp.level})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!spellSwapOutId || leveledSpellRestrictLevels.length === 0}
                onClick={() => {
                  setSpellPickPurpose('swapSpellIn');
                  setSpellPickLevels(leveledSpellRestrictLevels);
                  setSpellPickOpen(true);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-violet-800 border border-violet-300 px-2.5 py-1.5 rounded-lg hover:bg-violet-100 disabled:opacity-40"
              >
                Choose replacement…
              </button>
              {spellSwapIn && (
                <div className="flex items-center justify-between text-xs font-bold text-violet-900 bg-white border border-violet-100 rounded-lg px-2 py-1.5">
                  <span>
                    → {spellSwapIn.name}{' '}
                    <span className="text-[10px] text-slate-400 font-black">(Lv {spellSwapIn.level})</span>
                  </span>
                  <button
                    type="button"
                    className="text-red-500 text-[10px] font-black uppercase"
                    onClick={() => setSpellSwapIn(null)}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── STEP: HP ───────────────────────────────────────────────────────────────
  const resolvedRoll = usedAvg
    ? effectiveAvgGain
    : (typeof hpRoll === 'number' ? Math.max(1, hpRoll + effectiveConMod) : null);
  const resolvedTotal =
    resolvedRoll !== null ? resolvedRoll + retroConBonus + toughHpDelta : null;

  const StepHP = (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-slate-800">Roll for Hit Points</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Roll your {character.class} hit die ({hitDie}) and enter the result below,
          or click "Take Average" for a guaranteed amount.
        </p>
      </div>

      {/* Die display */}
      <div className="flex items-center justify-center gap-6 py-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="text-center">
          <div className="text-5xl font-black text-accent">{hitDie}</div>
          <div className="text-[10px] font-black uppercase text-slate-400 mt-1">Hit Die</div>
        </div>
        <div className="text-4xl text-slate-300">+</div>
        <div className="text-center">
          <div className={cn('text-5xl font-black', effectiveConMod >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {effectiveConMod >= 0 ? `+${effectiveConMod}` : effectiveConMod}
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 mt-1">
            CON mod{retroConBonus > 0 ? ' (boosted)' : ''}
          </div>
        </div>
      </div>

      {/* Retroactive CON bonus notice */}
      {retroConBonus > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-700">
          <span className="font-black text-sm">+{retroConBonus}</span>
          <span>retroactive HP from CON increase ({newLevel} levels × +{effectiveConMod - conMod} CON mod)</span>
        </div>
      )}

      {toughHpDelta > 0 && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800">
          <span className="font-black text-sm">+{toughHpDelta}</span>
          <span>from Tough (2024 PHB — max HP increases by 2 per level, or by 2× your level when you first take it)</span>
        </div>
      )}

      {/* Roll input */}
      <div className="space-y-3">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
          Your Rolled Result (1–{maxRoll})
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            min={1}
            max={maxRoll}
            value={hpRoll}
            onChange={e => {
              setUsedAvg(false);
              const v = Number(e.target.value);
              setHpRoll(isNaN(v) ? '' : Math.max(1, Math.min(maxRoll, v)));
            }}
            placeholder={`1 – ${maxRoll}`}
            className={cn(
              'flex-1 px-4 py-3 text-2xl font-black text-center border-2 rounded-xl outline-none transition-all',
              !usedAvg && typeof hpRoll === 'number'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-slate-200',
            )}
          />
          <button
            onClick={() => { setUsedAvg(true); setHpRoll(''); }}
            className={cn(
              'px-4 py-3 rounded-xl border-2 text-xs font-black transition-all',
              usedAvg ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400',
            )}
          >
            Take Average<br />
            <span className="text-[10px] opacity-70">(+{effectiveAvgGain} HP)</span>
          </button>
        </div>
      </div>

      {/* Result preview */}
      {resolvedTotal !== null && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="text-2xl font-black text-emerald-700">+{resolvedTotal}</div>
          <div>
            <div className="text-xs font-black text-emerald-800">Total HP Gained</div>
            <div className="text-[11px] text-emerald-600">
              {character.hp.max} → {character.hp.max + resolvedTotal} max HP
              {usedAvg
                ? ` (average${retroConBonus > 0 ? ` + ${retroConBonus} retro` : ''})`
                : ` (rolled ${hpRoll} + CON ${effectiveConMod >= 0 ? '+' : ''}${effectiveConMod}${retroConBonus > 0 ? ` + ${retroConBonus} retro` : ''})`}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── STEP: Summary ──────────────────────────────────────────────────────────
  const finalHPGain =
    (usedAvg
      ? effectiveAvgGain
      : Math.max(1, (typeof hpRoll === 'number' ? hpRoll : 1) + effectiveConMod)) +
    retroConBonus +
    toughHpDelta;

  const StepSummary = (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-xl font-black text-slate-800">{character.name}</h2>
        <div className="text-accent font-black text-base">
          {character.class} — Level {newLevel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Changes</div>
          {[
            { l: 'New Level', v: String(newLevel) },
            { l: 'HP Gain', v: `+${finalHPGain}`, sub: `${character.hp.max} → ${character.hp.max + finalHPGain}` },
            profUp && { l: 'Prof. Bonus', v: `+${newProf}`, sub: `was +${oldProf}` },
            needsSubclassStep && subclass && { l: 'Subclass', v: subclass },
          ].filter(Boolean).map((item: { l: string; v: string; sub?: string } | false) => {
            if (!item) return null;
            return (
              <div key={item.l} className="flex justify-between items-start text-xs">
                <span className="text-slate-500">{item.l}</span>
                <div className="text-right">
                  <span className="font-black text-accent">{item.v}</span>
                  {item.sub && <div className="text-[10px] text-slate-400">{item.sub}</div>}
                </div>
              </div>
            );
          })}
          {needsASI && improvementChoice === 'asi' && asi.a && (
            <div className="flex justify-between items-start text-xs">
              <span className="text-slate-500">Ability scores</span>
              <span className="font-black text-blue-600">
                {asi.mode === '+2+0'
                  ? `${AB_SHORT[asi.a]} +2`
                  : `${AB_SHORT[asi.a!]} +1, ${AB_SHORT[asi.b!]} +1`
                }
              </span>
            </div>
          )}
          {needsASI && improvementChoice === 'feat' && (customFeatName.trim() || featFromLibrary) && (
            <div className="flex justify-between items-start text-xs">
              <span className="text-slate-500">Feat</span>
              <span className="font-black text-violet-700 text-right max-w-[60%]">
                {customFeatName.trim() || featFromLibrary?.name}
              </span>
            </div>
          )}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">New Features</div>
          {summaryFeatures.length > 0 ||
          (needsASI && improvementChoice === 'feat' && (customFeatName.trim() || featFromLibrary)) ||
          (needsSpellStep &&
            (levelUpCantripsPicked.length > 0 ||
              levelUpSpellsPicked.length > 0 ||
              (cantripSwapOutId && cantripSwapIn) ||
              (spellSwapOutId && spellSwapIn))) ? (
            <ul className="space-y-1">
              {summaryFeatures.map((f, i) => (
                <li key={`${f.featureSource}-${f.name}-${i}`} className="flex items-center gap-1.5 text-[11px]">
                  <Check size={10} className="text-accent shrink-0" />
                  <span className="font-semibold text-slate-700">{f.name}</span>
                  {f.featureSource === 'subclass' && (
                    <span className="text-[8px] font-black uppercase text-violet-500">sub</span>
                  )}
                </li>
              ))}
              {needsASI && improvementChoice === 'feat' && (customFeatName.trim() || featFromLibrary) && (
                <li className="flex items-center gap-1.5 text-[11px]">
                  <Check size={10} className="text-violet-600 shrink-0" />
                  <span className="font-semibold text-violet-800">
                    {customFeatName.trim() || featFromLibrary?.name}
                  </span>
                  <span className="text-[8px] font-black uppercase text-violet-500">feat</span>
                </li>
              )}
              {needsSpellStep &&
                [...levelUpCantripsPicked, ...levelUpSpellsPicked].map((sp) => (
                  <li key={sp.name} className="flex items-center gap-1.5 text-[11px]">
                    <Check size={10} className="text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-700">{sp.name}</span>
                    <span className="text-[8px] font-black uppercase text-indigo-500">
                      {sp.level === 0 ? 'cantrip' : `L${sp.level}`}
                    </span>
                  </li>
                ))}
              {needsSpellStep &&
                cantripSwapOutId &&
                cantripSwapIn &&
                (() => {
                  const out = character.spellcasting.spells.find((s) => s.id === cantripSwapOutId);
                  if (!out) return null;
                  return (
                    <li key="swap-cantrip-summary" className="flex items-center gap-1.5 text-[11px]">
                      <Check size={10} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        Replace cantrip: {out.name} → {cantripSwapIn.name}
                      </span>
                      <span className="text-[8px] font-black uppercase text-emerald-600">swap</span>
                    </li>
                  );
                })()}
              {needsSpellStep &&
                spellSwapOutId &&
                spellSwapIn &&
                (() => {
                  const out = character.spellcasting.spells.find((s) => s.id === spellSwapOutId);
                  if (!out) return null;
                  return (
                    <li key="swap-spell-summary" className="flex items-center gap-1.5 text-[11px]">
                      <Check size={10} className="text-violet-600 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        Replace spell: {out.name} → {spellSwapIn.name}
                      </span>
                      <span className="text-[8px] font-black uppercase text-violet-600">swap</span>
                    </li>
                  );
                })()}
            </ul>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No major features this level.</p>
          )}
        </div>
      </div>
    </div>
  );

  // ── Step renderer ───────────────────────────────────────────────────────────
  const stepContent: Record<ModalStep, React.ReactNode> = {
    features: StepFeatures,
    subclass: StepSubclass,
    asi:      StepASI,
    spells:   StepSpells,
    hp:       StepHP,
    summary:  StepSummary,
  };

  const isLast = stepIdx === steps.length - 1;

  return createPortal(
    <>
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-accent" />
            <span className="font-black text-slate-800 text-sm">
              Level Up — {character.class} {newLevel}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {steps.map((s, i) => renderStepBadge(s, i))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stepContent[currentStep]}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            onClick={() => go(-1)}
            disabled={stepIdx === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:border-slate-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <div className="text-[10px] text-slate-400">{stepIdx + 1} / {steps.length}</div>
          <button
            onClick={isLast ? applyLevelUp : () => go(1)}
            disabled={!canNext()}
            className={cn(
              'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-black transition-all',
              canNext()
                ? isLast ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-accent hover:bg-accent/90 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {isLast ? (<><Check size={15} /> Level Up!</>) : (<>Next <ChevronRight size={15} /></>)}
          </button>
        </div>
      </div>
    </div>
    {featPickerOpen && (
      <FeatPickerModal
        defaultCategory="Feat"
        allowedCategories={['Feat']}
        stackZClassName="z-[350]"
        onAdd={(f) => {
          setFeatFromLibrary(f);
          setCustomFeatName('');
          setCustomFeatDesc('');
          setImprovementChoice('feat');
          setFeatPickerOpen(false);
        }}
        onClose={() => setFeatPickerOpen(false)}
      />
    )}
    {spellPickOpen && spellPickLevels && (
      <SpellPickerModal
        currentLevel={newLevel}
        stackZClassName="z-[360]"
        lockClassFilter={spellPickerLockClass}
        restrictToLevels={spellPickLevels}
        excludeSpellNames={spellPickerExcludeNames}
        addButtonLabel={
          spellPickPurpose === 'swapCantripIn' || spellPickPurpose === 'swapSpellIn'
            ? 'Use as replacement'
            : 'Add spell'
        }
        onAdd={handleLevelUpSpellAdd}
        onClose={() => {
          setSpellPickOpen(false);
          setSpellPickLevels(undefined);
          setSpellPickPurpose(null);
        }}
      />
    )}
    </>,
    document.body
  );
};
