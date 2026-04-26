import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPELL_LIST, SpellTemplate } from '@/data/spells';
import { SPELL_CLASS_MAP, SPELL_FILTER_CLASSES } from '@/data/spellClasses';

interface SpellPickerModalProps {
  currentLevel: number;
  onAdd: (spell: SpellTemplate) => void;
  onClose: () => void;
  /** Stack above level-up / other overlays */
  stackZClassName?: string;
  /** Only spells on this class list */
  lockClassFilter?: string;
  /** If set, only these spell levels (0 = cantrip) */
  restrictToLevels?: number[];
  /** Names already on the character or chosen this session */
  excludeSpellNames?: string[];
  /** Multi-pick: do not close after Add */
  persistOpen?: boolean;
  addButtonLabel?: string;
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Cantrips',
  1: '1st Level', 2: '2nd Level', 3: '3rd Level',
  4: '4th Level', 5: '5th Level', 6: '6th Level',
  7: '7th Level', 8: '8th Level', 9: '9th Level',
};

export const SpellPickerModal: React.FC<SpellPickerModalProps> = ({
  currentLevel,
  onAdd,
  onClose,
  stackZClassName = 'z-[200]',
  lockClassFilter,
  restrictToLevels,
  excludeSpellNames,
  persistOpen,
  addButtonLabel = 'Add to Spellbook',
}) => {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<number>(currentLevel === 0 ? -1 : currentLevel);
  const [filterClass, setFilterClass] = useState<string>(lockClassFilter ?? '');
  const [selected, setSelected] = useState<SpellTemplate | null>(null);

  useEffect(() => {
    if (lockClassFilter) setFilterClass(lockClassFilter);
  }, [lockClassFilter]);

  const filtered = useMemo(() => {
    const exclude = new Set(excludeSpellNames ?? []);
    return SPELL_LIST.filter((s) => {
      const matchesLevel = restrictToLevels
        ? restrictToLevels.includes(s.level)
        : filterLevel === -1 || s.level === filterLevel;
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      const effectiveClass = lockClassFilter || filterClass;
      const matchesClass =
        !effectiveClass || (SPELL_CLASS_MAP[s.name] ?? []).includes(effectiveClass);
      const notExcluded = !exclude.has(s.name);
      return matchesLevel && matchesSearch && matchesClass && notExcluded;
    });
  }, [search, filterLevel, filterClass, lockClassFilter, restrictToLevels, excludeSpellNames]);

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4', stackZClassName)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <BookOpen size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">Spell Library</h2>
              <p className="text-[11px] text-slate-400 font-medium">2024 Player's Handbook</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 shrink-0 space-y-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search spells by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Level filter */}
          {!restrictToLevels && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterLevel(-1)}
              className={cn(
                "px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border",
                filterLevel === -1 ? "bg-accent text-white border-accent" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-accent/50"
              )}
            >
              All
            </button>
            {Array.from({ length: 10 }, (_, i) => i).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border",
                  filterLevel === lvl ? "bg-accent text-white border-accent" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-accent/50"
                )}
              >
                {lvl === 0 ? 'Cantrip' : `Lvl ${lvl}`}
              </button>
            ))}
          </div>
          )}
          {restrictToLevels && (
            <p className="text-[11px] text-slate-500 font-bold">
              Showing: {restrictToLevels.map((l) => (l === 0 ? 'Cantrips' : `Level ${l}`)).join(', ')}
            </p>
          )}

          {/* Class filter */}
          {!lockClassFilter && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterClass('')}
              className={cn(
                "px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border",
                filterClass === '' ? "bg-slate-800 text-white border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400"
              )}
            >
              All Classes
            </button>
            {SPELL_FILTER_CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => setFilterClass(filterClass === cls ? '' : cls)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border",
                  filterClass === cls
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400"
                )}
              >
                {cls}
              </button>
            ))}
          </div>
          )}
          {lockClassFilter && (
            <p className="text-[11px] text-slate-500 font-bold">Class list: {lockClassFilter}</p>
          )}
        </div>

        {/* Content: list + detail panel */}
        <div className="flex flex-1 min-h-0">
          {/* Spell list */}
          <div className="w-1/2 border-r border-slate-100 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm italic">No spells found</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filtered.map((spell) => (
                  <li key={`${spell.level}-${spell.name}`}>
                    <button
                      onClick={() => setSelected(spell)}
                      className={cn(
                        "w-full text-left px-5 py-3 transition-all hover:bg-slate-50",
                        selected?.name === spell.name && "bg-accent/5 border-l-2 border-accent"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-800">{spell.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {spell.isConcentration && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">C</span>
                          )}
                          {spell.isRitual && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">R</span>
                          )}
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {LEVEL_LABELS[spell.level]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] text-slate-400">{spell.castingTime} · {spell.range}</span>
                        {/* Class tags for this spell */}
                        {SPELL_CLASS_MAP[spell.name] && (
                          <span className="text-[9px] text-slate-300 font-semibold truncate max-w-[120px]">
                            {SPELL_CLASS_MAP[spell.name].join(', ')}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail panel */}
          <div className="w-1/2 overflow-y-auto">
            {selected ? (
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-black text-xl text-slate-900">{selected.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {selected.level === 0 ? 'Cantrip' : `${LEVEL_LABELS[selected.level]} Spell`}
                    {selected.isRitual && ' · Ritual'}
                    {selected.isConcentration && ' · Concentration'}
                  </p>
                  {/* Class list in detail panel */}
                  {SPELL_CLASS_MAP[selected.name] && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {SPELL_CLASS_MAP[selected.name].map((cls) => (
                        <span
                          key={cls}
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border transition-all",
                            filterClass === cls
                              ? "bg-slate-800 text-white border-slate-800"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          )}
                        >
                          {cls}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Casting Time', value: selected.castingTime },
                    { label: 'Range',         value: selected.range },
                    { label: 'Components',    value: [selected.components.v && 'V', selected.components.s && 'S', selected.components.m && 'M'].filter(Boolean).join(', ') || '—' },
                    { label: 'Duration',      value: selected.isConcentration ? 'Concentration' : 'Instantaneous' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                      <div className="text-sm font-bold text-slate-700">{value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</div>
                  <p className="text-sm text-slate-600 leading-relaxed">{selected.description}</p>
                </div>

                <button
                  onClick={() => {
                    onAdd(selected);
                    if (!persistOpen) onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-black py-3 rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg shadow-accent/20"
                >
                  <Plus size={16} />
                  {addButtonLabel}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 p-8">
                <BookOpen size={40} />
                <p className="text-sm font-bold text-center">Select a spell to see its details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>{filtered.length} spell{filtered.length !== 1 ? 's' : ''} found</span>
          <span>
            {filterClass ? `Filtered to ${filterClass}` : 'All classes shown'} · Click a spell, then "Add to Spellbook"
          </span>
        </div>
      </div>
    </div>
  );
};
