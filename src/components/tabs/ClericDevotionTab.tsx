import React, { useMemo, useState } from 'react';
import { Church, BookOpen, Search, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Character } from '@/types';
import { cn } from '@/lib/utils';
import {
  CLERIC_DEITIES,
  getClericDeity,
  type ClericPrayer,
} from '@/data/clericDeities';

interface Props {
  character: Character;
  onUpdate: (c: Character) => void;
}

const OTHER_DEITY_ID = 'other';

const GENERIC_PRAYERS: ClericPrayer[] = [
  {
    label: 'Opening a rest',
    text: 'Divine patron, I set down the weight of the road. Bless this fire, these friends, and the watch we keep.',
  },
  {
    label: 'Before danger',
    text: 'If I fall, let it be in service of what you hold sacred; if I stand, let me lift another.',
  },
  {
    label: 'Thanksgiving',
    text: 'For breath, for bread, for the chance to try again — I speak your name with gratitude.',
  },
  {
    label: 'Confession',
    text: 'Where I failed your charge, give me courage to mend what can be mended and accept what cannot.',
  },
];

function ensureDevotion(c: Character): NonNullable<Character['clericDevotion']> {
  return c.clericDevotion ?? { deityId: null, divineOrder: null };
}

function faithTabBlurb(className: string): string {
  if (className === 'Cleric') {
    return 'Cleric devotion — deities from the multiverse table, plus sample prayers for roleplay.';
  }
  if (className === 'Paladin') {
    return 'Sacred oath and deity — use the list for a patron god or pick Other for your oath alone.';
  }
  if (className === 'Warlock') {
    return 'Otherworldly patron and personal faith — many warlocks still honor a god; use the list or Other as fits your story.';
  }
  return 'Any character can have faith — choose a deity from the table, or Other for a homebrew patron or ideal.';
}

function newPrayerId() {
  return Math.random().toString(36).substr(2, 9);
}

export const ClericDevotionTab: React.FC<Props> = ({ character, onUpdate }) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ label: '', text: '' });
  const devotion = ensureDevotion(character);
  const customPrayers = devotion.customPrayers ?? [];

  const sortedDeities = useMemo(
    () => [...CLERIC_DEITIES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedDeities;
    return sortedDeities.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.titles.toLowerCase().includes(q) ||
        d.alignment.toLowerCase().includes(q) ||
        d.suggestedDomains.toLowerCase().includes(q),
    );
  }, [sortedDeities, search]);

  const selected =
    devotion.deityId && devotion.deityId !== OTHER_DEITY_ID
      ? getClericDeity(devotion.deityId)
      : undefined;

  const setDevotion = (next: NonNullable<Character['clericDevotion']>) => {
    onUpdate({ ...character, clericDevotion: next });
  };

  const addCustomPrayer = () => {
    const id = newPrayerId();
    setDevotion({
      ...devotion,
      customPrayers: [...customPrayers, { id, label: 'New prayer', text: '' }],
    });
    setEditingId(id);
    setEditDraft({ label: 'New prayer', text: '' });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setDevotion({
      ...devotion,
      customPrayers: customPrayers.map((p) =>
        p.id === editingId ? { ...p, label: editDraft.label.trim() || 'Prayer', text: editDraft.text } : p,
      ),
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const deletePrayer = (id: string) => {
    setEditingId((e) => (e === id ? null : e));
    setDevotion({
      ...devotion,
      customPrayers: customPrayers.filter((p) => p.id !== id),
    });
  };

  const startEdit = (id: string) => {
    const p = customPrayers.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setEditDraft({ label: p.label, text: p.text });
  };

  const prayersToShow: ClericPrayer[] =
    !devotion.deityId
      ? GENERIC_PRAYERS
      : devotion.deityId === OTHER_DEITY_ID
        ? GENERIC_PRAYERS
        : selected?.prayers ?? [];

  return (
    <div className="space-y-8">
      {character.class === 'Cleric' && (
        <div className="stat-card space-y-4">
          <div className="section-header">
            <Church size={18} className="text-violet-600" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Divine Order (level 1)</h3>
              <p className="text-[10px] text-muted mt-0.5 leading-relaxed">
                Choose one sacred role from the 2024 PHB. Only{' '}
                <span className="font-bold text-slate-700">Thaumaturge</span> adds an extra cantrip (tracked in spell budget).
                Protector grants martial weapons and Heavy armor training instead.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'protector' as const,
                  title: 'Protector',
                  body: 'Martial weapons; training with Heavy armor.',
                },
                {
                  id: 'thaumaturge' as const,
                  title: 'Thaumaturge',
                  body: 'One extra Cleric cantrip (doesn’t count vs normal cantrip total); Arcana or Religion bonus.',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setDevotion({
                    ...devotion,
                    divineOrder: opt.id,
                  })
                }
                className={cn(
                  'text-left rounded-xl border p-3 transition-colors',
                  devotion.divineOrder === opt.id
                    ? 'border-violet-500 bg-zinc-800 ring-1 ring-violet-400/35'
                    : 'border-zinc-600 bg-zinc-800/50 hover:border-zinc-500',
                )}
              >
                <div
                  className={cn(
                    'text-xs font-black',
                    devotion.divineOrder === opt.id ? 'text-zinc-100' : 'text-zinc-200',
                  )}
                >
                  {opt.title}
                </div>
                <p
                  className={cn(
                    'text-[10px] mt-1 leading-relaxed',
                    devotion.divineOrder === opt.id ? 'text-zinc-400' : 'text-muted',
                  )}
                >
                  {opt.body}
                </p>
              </button>
            ))}
          </div>
          {!devotion.divineOrder && (
            <p className="text-[10px] text-amber-700 font-medium">
              Pick Protector or Thaumaturge so cantrip limits match your build.
            </p>
          )}
        </div>
      )}

      <div className="stat-card space-y-5">
        <div className="section-header">
          <Church size={18} className="text-sky-600" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Faith & patron</h3>
            <p className="text-[10px] text-muted mt-0.5">{faithTabBlurb(character.class)}</p>
            <p className="text-[10px] text-muted/80 mt-1 leading-relaxed">
              Deity names and alignments follow the Forgotten Realms tables in the Player&apos;s Handbook. Prayers are
              suggestions for the table, not rules text.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deities by name, portfolio, alignment, or domains…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-slate-50 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border bg-slate-50/80 p-2 space-y-1">
          <button
            type="button"
            onClick={() =>
              setDevotion({
                ...devotion,
                deityId: OTHER_DEITY_ID,
              })
            }
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors',
              devotion.deityId === OTHER_DEITY_ID
                ? 'bg-accent text-white'
                : 'hover:bg-white text-slate-700 border border-transparent hover:border-slate-200',
            )}
          >
            Other deity (homebrew / setting-specific)
          </button>
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() =>
                setDevotion({
                  ...devotion,
                  deityId: d.id,
                  customDeityName: undefined,
                })
              }
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg transition-colors',
                devotion.deityId === d.id
                  ? 'bg-sky-600 text-white'
                  : 'hover:bg-white text-slate-800 border border-transparent hover:border-slate-200',
              )}
            >
              <span className="text-xs font-black">{d.name}</span>
              <span className="text-[10px] opacity-80 block">{d.titles} · {d.alignment}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted italic px-2 py-4 text-center">No gods match that search.</p>
          )}
        </div>

        {devotion.deityId === OTHER_DEITY_ID && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Deity name & epithet
            </label>
            <input
              value={devotion.customDeityName ?? ''}
              onChange={(e) =>
                setDevotion({ ...devotion, customDeityName: e.target.value })
              }
              placeholder="e.g. The Quiet Flame, patron of hearths"
              className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm outline-none focus:border-accent"
            />
          </div>
        )}

        {devotion.deityId && devotion.deityId !== OTHER_DEITY_ID && selected && (
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
            <div className="text-lg font-black text-sky-950">{selected.name}</div>
            <div className="text-xs text-sky-900/90">{selected.titles}</div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded-md bg-white border border-sky-200 font-bold text-sky-800">
                {selected.alignment}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/80 border border-sky-200 text-sky-800">
                Domains / themes: {selected.suggestedDomains}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">
              Sample prayers
            </span>
          </div>
          {!devotion.deityId && (
            <p className="text-[10px] text-muted italic mb-2">
              Generic invocations below work for any character. Choose a deity for Forgotten Realms–specific sample prayers.
            </p>
          )}
          <ul className="space-y-3">
            {prayersToShow.map((p, i) => (
              <li
                key={i}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm leading-relaxed"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">
                  {p.label}
                </div>
                <div className="text-slate-800 italic">&ldquo;{p.text}&rdquo;</div>
              </li>
            ))}
          </ul>
          {devotion.deityId === OTHER_DEITY_ID && (
            <p className="text-[10px] text-muted italic">
              Generic prayers above work for any patron; replace with your own invocations at the table.
            </p>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-sky-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Your prayers</span>
            </div>
            <button
              type="button"
              onClick={addCustomPrayer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              <Plus size={14} />
              Add prayer
            </button>
          </div>
          <p className="text-[10px] text-muted italic">
            Personal invocations saved on this character — edit, remove, or add as many as you like.
          </p>
          {customPrayers.length === 0 && (
            <p className="text-xs text-muted italic py-2 text-center border border-dashed border-slate-200 rounded-xl">
              No custom prayers yet. Use Add prayer to write your own.
            </p>
          )}
          <ul className="space-y-3">
            {customPrayers.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {editingId === p.id ? (
                  <div className="p-3 space-y-2">
                    <input
                      value={editDraft.label}
                      onChange={(e) => setEditDraft((d) => ({ ...d, label: e.target.value }))}
                      placeholder="Label (e.g. Before battle)"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm font-bold outline-none focus:border-accent"
                    />
                    <textarea
                      value={editDraft.text}
                      onChange={(e) => setEditDraft((d) => ({ ...d, text: e.target.value }))}
                      placeholder="Prayer text…"
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm leading-relaxed outline-none focus:border-accent resize-y min-h-[80px]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-accent text-white hover:bg-accent/90"
                      >
                        <Check size={14} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-sky-700 min-w-0">
                        {p.label || 'Prayer'}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-accent transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePrayer(p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-slate-800 italic whitespace-pre-wrap">
                      {p.text ? `“${p.text}”` : <span className="text-muted not-italic">(empty — click edit to add text)</span>}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted">
            Your temple, oaths, and private notes
          </label>
          <textarea
            value={devotion.notes ?? ''}
            onChange={(e) => setDevotion({ ...devotion, notes: e.target.value })}
            placeholder="Oath tenets, patron details, temple, holy days, clergy contacts, warlock pact notes, visions…"
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 text-sm outline-none focus:border-accent resize-y min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};
