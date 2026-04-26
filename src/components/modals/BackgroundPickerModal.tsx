import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, BookOpen, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BACKGROUND_LIST,
  BackgroundTemplate,
  ABILITY_LABELS,
  backgroundRequiresGamingSetChoice,
} from '@/data/backgrounds';
import { GAMING_SET_PHB_2024 } from '@/data/gamingSets';
import { SPELL_LIST } from '@/data/spells';
import { SPELL_CLASS_MAP } from '@/data/spellClasses';
import type { Ability } from '@/types';

export interface BackgroundResult {
  background: BackgroundTemplate;
  /** Final ability score deltas to apply */
  asiDeltas: Partial<Record<Ability, number>>;
  /** Magic Initiate (Acolyte / Guide / Sage): two cantrips + one level-1 spell */
  miCantrips?: string[];
  miSpell?: string;
  /** Guard, Noble, Soldier — PHB chapter 6 gaming set variant */
  gamingSetPick?: string;
}

interface Props {
  onConfirm: (result: BackgroundResult) => void;
  onClose: () => void;
}

type AsiMode = 'two_one' | 'all_one';

export const BackgroundPickerModal: React.FC<Props> = ({ onConfirm, onClose }) => {
  const [step, setStep] = useState<'pick' | 'asi' | 'mi'>('pick');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BackgroundTemplate | null>(null);

  const [asiMode, setAsiMode] = useState<AsiMode>('two_one');
  const [plusTwo, setPlusTwo] = useState<Ability | null>(null);
  const [plusOne, setPlusOne] = useState<Ability | null>(null);

  const [miCantrips, setMiCantrips] = useState<string[]>([]);
  const [miSpell, setMiSpell] = useState('');
  const [gamingSetPick, setGamingSetPick] = useState('');

  useEffect(() => {
    setMiCantrips([]);
    setMiSpell('');
    setGamingSetPick('');
  }, [selected?.name]);

  const isMagicInitiate = Boolean(selected?.feat.startsWith('Magic Initiate'));

  const filtered = useMemo(() =>
    BACKGROUND_LIST.filter(b => b.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const handleNext = () => {
    if (!selected) return;
    setStep('asi');
  };

  const asiValid = (() => {
    if (!selected) return false;
    if (asiMode === 'all_one') return true;
    if (!plusTwo || !plusOne) return false;
    return plusTwo !== plusOne;
  })();

  const buildDeltas = (): Partial<Record<Ability, number>> => {
    if (!selected) return {};
    if (asiMode === 'all_one') {
      return Object.fromEntries(selected.abilityScores.map(a => [a, 1])) as Partial<Record<Ability, number>>;
    }
    const deltas: Partial<Record<Ability, number>> = {};
    if (plusTwo) deltas[plusTwo] = 2;
    if (plusOne) deltas[plusOne] = (deltas[plusOne] ?? 0) + 1;
    return deltas;
  };

  const miValid = !isMagicInitiate || (miCantrips.length === 2 && miSpell.length > 0);

  const gamingSetValid =
    !selected ||
    !backgroundRequiresGamingSetChoice(selected) ||
    gamingSetPick.trim().length > 0;

  const handleApply = () => {
    if (!selected || !asiValid || !gamingSetValid) return;
    if (isMagicInitiate) {
      if (!miValid) return;
      onConfirm({
        background: selected,
        asiDeltas: buildDeltas(),
        miCantrips,
        miSpell,
        ...(backgroundRequiresGamingSetChoice(selected) && gamingSetPick.trim()
          ? { gamingSetPick: gamingSetPick.trim() }
          : {}),
      });
    } else {
      onConfirm({
        background: selected,
        asiDeltas: buildDeltas(),
        ...(backgroundRequiresGamingSetChoice(selected) && gamingSetPick.trim()
          ? { gamingSetPick: gamingSetPick.trim() }
          : {}),
      });
    }
  };

  // ── PICK STEP ──────────────────────────────────────────────────────────────
  const PickStep = (
    <div className="flex flex-1 min-h-0">
      {/* List */}
      <div className="w-2/5 border-r border-slate-100 overflow-y-auto">
        <ul className="divide-y divide-slate-50">
          {filtered.map((bg) => (
            <li key={bg.name}>
              <button onClick={() => setSelected(bg)} className={cn(
                'w-full text-left px-4 py-3.5 transition-all hover:bg-slate-50',
                selected?.name === bg.name && 'bg-accent/5 border-l-2 border-accent'
              )}>
                <div className="font-bold text-sm text-slate-800">{bg.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{bg.skills[0]} · {bg.skills[1]}</div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-slate-400 text-sm italic">No backgrounds found</div>}
        </ul>
      </div>

      {/* Details */}
      <div className="w-3/5 overflow-y-auto">
        {selected ? (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-black text-xl text-slate-900">{selected.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">{selected.description}</p>
            </div>

            {/* Ability Scores */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Ability Score Increases</div>
              <div className="flex gap-2">
                {selected.abilityScores.map(a => (
                  <span key={a} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700">
                    {ABILITY_LABELS[a]}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Choose: +2 to one and +1 to another, or +1 to all three.</p>
            </div>

            {/* Feat */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Origin Feat</div>
              <div className="font-black text-sm text-slate-800">{selected.feat}</div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selected.featDescription}</p>
            </div>

            {/* Skills & Tool */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Skill Proficiencies</div>
                <div className="space-y-1">
                  {selected.skills.map(s => (
                    <div key={s} className="text-sm font-bold text-slate-700">{s}</div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Tool Proficiency</div>
                <div className="text-sm font-bold text-slate-700">{selected.toolProficiency}</div>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Equipment (Option A)</div>
              <div className="text-xs text-slate-500 leading-relaxed">{selected.equipmentA}</div>
              <div className="text-[10px] text-slate-400 mt-1.5 italic">Option B: 50 GP instead</div>
            </div>

            <button onClick={handleNext} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-black py-3 rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg shadow-accent/20">
              <span>Choose Ability Scores</span><ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 p-8">
            <BookOpen size={40} />
            <p className="text-sm font-bold text-center">Select a background to see its details</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── ASI STEP ───────────────────────────────────────────────────────────────
  const AsiStep = selected && (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <h3 className="font-black text-lg text-slate-900">Ability Score Increases</h3>
          <p className="text-xs text-slate-500 mt-1">
            Your <span className="font-bold text-accent">{selected.name}</span> background lets you increase these ability scores:
            {' '}<span className="font-bold text-slate-700">{selected.abilityScores.map(a => ABILITY_LABELS[a]).join(', ')}</span>.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-3">
          {(['two_one', 'all_one'] as AsiMode[]).map(mode => (
            <button key={mode} onClick={() => { setAsiMode(mode); setPlusTwo(null); setPlusOne(null); }}
              className={cn(
                'px-4 py-3 rounded-xl border-2 font-black text-sm transition-all',
                asiMode === mode ? 'bg-accent/10 border-accent text-accent' : 'bg-slate-50 border-slate-200 text-slate-500'
              )}>
              {mode === 'two_one' ? '+2 / +1' : '+1 / +1 / +1'}
              <div className="text-[10px] font-medium mt-0.5 opacity-70">
                {mode === 'two_one' ? 'One score +2, another +1' : 'All three scores +1'}
              </div>
            </button>
          ))}
        </div>

        {/* Score selectors — only for +2/+1 mode */}
        {asiMode === 'two_one' && (
          <div className="space-y-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Which score gets <span className="text-accent">+2</span>?</div>
              <div className="flex gap-2 flex-wrap">
                {selected.abilityScores.map(a => (
                  <button key={a} onClick={() => {
                    setPlusTwo(a);
                    if (plusOne === a) setPlusOne(null);
                  }} className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-black text-sm transition-all',
                    plusTwo === a ? 'bg-accent/10 border-accent text-accent' : 'bg-slate-50 border-slate-200 text-slate-600'
                  )}>
                    {plusTwo === a && <Check size={14} />}
                    {ABILITY_LABELS[a]} <span className="text-[10px] opacity-60">+2</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Which score gets <span className="text-emerald-500">+1</span>?</div>
              <div className="flex gap-2 flex-wrap">
                {selected.abilityScores.filter(a => a !== plusTwo).map(a => (
                  <button key={a} onClick={() => setPlusOne(a)} className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-black text-sm transition-all',
                    plusOne === a ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                  )}>
                    {plusOne === a && <Check size={14} />}
                    {ABILITY_LABELS[a]} <span className="text-[10px] opacity-60">+1</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* all_one preview */}
        {asiMode === 'all_one' && (
          <div className="flex gap-2 flex-wrap">
            {selected.abilityScores.map(a => (
              <div key={a} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
                <Check size={14} className="text-emerald-500" />
                <span className="font-black text-sm text-emerald-700">{ABILITY_LABELS[a]} +1</span>
              </div>
            ))}
          </div>
        )}

        {backgroundRequiresGamingSetChoice(selected) && (
          <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-teal-800">
              Gaming set — choose one ({gamingSetPick ? '1' : '0'}/1)
            </div>
            <p className="text-[10px] text-teal-900/80 leading-snug">
              Required for {selected.name} (PHB tool proficiency). Same set as in your starting equipment.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GAMING_SET_PHB_2024.map((setName) => {
                const picked = gamingSetPick === setName;
                return (
                  <button
                    key={setName}
                    type="button"
                    onClick={() => setGamingSetPick(picked ? '' : setName)}
                    className={cn(
                      'rounded border px-2 py-1 text-[10px] font-bold transition-all',
                      picked
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-400',
                    )}
                  >
                    {setName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        {asiValid && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Summary — What you get</div>
            <div className="text-xs font-bold text-slate-700">
              {Object.entries(buildDeltas()).map(([a, v]) => (
                <span key={a} className="mr-3">{ABILITY_LABELS[a]} <span className="text-accent">+{v}</span></span>
              ))}
            </div>
            <div className="text-xs text-slate-500">Skills: <span className="font-bold text-slate-700">{selected.skills.join(', ')}</span></div>
            <div className="text-xs text-slate-500">
              Tool:{' '}
              <span className="font-bold text-slate-700">
                {backgroundRequiresGamingSetChoice(selected) && gamingSetPick
                  ? `${selected.toolProficiency} → ${gamingSetPick}`
                  : selected.toolProficiency}
              </span>
            </div>
            <div className="text-xs text-slate-500">Feat: <span className="font-bold text-slate-700">{selected.feat}</span></div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
        <button
          type="button"
          onClick={() => setStep('pick')}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
        >
          <ChevronLeft size={16} /> Back
        </button>
        {isMagicInitiate ? (
          <button
            type="button"
            disabled={!asiValid || !gamingSetValid}
            onClick={() => setStep('mi')}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl transition-all text-sm uppercase tracking-widest"
          >
            <ChevronRight size={16} /> Magic Initiate spells
          </button>
        ) : (
          <button
            type="button"
            disabled={!asiValid || !gamingSetValid}
            onClick={() => handleApply()}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl transition-all text-sm uppercase tracking-widest"
          >
            <Plus size={16} /> Apply Background
          </button>
        )}
      </div>
    </div>
  );

  const miStepClass = selected?.feat.match(/\((\w+)\)/)?.[1] ?? '';
  const miCantripPool =
    selected && isMagicInitiate
      ? SPELL_LIST.filter(
          (sp) => sp.level === 0 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(miStepClass),
        )
          .map((sp) => sp.name)
          .sort()
      : [];
  const miLevel1Pool =
    selected && isMagicInitiate
      ? SPELL_LIST.filter(
          (sp) => sp.level === 1 && (SPELL_CLASS_MAP[sp.name] ?? []).includes(miStepClass),
        )
          .map((sp) => sp.name)
          .sort()
      : [];

  const MiStep = selected && isMagicInitiate && (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <h3 className="font-black text-lg text-slate-900">Magic Initiate</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Choose <span className="font-bold text-slate-700">two cantrips</span> and{' '}
            <span className="font-bold text-slate-700">one level 1 spell</span> from the{' '}
            <span className="font-bold text-accent">{miStepClass}</span> list for{' '}
            <span className="font-bold text-slate-800">{selected.feat}</span>.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-violet-700">
            Cantrips ({miCantrips.length}/2)
          </div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {miCantripPool.map((name) => {
              const picked = miCantrips.includes(name);
              const full = !picked && miCantrips.length >= 2;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    if (picked) setMiCantrips(miCantrips.filter((x) => x !== name));
                    else if (!full) setMiCantrips([...miCantrips, name]);
                  }}
                  disabled={full}
                  className={cn(
                    'rounded border px-2 py-1 text-[10px] font-bold transition-all',
                    picked
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-violet-700">
            Level 1 spell {miSpell ? '✓' : ''}
          </div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {miLevel1Pool.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setMiSpell(miSpell === name ? '' : name)}
                className={cn(
                  'rounded border px-2 py-1 text-[10px] font-bold transition-all',
                  miSpell === name
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-400',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-3 border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={() => setStep('asi')}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="button"
          disabled={!miValid || !gamingSetValid}
          onClick={() => handleApply()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} /> Apply Background
        </button>
      </div>
    </div>
  );

  const stepSequence = isMagicInitiate ? (['pick', 'asi', 'mi'] as const) : (['pick', 'asi'] as const);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <BookOpen size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">
                {step === 'pick'
                  ? 'Choose a Background'
                  : step === 'asi'
                    ? `${selected?.name ?? ''} — Ability Scores`
                    : `${selected?.name ?? ''} — Magic Initiate`}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">2024 Player's Handbook · 16 backgrounds</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {stepSequence.map((s) => (
                <div
                  key={s}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    step === s ? 'scale-125 bg-accent' : 'bg-slate-200',
                  )}
                />
              ))}
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search — pick step only */}
        {step === 'pick' && (
          <div className="px-6 py-3 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus type="text" placeholder="Search backgrounds..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-accent transition-colors" />
            </div>
          </div>
        )}

        {step === 'pick' && PickStep}
        {step === 'asi' && AsiStep}
        {step === 'mi' && MiStep}
      </div>
    </div>
  );
};
