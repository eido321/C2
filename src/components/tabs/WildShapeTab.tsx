import React, { useMemo, useState } from 'react';
import {
  PawPrint,
  ChevronDown,
  ChevronUp,
  Star,
  Coffee,
  Bed,
  Moon,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { Character } from '@/types';
import { cn, getModifier } from '@/lib/utils';
import {
  WILD_SHAPE_BEASTS,
  getWildShapeRules,
  filterBeastsForWildShape,
  formatCr,
  type WildShapeBeast,
} from '@/data/wildShape';

interface Props {
  character: Character;
  onUpdate: (c: Character) => void;
}

function ensureWildShape(c: Character): NonNullable<Character['wildShape']> {
  return c.wildShape ?? { usesExpended: 0, bookmarkedBeastIds: [], primalOrder: null };
}

function beastSkillsDisplay(
  edit: Record<string, string> | undefined,
  beast: WildShapeBeast,
): { line: string; hasOverride: boolean } {
  if (edit && Object.prototype.hasOwnProperty.call(edit, beast.id)) {
    return { line: edit[beast.id] ?? '', hasOverride: true };
  }
  return { line: beast.skills ?? '', hasOverride: false };
}

export const WildShapeTab: React.FC<Props> = ({ character, onUpdate }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rules = useMemo(
    () => getWildShapeRules(character.level, character.subclass),
    [character.level, character.subclass],
  );

  const wisMod = getModifier(character.abilities.wis);

  const eligible = useMemo(
    () => filterBeastsForWildShape(WILD_SHAPE_BEASTS, rules),
    [rules],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        formatCr(b.cr).toLowerCase().includes(q),
    );
  }, [eligible, search]);

  const ws = ensureWildShape(character);
  const maxUses = rules.usesPerRest;
  const remaining = Math.max(0, maxUses - ws.usesExpended);

  const bookmarked = useMemo(
    () =>
      ws.bookmarkedBeastIds
        .map((id) => WILD_SHAPE_BEASTS.find((b) => b.id === id))
        .filter((b): b is WildShapeBeast => !!b),
    [ws.bookmarkedBeastIds],
  );

  const setWs = (next: NonNullable<Character['wildShape']>) => {
    onUpdate({ ...character, wildShape: next });
  };

  const expendUse = () => {
    if (!rules.hasWildShape || maxUses <= 0) return;
    if (ws.usesExpended >= maxUses) return;
    setWs({ ...ws, usesExpended: ws.usesExpended + 1 });
  };

  /** 2024 PHB: regain 1 expended use after a Short Rest */
  const shortRestRegain = () => {
    if (ws.usesExpended <= 0) return;
    setWs({ ...ws, usesExpended: ws.usesExpended - 1 });
  };

  /** 2024 PHB: regain all expended uses after a Long Rest */
  const longRestRegain = () => {
    setWs({ ...ws, usesExpended: 0 });
  };

  /** 2024 PHB Archdruid: at Initiative, if you have no uses left, regain one */
  const archdruidInitiativeRefill = () => {
    if (!rules.hasArchdruid || maxUses <= 0) return;
    if (remaining > 0) return;
    setWs({ ...ws, usesExpended: Math.max(0, ws.usesExpended - 1) });
  };

  const toggleBookmark = (id: string) => {
    const set = new Set(ws.bookmarkedBeastIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setWs({ ...ws, bookmarkedBeastIds: [...set] });
  };

  if (character.class !== 'Druid') {
    return (
      <div className="space-y-8">
        <div className="stat-card space-y-4">
          <div className="section-header">
            <PawPrint size={18} className="text-emerald-600" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Wild Shape</h3>
              <p className="text-[10px] text-muted mt-0.5">Druid class feature (2024 Player&apos;s Handbook).</p>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Your class is <span className="font-bold text-slate-800">{character.class}</span>. Wild Shape is only on the Druid class table.
            Turn this tab on in <span className="font-semibold">Settings → Tab visibility</span> when you play a Druid, or use it as a reference while building.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="stat-card space-y-4">
        <div className="section-header">
          <Star size={18} className="text-amber-600" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Primal Order (level 1)</h3>
            <p className="text-[10px] text-muted mt-0.5 leading-relaxed">
              Choose one role from the 2024 PHB. Only <span className="font-bold text-slate-700">Magician</span> adds an extra
              Druid cantrip (spell budget). Warden grants martial weapons and Medium armor instead.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {(
            [
              {
                id: 'magician' as const,
                title: 'Magician',
                body: 'One extra Druid cantrip (doesn’t count vs normal cantrip total); Arcana or Nature bonus.',
              },
              {
                id: 'warden' as const,
                title: 'Warden',
                body: 'Martial weapons; training with Medium armor.',
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setWs({ ...ws, primalOrder: opt.id })}
              className={cn(
                'text-left rounded-xl border p-3 transition-colors',
                ws.primalOrder === opt.id
                  ? 'border-amber-500 bg-zinc-800 ring-1 ring-amber-400/35'
                  : 'border-zinc-600 bg-zinc-800/50 hover:border-zinc-500',
              )}
            >
              <div
                className={cn(
                  'text-xs font-black',
                  ws.primalOrder === opt.id ? 'text-zinc-100' : 'text-zinc-200',
                )}
              >
                {opt.title}
              </div>
              <p
                className={cn(
                  'text-[10px] mt-1 leading-relaxed',
                  ws.primalOrder === opt.id ? 'text-zinc-400' : 'text-muted',
                )}
              >
                {opt.body}
              </p>
            </button>
          ))}
        </div>
        {!ws.primalOrder && (
          <p className="text-[10px] text-amber-800 font-medium">
            Pick Magician or Warden so cantrip limits match your build.
          </p>
        )}
      </div>

      <div className="stat-card space-y-5">
        <div className="section-header">
          <PawPrint size={18} className="text-emerald-600" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Wild Shape</h3>
            <p className="text-[10px] text-muted mt-0.5">
              2024 Player&apos;s Handbook — Druid class. Bonus Action to assume a beast you have seen; mental stats stay yours.
            </p>
          </div>
        </div>

        {!rules.hasWildShape && (
          <p className="text-sm text-muted italic">
            You gain Wild Shape at Druid level 2.
          </p>
        )}

        {rules.hasWildShape && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                  Your limits at level {character.level}
                </div>
                <ul className="text-[11px] text-emerald-900 space-y-1 list-disc list-inside leading-relaxed">
                  <li>
                    Max beast CR:{' '}
                    <span className="font-black">
                      {rules.maxCr === Infinity ? 'None (Archdruid)' : formatCr(rules.maxCr)}
                    </span>
                  </li>
                  <li>
                    Swim speed: {rules.allowSwim ? 'Allowed' : 'Not until level 4'}
                  </li>
                  <li>
                    Fly speed: {rules.allowFly ? 'Allowed' : 'Not until level 7'}
                  </li>
                  <li>
                    Uses (pool):{' '}
                    <span className="font-black">
                      {remaining}/{maxUses} available
                    </span>
                  </li>
                </ul>
                <p className="text-[10px] text-emerald-900/90 leading-snug pt-1 border-t border-emerald-200/80">
                  <span className="font-black">Rest:</span> regain{' '}
                  <span className="font-black">1</span> use after a Short Rest; regain{' '}
                  <span className="font-black">all</span> uses after a Long Rest (2024 PHB).
                </p>
                {rules.hasArchdruid && (
                  <p className="text-[10px] text-emerald-900/90 leading-snug pt-1 border-t border-emerald-200/80">
                    <span className="font-black">Archdruid:</span> when you roll Initiative, if you have{' '}
                    <span className="font-black">no</span> uses left, you regain{' '}
                    <span className="font-black">one</span> use (pool still caps at {maxUses}).
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                  <BookOpen size={12} /> On transforming
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  You take the beast&apos;s game statistics except mental scores; you keep your alignment, personality, and memories.
                  You can&apos;t cast spells in beast form (until Beast Spells at 18th level, with limits). You keep concentration.
                  Revert at 0 beast HP (overflow damage applies) or as a Bonus Action.
                </p>
                <p className="text-[11px] text-slate-700 font-semibold">
                  Temp HP when you transform: equal to your Druid level (2024 PHB).
                </p>
                {rules.isMoon && character.level >= 3 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="text-[10px] font-black uppercase text-indigo-700 flex items-center gap-1">
                      <Moon size={12} /> Circle of the Moon — Circle Forms
                    </div>
                    <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                      Max CR also follows Druid level ÷ 3 (round down), combined with the class table (use the higher result shown left).
                      AC = max(beast AC, 13 + WIS modifier). Temp HP = 3 × Druid level when you use this circle&apos;s Wild Shape.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={expendUse}
                disabled={remaining === 0}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all',
                  remaining === 0
                    ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                    : 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700',
                )}
              >
                Use Wild Shape
              </button>
              <button
                type="button"
                onClick={shortRestRegain}
                disabled={ws.usesExpended <= 0}
                title="Regain 1 expended use (2024 PHB)"
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all',
                  ws.usesExpended <= 0
                    ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                    : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50',
                )}
              >
                <Coffee size={14} />
                Short rest (+1 use)
              </button>
              <button
                type="button"
                onClick={longRestRegain}
                title="Regain all expended uses (2024 PHB)"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 transition-all"
              >
                <Bed size={14} />
                Long rest (full)
              </button>
              {rules.hasArchdruid && (
                <button
                  type="button"
                  onClick={archdruidInitiativeRefill}
                  disabled={remaining > 0}
                  title="2024 PHB Archdruid: when you roll Initiative with no Wild Shape uses left, regain one use"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all',
                    remaining > 0
                      ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                      : 'border-emerald-200 text-emerald-800 hover:bg-emerald-100',
                  )}
                >
                  <RotateCcw size={14} />
                  Initiative refill (Archdruid)
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {rules.hasWildShape && (
        <div className="stat-card space-y-4">
          <div className="section-header">
            <PawPrint size={18} className="text-accent" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Beast stat blocks</h3>
              <p className="text-[10px] text-muted mt-0.5">
                SRD-style summaries for common Wild Shape choices. Only beasts at or under your max CR and allowed movement types are listed.
              </p>
            </div>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or CR…"
            className="w-full max-w-md px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-accent"
          />

          {bookmarked.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-600" />
                Bookmarked
              </div>
              <div className="flex flex-wrap gap-2">
                {bookmarked.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                  >
                    {b.name} (CR {formatCr(b.cr)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
            {filtered.map((b) => {
              const { line: skillsLine, hasOverride: skillsHasOverride } = beastSkillsDisplay(
                ws.beastSkillsEdit,
                b,
              );
              return (
                <div key={b.id}>
                  <WildShapeBeastRow
                    beast={b}
                    expanded={expandedId === b.id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === b.id ? null : b.id)
                    }
                    bookmarked={ws.bookmarkedBeastIds.includes(b.id)}
                    onToggleBookmark={() => toggleBookmark(b.id)}
                    wisMod={wisMod}
                    isMoon={rules.isMoon && character.level >= 3}
                    skillsLine={skillsLine}
                    skillsHasOverride={skillsHasOverride}
                    onSkillsLineChange={(value) => {
                      const prev = ws.beastSkillsEdit ?? {};
                      setWs({ ...ws, beastSkillsEdit: { ...prev, [b.id]: value } });
                    }}
                    onSkillsLineReset={() => {
                      const prev = ws.beastSkillsEdit ?? {};
                      if (!Object.prototype.hasOwnProperty.call(prev, b.id)) return;
                      const next = { ...prev };
                      delete next[b.id];
                      setWs({
                        ...ws,
                        beastSkillsEdit:
                          Object.keys(next).length > 0 ? next : undefined,
                      });
                    }}
                  />
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted italic py-8 text-center">
                No beasts match your current limits and search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface WildShapeBeastRowProps {
  beast: WildShapeBeast;
  expanded: boolean;
  onToggleExpand: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  wisMod: number;
  isMoon: boolean;
  skillsLine: string;
  skillsHasOverride: boolean;
  onSkillsLineChange: (value: string) => void;
  onSkillsLineReset: () => void;
}

function WildShapeBeastRow({
  beast,
  expanded,
  onToggleExpand,
  bookmarked,
  onToggleBookmark,
  wisMod,
  isMoon,
  skillsLine,
  skillsHasOverride,
  onSkillsLineChange,
  onSkillsLineReset,
}: WildShapeBeastRowProps) {
  const moonAc = 13 + wisMod;
  const showMoonAc = isMoon && moonAc > beast.ac;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-50/80">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="font-black text-sm text-slate-800 truncate">
            {beast.name}
          </span>
          <span className="text-[10px] font-black text-muted shrink-0">
            CR {formatCr(beast.cr)} · {beast.size}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleBookmark}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          className={cn(
            'p-2 rounded-lg border transition-all shrink-0',
            bookmarked
              ? 'border-amber-300 bg-amber-100 text-amber-700'
              : 'border-slate-200 text-slate-400 hover:border-amber-200',
          )}
        >
          <Star size={16} className={bookmarked ? 'fill-amber-500' : ''} />
        </button>
      </div>
      <div className="px-3 pb-3 pt-1 text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <span className="text-muted uppercase text-[9px] font-black">AC</span>
          <div className="font-bold">
            {beast.ac}
            {showMoonAc && (
              <span className="text-indigo-600 ml-1">
                (Moon: {moonAc})
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted uppercase text-[9px] font-black">HP</span>
          <div className="font-bold">{beast.hp}</div>
        </div>
        <div className="col-span-2">
          <span className="text-muted uppercase text-[9px] font-black">Speed</span>
          <div className="font-bold break-words">{beast.speed}</div>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-4 pt-0 border-t border-slate-100 space-y-3 text-[11px] text-slate-700 leading-relaxed">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-[10px]">
            {(
              [
                ['STR', beast.str],
                ['DEX', beast.dex],
                ['CON', beast.con],
                ['INT', beast.int],
                ['WIS', beast.wis],
                ['CHA', beast.cha],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded px-2 py-1 text-center">
                <div className="text-muted text-[8px] font-black">{k}</div>
                <div className="font-black">{v}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-black text-slate-500">Skills</span>
              {skillsHasOverride && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkillsLineReset();
                  }}
                  className="text-[10px] font-black uppercase tracking-wide text-emerald-700 hover:underline"
                >
                  Use default
                </button>
              )}
            </div>
            <textarea
              value={skillsLine}
              onChange={(e) => onSkillsLineChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={2}
              placeholder="e.g. Perception +3, Stealth +5"
              className="w-full text-[11px] leading-relaxed border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500 resize-y min-h-[2.75rem] bg-white"
            />
          </div>
          {beast.senses && (
            <p>
              <span className="font-black text-slate-500">Senses:</span> {beast.senses}
            </p>
          )}
          {beast.traits && (
            <p>
              <span className="font-black text-slate-500">Traits:</span> {beast.traits}
            </p>
          )}
          <p className="whitespace-pre-wrap">
            <span className="font-black text-slate-500">Actions:</span> {beast.actions}
          </p>
        </div>
      )}
    </div>
  );
}
