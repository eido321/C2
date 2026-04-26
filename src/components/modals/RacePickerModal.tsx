import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Shield, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RACE_LIST, RaceTemplate, LineageOption, buildRaceFeatures } from '@/data/races';
import { FEAT_LIST, FeatTemplate } from '@/data/feats';

interface RacePickerModalProps {
  onConfirm: (race: RaceTemplate, features: ReturnType<typeof buildRaceFeatures>) => void;
  onClose: () => void;
}

type Step = 'race' | 'lineage' | 'feat' | 'skill_1';

export const RacePickerModal: React.FC<RacePickerModalProps> = ({ onConfirm, onClose }) => {
  const [step, setStep] = useState<Step>('race');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RaceTemplate | null>(null);

  const [chosenFeat, setChosenFeat] = useState<FeatTemplate | null>(null);
  const [chosenSkill, setChosenSkill] = useState<string>('');
  const [chosenLineage, setChosenLineage] = useState<LineageOption | null>(null);
  const [featSearch, setFeatSearch] = useState('');

  const filteredRaces = useMemo(() =>
    RACE_LIST.filter(r => r.name.toLowerCase().includes(search.toLowerCase())), [search]);

  const filteredFeats = useMemo(() =>
    FEAT_LIST.filter(f => f.isOrigin && f.name.toLowerCase().includes(featSearch.toLowerCase())),
    [featSearch]);

  const handleSelectRace = (race: RaceTemplate) => {
    setSelected(race);
    setChosenFeat(null);
    setChosenSkill('');
    setChosenLineage(null);
  };

  const handleNext = () => {
    if (!selected) return;
    const type = selected.bonusChoice?.type;
    if (type === 'lineage') { setStep('lineage'); return; }
    if (type === 'feat')    { setStep('feat'); return; }
    if (type === 'skill_1') { setStep('skill_1'); return; }
    applyRace();
  };

  const applyRace = () => {
    if (!selected) return;
    onConfirm(selected, buildRaceFeatures(selected, chosenFeat, chosenSkill || undefined, chosenLineage));
  };

  // ── RACE STEP ──────────────────────────────────────────────────────────────
  const RaceStep = (
    <div className="flex flex-1 min-h-0">
      <div className="w-2/5 border-r border-slate-100 overflow-y-auto">
        <ul className="divide-y divide-slate-50">
          {filteredRaces.map((race) => (
            <li key={race.name}>
              <button onClick={() => handleSelectRace(race)} className={cn(
                'w-full text-left px-4 py-3 transition-all hover:bg-slate-50',
                selected?.name === race.name && 'bg-accent/5 border-l-2 border-accent'
              )}>
                <div className="font-bold text-sm text-slate-800">{race.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{race.size} · {race.speed} ft · {race.languages.join(', ')}</div>
              </button>
            </li>
          ))}
          {filteredRaces.length === 0 && <div className="text-center py-12 text-slate-400 text-sm italic">No species found</div>}
        </ul>
      </div>

      <div className="w-3/5 overflow-y-auto">
        {selected ? (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-black text-xl text-slate-900">{selected.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{selected.size} · Speed {selected.speed} ft</p>
              <p className="text-xs text-slate-500">Languages: {selected.languages.join(', ')}</p>
              <p className="text-sm text-slate-600 leading-relaxed mt-3">{selected.description}</p>
            </div>
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Species Traits</div>
              {selected.traits.map((t) => (
                <div key={t.name} className="bg-slate-50 rounded-xl p-3">
                  <div className="font-black text-xs text-slate-800 mb-1">{t.name}</div>
                  <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{t.description}</div>
                </div>
              ))}
              {selected.bonusChoice && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                  <div className="font-black text-xs text-accent mb-1">✦ Choice Required</div>
                  <div className="text-xs text-slate-500">{selected.bonusChoice.label} — choose on the next step.</div>
                </div>
              )}
            </div>
            <button onClick={handleNext} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-black py-3 rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg shadow-accent/20">
              {selected.bonusChoice ? <><span>Next</span><ChevronRight size={16} /></> : <><Plus size={16} /><span>Select Species</span></>}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 p-8">
            <Shield size={40} />
            <p className="text-sm font-bold text-center">Select a species to see its traits</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── LINEAGE STEP ───────────────────────────────────────────────────────────
  const LineageStep = (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="px-6 py-3 border-b border-slate-100 shrink-0">
        <p className="text-sm font-bold text-slate-700">{selected?.bonusChoice?.label}</p>
        <p className="text-xs text-slate-400 mt-0.5">Click an option to read its details, then confirm.</p>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-2/5 border-r border-slate-100 overflow-y-auto">
          <ul className="divide-y divide-slate-50">
            {(selected?.bonusChoice?.lineageOptions ?? []).map((opt) => (
              <li key={opt.name}>
                <button onClick={() => setChosenLineage(opt)} className={cn(
                  'w-full text-left px-4 py-3.5 transition-all hover:bg-slate-50 flex items-center justify-between gap-2',
                  chosenLineage?.name === opt.name && 'bg-accent/5 border-l-2 border-accent'
                )}>
                  <span className="font-bold text-sm text-slate-800">{opt.name}</span>
                  {chosenLineage?.name === opt.name && <Check size={14} className="text-accent shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-3/5 overflow-y-auto p-5">
          {chosenLineage ? (
            <div className="space-y-3">
              <h4 className="font-black text-lg text-slate-900">{chosenLineage.name}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{chosenLineage.description}</p>
              {chosenLineage.traits.map((t) => (
                <div key={t.name} className="bg-slate-50 rounded-xl p-3">
                  <div className="font-black text-xs text-slate-800 mb-1">{t.name}</div>
                  <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{t.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm italic">Select an option</div>
          )}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
        <button onClick={() => setStep('race')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={applyRace} disabled={!chosenLineage} className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl transition-all text-sm uppercase tracking-widest">
          <Plus size={16} /> Select Species
        </button>
      </div>
    </div>
  );

  // ── FEAT STEP ──────────────────────────────────────────────────────────────
  const FeatStep = (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="px-6 py-3 border-b border-slate-100 shrink-0">
        <p className="text-sm font-bold text-slate-700 mb-2">
          As a <span className="text-accent">{selected?.name}</span>, your <span className="text-slate-900">Versatile</span> trait grants one Origin feat of your choice.
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus type="text" placeholder="Search feats..." value={featSearch}
            onChange={(e) => setFeatSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-accent transition-colors" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-2/5 border-r border-slate-100 overflow-y-auto">
          <ul className="divide-y divide-slate-50">
            {filteredFeats.map((feat) => (
              <li key={feat.name}>
                <button onClick={() => setChosenFeat(feat)} className={cn(
                  'w-full text-left px-4 py-3 transition-all hover:bg-slate-50 flex items-center justify-between gap-2',
                  chosenFeat?.name === feat.name && 'bg-accent/5 border-l-2 border-accent'
                )}>
                  <span className="font-bold text-sm text-slate-800">{feat.name}</span>
                  {chosenFeat?.name === feat.name && <Check size={14} className="text-accent shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-3/5 overflow-y-auto p-5">
          {chosenFeat ? (
            <div className="space-y-3">
              <h4 className="font-black text-lg text-slate-900">{chosenFeat.name}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{chosenFeat.description}</p>
            </div>
          ) : <div className="flex items-center justify-center h-full text-slate-300 text-sm italic">Select a feat</div>}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
        <button onClick={() => setStep('race')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={applyRace} disabled={!chosenFeat} className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl transition-all text-sm uppercase tracking-widest">
          <Plus size={16} /> Select Species
        </button>
      </div>
    </div>
  );

  // ── SKILL STEP ─────────────────────────────────────────────────────────────
  const SkillStep = (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="px-6 py-3 border-b border-slate-100 shrink-0">
        <p className="text-sm font-bold text-slate-700">{selected?.bonusChoice?.label}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          {(selected?.bonusChoice?.skillOptions ?? []).map((skill) => (
            <button key={skill} onClick={() => setChosenSkill(skill)} className={cn(
              'flex items-center justify-between px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all',
              chosenSkill === skill ? 'bg-accent/10 border-accent text-accent' : 'bg-slate-50 border-slate-200 text-slate-600'
            )}>
              {skill}
              {chosenSkill === skill && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
        <button onClick={() => setStep('race')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={applyRace} disabled={!chosenSkill} className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl transition-all text-sm uppercase tracking-widest">
          <Plus size={16} /> Select Species
        </button>
      </div>
    </div>
  );

  const STEP_TITLES: Record<Step, string> = {
    race: 'Choose a Species',
    lineage: selected?.bonusChoice?.label ?? 'Choose a Lineage',
    feat: 'Choose an Origin Feat',
    skill_1: selected?.bonusChoice?.label ?? 'Choose a Skill',
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Shield size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">{STEP_TITLES[step]}</h2>
              <p className="text-[11px] text-slate-400 font-medium">2024 Player's Handbook</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selected?.bonusChoice && (
              <div className="flex items-center gap-1.5">
                {(['race', selected.bonusChoice.type] as const).map((s, i) => (
                  <div key={i} className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    (step === 'race' ? i === 0 : i === 1) ? 'bg-accent scale-125' : i === 0 ? 'bg-accent/40' : 'bg-slate-200'
                  )} />
                ))}
              </div>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search — race step only */}
        {step === 'race' && (
          <div className="px-6 py-3 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus type="text" placeholder="Search species..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-accent transition-colors" />
            </div>
          </div>
        )}

        {step === 'race'    && RaceStep}
        {step === 'lineage' && LineageStep}
        {step === 'feat'    && FeatStep}
        {step === 'skill_1' && SkillStep}
      </div>
    </div>
  );
};
