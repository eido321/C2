import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEAT_LIST, FeatTemplate, FeatCategory } from '@/data/feats';
import { DND_CLASSES } from '@/config/constants';
import type { FeatureLibraryChoicePayload } from '@/lib/featPickerOrderChoices';
import {
  LIBRARY_CHOICE_ACCENT_STYLES,
  matchLibraryChoiceRule,
} from '@/lib/featureLibraryChoices';

const SOURCE_CLASS_SUB_SPLIT = ' — ';

/** Subclass library rows use `className` / `subclass`; fall back to parsing `source`. */
function getSubclassFeatureParts(f: FeatTemplate): { className: string; subclass: string } | null {
  if (f.category !== 'Subclass Feature') return null;
  if (f.className && f.subclass) return { className: f.className, subclass: f.subclass };
  const parts = f.source.split(SOURCE_CLASS_SUB_SPLIT);
  if (parts.length === 2) return { className: parts[0].trim(), subclass: parts[1].trim() };
  return null;
}

function sortClassesInPhbOrder(classes: string[]): string[] {
  const order = new Map<string, number>(DND_CLASSES.map((c, i) => [c, i]));
  return [...classes].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b),
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match name/source by substring; match description by whole words only (so "alert" does not match "particularly"). */
function matchesFeatureSearch(query: string, f: FeatTemplate): boolean {
  const q = query.trim();
  if (!q) return true;
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    if (f.name.toLowerCase().includes(token)) return true;
    if (f.source.toLowerCase().includes(token)) return true;
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
    return re.test(f.description);
  });
}

interface FeatPickerModalProps {
  defaultCategory?: FeatCategory;
  /**
   * Limits which categories appear (e.g. class feature summaries vs feats/traits).
   * Omit for the full library (level builders, etc.).
   */
  allowedCategories?: FeatCategory[];
  /** Current character class — used for Divine Order / Primal Order branch picks. */
  characterClass?: string;
  onAdd: (feat: FeatTemplate, libraryChoice?: FeatureLibraryChoicePayload) => void;
  onClose: () => void;
  /** Stacking above other overlays (e.g. level-up modal at z-300). */
  stackZClassName?: string;
}

const CATEGORY_LABELS: Record<FeatCategory, string> = {
  'Feat': 'Feats',
  'Class Feature': 'Class Features',
  'Subclass Feature': 'Subclass Features',
  'Racial Trait': 'Racial Traits',
};

const CATEGORY_COLORS: Record<FeatCategory, string> = {
  'Feat': 'bg-violet-50 text-violet-600 border-violet-200',
  'Class Feature': 'bg-blue-50 text-blue-600 border-blue-200',
  'Subclass Feature': 'bg-amber-50 text-amber-700 border-amber-200',
  'Racial Trait': 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

export const FeatPickerModal: React.FC<FeatPickerModalProps> = ({
  defaultCategory,
  allowedCategories,
  characterClass,
  onAdd,
  onClose,
  stackZClassName = 'z-[200]',
}) => {
  const catalog = useMemo(() => {
    if (!allowedCategories?.length) return FEAT_LIST;
    const allow = new Set(allowedCategories);
    return FEAT_LIST.filter((f) => allow.has(f.category));
  }, [allowedCategories?.join('|') ?? '']);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<FeatCategory | 'All'>(() => {
    if (allowedCategories?.length === 1) return allowedCategories[0];
    if (defaultCategory && (!allowedCategories || allowedCategories.includes(defaultCategory))) {
      return defaultCategory;
    }
    return 'All';
  });
  /** Base class (class + subclass features); mutual exclusive with filterOther when set. */
  const [filterClass, setFilterClass] = useState<string>('All');
  /** Narrow subclass when filterClass is set (subclass features only). */
  const [filterSubclass, setFilterSubclass] = useState<string>('All');
  /** Feat / racial trait source (General, Origin, species name, …). */
  const [filterOther, setFilterOther] = useState<string>('All');
  const [selected, setSelected] = useState<FeatTemplate | null>(null);
  /** Option id from `LIBRARY_CHOICE_RULES` when the selected row requires a branch pick */
  const [libraryChoiceOptionId, setLibraryChoiceOptionId] = useState<string | null>(null);

  const choiceRule = useMemo(
    () => matchLibraryChoiceRule(selected, characterClass),
    [selected, characterClass],
  );

  useEffect(() => {
    setLibraryChoiceOptionId(null);
  }, [selected?.name, selected?.source, selected?.description, selected?.category]);

  const categoryTabs = useMemo((): (FeatCategory | 'All')[] => {
    if (!allowedCategories?.length)
      return ['All', 'Feat', 'Class Feature', 'Subclass Feature', 'Racial Trait'];
    if (allowedCategories.length === 1) return [];
    return ['All', ...allowedCategories];
  }, [allowedCategories?.join('|') ?? '']);

  const baseForFilters = useMemo(() => {
    return filterCategory === 'All' ? catalog : catalog.filter((f) => f.category === filterCategory);
  }, [filterCategory, catalog]);

  const classNamesForFilter = useMemo(() => {
    const set = new Set<string>();
    for (const f of baseForFilters) {
      if (f.category === 'Class Feature') set.add(f.source);
      if (f.category === 'Subclass Feature') {
        const p = getSubclassFeatureParts(f);
        if (p) set.add(p.className);
      }
    }
    return sortClassesInPhbOrder([...set]);
  }, [baseForFilters]);

  const subclassesForFilter = useMemo(() => {
    if (filterClass === 'All') return [];
    const set = new Set<string>();
    for (const f of baseForFilters) {
      if (f.category !== 'Subclass Feature') continue;
      const p = getSubclassFeatureParts(f);
      if (p && p.className === filterClass) set.add(p.subclass);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [baseForFilters, filterClass]);

  const otherSourcesForFilter = useMemo(() => {
    const set = new Set<string>();
    for (const f of baseForFilters) {
      if (f.category === 'Feat' || f.category === 'Racial Trait') set.add(f.source);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [baseForFilters]);

  const showClassFilter =
    (filterCategory === 'All' || filterCategory === 'Class Feature' || filterCategory === 'Subclass Feature') &&
    classNamesForFilter.length > 0;

  const showSubclassFilter =
    filterClass !== 'All' &&
    (filterCategory === 'All' || filterCategory === 'Subclass Feature') &&
    subclassesForFilter.length > 0;

  const showOtherSourceFilter =
    (filterCategory === 'All' || filterCategory === 'Feat' || filterCategory === 'Racial Trait') &&
    otherSourcesForFilter.length > 0;

  const filtered = useMemo(() => {
    return catalog.filter((f) => {
      const matchesCategory = filterCategory === 'All' || f.category === filterCategory;

      let matchesSource = true;
      if (filterOther !== 'All') {
        matchesSource = f.source === filterOther;
      } else if (filterClass !== 'All') {
        if (f.category === 'Subclass Feature') {
          const p = getSubclassFeatureParts(f);
          if (!p || p.className !== filterClass) matchesSource = false;
          else if (filterSubclass !== 'All' && p.subclass !== filterSubclass) matchesSource = false;
        } else if (f.category === 'Class Feature') {
          matchesSource = f.source === filterClass;
        } else {
          matchesSource = false;
        }
      }

      return matchesCategory && matchesSource && matchesFeatureSearch(search, f);
    });
  }, [search, filterCategory, filterClass, filterSubclass, filterOther, catalog]);

  const handleCategoryChange = (cat: FeatCategory | 'All') => {
    if (allowedCategories?.length === 1) return;
    if (cat !== 'All' && allowedCategories?.length && !allowedCategories.includes(cat as FeatCategory)) return;
    setFilterCategory(cat);
    setFilterClass('All');
    setFilterSubclass('All');
    setFilterOther('All');
    setSelected(null);
  };

  const sameEntry = (a: FeatTemplate | null, b: FeatTemplate) =>
    !!a &&
    a.category === b.category &&
    a.source === b.source &&
    a.name === b.name &&
    a.description === b.description &&
    a.acquiredAtLevel === b.acquiredAtLevel;

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4', stackZClassName)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Award size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">Feature Library</h2>
              <p className="text-[11px] text-slate-400 font-medium">2024 PHB — class & subclass features, feats, species traits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 shrink-0 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, description, or source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Category filter */}
          {categoryTabs.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {categoryTabs.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border",
                    filterCategory === cat
                      ? "bg-accent text-white border-accent"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-accent/50"
                  )}
                >
                  {cat === 'All' ? 'All' : CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}

          {/* Class → subclass (replaces one flat chip per "Class — Subclass" source) */}
          {showClassFilter && (
            <div className="space-y-1.5">
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Class</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterClass('All');
                    setFilterSubclass('All');
                    setFilterOther('All');
                    setSelected(null);
                  }}
                  className={cn(
                    'px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all border',
                    filterClass === 'All'
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400',
                  )}
                >
                  All
                </button>
                {classNamesForFilter.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setFilterClass(cls);
                      setFilterSubclass('All');
                      setFilterOther('All');
                      setSelected(null);
                    }}
                    className={cn(
                      'px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all border',
                      filterClass === cls
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400',
                    )}
                  >
                    {cls}
                  </button>
                ))}
              </div>
              {showSubclassFilter && (
                <div className="flex gap-1.5 flex-wrap items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Subclass</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSubclass('All');
                      setSelected(null);
                    }}
                    className={cn(
                      'px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all border',
                      filterSubclass === 'All'
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400',
                    )}
                  >
                    All {filterClass}
                  </button>
                  {subclassesForFilter.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        setFilterSubclass(sub);
                        setSelected(null);
                      }}
                      className={cn(
                        'px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all border',
                        filterSubclass === sub
                          ? 'bg-amber-700 text-white border-amber-700'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400',
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feat / species sources (General, Origin, race names, …) */}
          {showOtherSourceFilter && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0">Source</span>
              <button
                type="button"
                onClick={() => {
                  setFilterOther('All');
                  setFilterClass('All');
                  setFilterSubclass('All');
                  setSelected(null);
                }}
                className={cn(
                  'px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all border',
                  filterOther === 'All'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400',
                )}
              >
                All
              </button>
              {otherSourcesForFilter.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setFilterOther(src);
                    setFilterClass('All');
                    setFilterSubclass('All');
                    setSelected(null);
                  }}
                  className={cn(
                    'px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all border',
                    filterOther === src
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400',
                  )}
                >
                  {src}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* List */}
          <div className="w-1/2 border-r border-slate-100 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm italic">No features found</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filtered.map((feat, i) => (
                  <li
                    key={`${feat.category}-${feat.source}-${feat.name}-${feat.acquiredAtLevel ?? 'x'}-${i}`}
                  >
                    <button
                      onClick={() => setSelected(feat)}
                      className={cn(
                        "w-full text-left px-5 py-3 transition-all hover:bg-slate-50",
                        sameEntry(selected, feat) && "bg-accent/5 border-l-2 border-accent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-slate-800 leading-tight">{feat.name}</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded shrink-0 mt-0.5",
                          CATEGORY_COLORS[feat.category]
                        )}>
                          {feat.category === 'Class Feature'
                            ? 'Class'
                            : feat.category === 'Subclass Feature'
                              ? 'Subclass'
                              : feat.category === 'Racial Trait'
                                ? 'Racial'
                                : 'Feat'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {feat.source}
                        {feat.category === 'Class Feature' && feat.acquiredAtLevel != null
                          ? ` · class level ${feat.acquiredAtLevel}`
                          : ''}
                        {feat.category === 'Subclass Feature' && feat.acquiredAtLevel != null
                          ? ` · subclass level ${feat.acquiredAtLevel}`
                          : ''}
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded",
                      CATEGORY_COLORS[selected.category]
                    )}>
                      {selected.category}
                    </span>
                  </div>
                  <h3 className="font-black text-xl text-slate-900">{selected.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Source: {selected.source}
                    {selected.category === 'Class Feature' && selected.acquiredAtLevel != null
                      ? ` · class level ${selected.acquiredAtLevel}`
                      : ''}
                    {selected.category === 'Subclass Feature' && selected.acquiredAtLevel != null
                      ? ` · subclass level ${selected.acquiredAtLevel}`
                      : ''}
                  </p>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</div>
                  <p className="text-sm text-slate-600 leading-relaxed">{selected.description}</p>
                </div>

                {choiceRule && (
                  <div
                    className={cn(
                      'rounded-xl border p-3 space-y-2',
                      LIBRARY_CHOICE_ACCENT_STYLES[choiceRule.accent].border,
                      LIBRARY_CHOICE_ACCENT_STYLES[choiceRule.accent].bg,
                    )}
                  >
                    <div
                      className={cn(
                        'text-[10px] font-black uppercase tracking-widest',
                        LIBRARY_CHOICE_ACCENT_STYLES[choiceRule.accent].title,
                      )}
                    >
                      {choiceRule.title}
                    </div>
                    <p
                      className={cn(
                        'text-[11px] leading-relaxed',
                        LIBRARY_CHOICE_ACCENT_STYLES[choiceRule.accent].text,
                      )}
                    >
                      {choiceRule.blurb}
                    </p>
                    <div
                      className={cn(
                        'grid gap-2',
                        choiceRule.options.length <= 2
                          ? 'grid-cols-2'
                          : choiceRule.options.length === 3
                            ? 'grid-cols-3'
                            : 'grid-cols-2 sm:grid-cols-3',
                      )}
                    >
                      {choiceRule.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setLibraryChoiceOptionId(o.id)}
                          className={cn(
                            'rounded-lg border px-2 py-2 text-left text-[11px] font-bold transition-colors',
                            libraryChoiceOptionId === o.id
                              ? LIBRARY_CHOICE_ACCENT_STYLES[choiceRule.accent].chip
                              : LIBRARY_CHOICE_ACCENT_STYLES[choiceRule.accent].chipInactive,
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!selected) return;
                    if (choiceRule && !libraryChoiceOptionId) return;

                    let featOut: FeatTemplate = selected;
                    let payload: FeatureLibraryChoicePayload | undefined;

                    if (choiceRule && libraryChoiceOptionId) {
                      const built = choiceRule.build(selected, libraryChoiceOptionId);
                      featOut = built.feat;
                      payload = built.payload;
                    }

                    onAdd(featOut, payload);
                    onClose();
                  }}
                  disabled={!selected || (!!choiceRule && !libraryChoiceOptionId)}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg shadow-accent/20"
                >
                  <Plus size={16} />
                  Add to Sheet
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 p-8">
                <Award size={40} />
                <p className="text-sm font-bold text-center">Select a feature to see its details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'} found</span>
          <span>Click an entry, then "Add to Sheet"</span>
        </div>
      </div>
    </div>
  );
};
