import React, { useState } from 'react';
import { Bird, ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react';
import { Character, Ability, CharacterCompanion } from '@/types';
import { ABILITIES } from '@/config/constants';
import { cn, formatBonus, getModifier } from '@/lib/utils';
import {
  COMPANION_TEMPLATES,
  instantiateCompanionTemplate,
  blankCompanion,
  companionHpAfterConChange,
} from '@/data/companions';

interface Props {
  character: Character;
  onUpdate: (c: Character) => void;
}

const nid = () => Math.random().toString(36).substr(2, 9);

function ensureList(c: Character): CharacterCompanion[] {
  return c.companions ?? [];
}

function patchAbility(comp: CharacterCompanion, ability: Ability, score: number): CharacterCompanion {
  const prevCon = comp.abilities.con;
  let next: CharacterCompanion = {
    ...comp,
    abilities: { ...comp.abilities, [ability]: score },
  };
  if (ability === 'con') {
    const hp = companionHpAfterConChange(comp, prevCon, score);
    if (hp) next = { ...next, ...hp };
  }
  return next;
}

export const CompanionTab: React.FC<Props> = ({ character, onUpdate }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const list = ensureList(character);

  const setList = (next: CharacterCompanion[]) => {
    onUpdate({ ...character, companions: next });
  };

  const addBlank = () => {
    const b = blankCompanion();
    setList([...list, b]);
    setOpenId(b.id);
  };

  const addFromTemplate = (templateId: string) => {
    const inst = instantiateCompanionTemplate(templateId);
    if (!inst) return;
    setList([...list, inst]);
    setOpenId(inst.id);
  };

  const remove = (id: string) => {
    setList(list.filter((c) => c.id !== id));
    if (openId === id) setOpenId(null);
  };

  const patch = (id: string, next: CharacterCompanion) => {
    setList(list.map((c) => (c.id === id ? next : c)));
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl pb-8">
      <div className="stat-card space-y-4 p-4 md:p-5">
        <div className="section-header items-start gap-3">
          <Bird size={20} className="text-accent shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest">Companions</h3>
            <p className="text-xs md:text-sm text-muted leading-relaxed">
              Familiars, mounts, Ranger companions — one card per creature. Set <span className="font-bold">Hit dice #</span>{' '}
              to tie max/current HP to Constitution (each +1 CON mod adds that many HP per die).
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted w-full sm:w-auto">New</span>
            <button
              type="button"
              onClick={addBlank}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-accent border border-accent/35 hover:bg-accent/10 px-3 py-2 rounded-xl"
            >
              <Plus size={14} /> Blank companion
            </button>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">Quick templates</span>
            <div className="flex flex-wrap gap-2">
              {COMPANION_TEMPLATES.map((t) => (
                <button
                  key={t.templateId}
                  type="button"
                  title={t.blurb}
                  onClick={() => addFromTemplate(t.templateId)}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:border-accent/50 hover:bg-white transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {list.length === 0 && (
        <div className="text-center py-14 md:py-16 px-4 text-muted italic text-sm border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
          No companions yet — use <span className="font-bold not-italic text-slate-600">Blank companion</span> or a template
          above.
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        {list.map((comp) => {
          const open = openId === comp.id;
          const hd = comp.hitDiceCount;
          const conLinked = hd !== undefined && hd >= 1;
          return (
            <div key={comp.id} className="stat-card border-slate-200 overflow-hidden py-0 shadow-sm">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : comp.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 text-left hover:bg-slate-50/90 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-black text-base text-slate-800 truncate">{comp.name}</div>
                  <div className="text-xs text-muted truncate mt-0.5">
                    {comp.size} {comp.creatureType}
                    {comp.sourceNote ? ` · ${comp.sourceNote}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm font-black text-accent tabular-nums">
                    {comp.hpCurrent}/{comp.hpMax} HP
                  </span>
                  {conLinked && (
                    <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                      Con×{hd}
                    </span>
                  )}
                  {open ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                </div>
              </button>

              {open && (
                <div className="px-4 pb-5 pt-1 md:px-5 md:pb-6 border-t border-slate-100 space-y-5 md:space-y-6">
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => remove(comp.id)}
                      className="flex items-center gap-1.5 text-xs font-black uppercase text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Remove companion
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <MiniField label="Name">
                      <input
                        value={comp.name}
                        onChange={(e) => patch(comp.id, { ...comp, name: e.target.value })}
                        className="w-full font-bold text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                      />
                    </MiniField>
                    <MiniField label="Source">
                      <input
                        value={comp.sourceNote}
                        onChange={(e) => patch(comp.id, { ...comp, sourceNote: e.target.value })}
                        placeholder="Find Familiar…"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                      />
                    </MiniField>
                    <MiniField label="Size">
                      <input
                        value={comp.size}
                        onChange={(e) => patch(comp.id, { ...comp, size: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                      />
                    </MiniField>
                    <MiniField label="Type">
                      <input
                        value={comp.creatureType}
                        onChange={(e) => patch(comp.id, { ...comp, creatureType: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                      />
                    </MiniField>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Combat</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 items-end">
                      <MiniField label="AC">
                        <input
                          type="number"
                          value={comp.ac}
                          onChange={(e) =>
                            patch(comp.id, { ...comp, ac: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                          }
                          className="w-full text-center font-black text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-accent"
                        />
                      </MiniField>
                      <MiniField label="HP max">
                        <input
                          type="number"
                          value={comp.hpMax}
                          onChange={(e) => {
                            const hpMax = Math.max(1, Math.floor(Number(e.target.value) || 1));
                            patch(comp.id, {
                              ...comp,
                              hpMax,
                              hpCurrent: Math.min(comp.hpCurrent, hpMax),
                            });
                          }}
                          className="w-full text-center font-black text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-accent"
                        />
                      </MiniField>
                      <MiniField label="HP current" className="col-span-2 md:col-span-1 xl:col-span-1">
                        <div className="flex gap-1 items-stretch">
                          <button
                            type="button"
                            aria-label="Damage 1"
                            onClick={() =>
                              patch(comp.id, {
                                ...comp,
                                hpCurrent: Math.max(0, comp.hpCurrent - 1),
                              })
                            }
                            className="shrink-0 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            value={comp.hpCurrent}
                            onChange={(e) => {
                              const hpCurrent = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              patch(comp.id, { ...comp, hpCurrent: Math.min(hpCurrent, comp.hpMax) });
                            }}
                            className="w-full min-w-0 text-center font-black text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            aria-label="Heal 1"
                            onClick={() =>
                              patch(comp.id, {
                                ...comp,
                                hpCurrent: Math.min(comp.hpMax, comp.hpCurrent + 1),
                              })
                            }
                            className="shrink-0 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </MiniField>
                      <MiniField label="Hit dice #">
                        <input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={comp.hitDiceCount ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              patch(comp.id, { ...comp, hitDiceCount: undefined });
                              return;
                            }
                            const n = Math.max(0, Math.floor(Number(raw) || 0));
                            patch(comp.id, {
                              ...comp,
                              hitDiceCount: n >= 1 ? n : undefined,
                            });
                          }}
                          className="w-full text-center text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-accent"
                        />
                      </MiniField>
                      <MiniField label="Speed" className="col-span-2 xl:col-span-2">
                        <input
                          value={comp.speed}
                          onChange={(e) => patch(comp.id, { ...comp, speed: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                        />
                      </MiniField>
                    </div>
                  </div>
                  {!conLinked && (
                    <p className="text-xs text-muted italic leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                      Tip: enter <span className="font-bold not-italic">Hit dice #</span> (e.g. 2 for a wolf) so raising or
                      lowering Constitution updates HP automatically.
                    </p>
                  )}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Ability scores</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                      {ABILITIES.map(({ id, label }) => {
                        const score = comp.abilities[id];
                        const mod = getModifier(score);
                        return (
                          <div
                            key={id}
                            className="rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-2.5 text-center space-y-1.5"
                          >
                            <div className="text-[10px] font-black uppercase text-slate-500 tracking-wide">
                              {label.slice(0, 3)}
                            </div>
                            <input
                              type="number"
                              value={score}
                              onChange={(e) =>
                                patch(
                                  comp.id,
                                  patchAbility(
                                    comp,
                                    id,
                                    Math.max(1, Math.min(30, Math.floor(Number(e.target.value) || 10))),
                                  ),
                                )
                              }
                              className="w-full text-center font-black text-sm border border-slate-200 rounded-lg py-1.5 outline-none focus:border-accent bg-white"
                            />
                            <div className="text-xs font-bold text-accent">{formatBonus(mod)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <details className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden [&:open_.companion-details-chevron]:rotate-180">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-slate-600 px-4 py-3 hover:bg-slate-100/90 transition-colors">
                      <span>Skills, senses & languages</span>
                      <ChevronDown className="companion-details-chevron size-4 shrink-0 text-muted transition-transform duration-200" />
                    </summary>
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100 bg-white/60">
                      <MiniField label="Skills">
                        <textarea
                          value={comp.skills}
                          onChange={(e) => patch(comp.id, { ...comp, skills: e.target.value })}
                          rows={3}
                          className="w-full text-sm leading-relaxed border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent resize-y min-h-[5rem]"
                        />
                      </MiniField>
                      <MiniField label="Senses">
                        <textarea
                          value={comp.senses}
                          onChange={(e) => patch(comp.id, { ...comp, senses: e.target.value })}
                          rows={3}
                          className="w-full text-sm leading-relaxed border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent resize-y min-h-[5rem]"
                        />
                      </MiniField>
                      <MiniField label="Languages">
                        <textarea
                          value={comp.languages}
                          onChange={(e) => patch(comp.id, { ...comp, languages: e.target.value })}
                          rows={2}
                          className="w-full text-sm leading-relaxed border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent resize-y"
                        />
                      </MiniField>
                      <MiniField label="Alignment">
                        <input
                          value={comp.alignment}
                          onChange={(e) => patch(comp.id, { ...comp, alignment: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-accent"
                        />
                      </MiniField>
                    </div>
                  </details>

                  <details className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden [&:open_.companion-details-chevron]:rotate-180">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-slate-600 px-4 py-3 hover:bg-slate-100/90 transition-colors">
                      <span>Traits ({comp.traits.length})</span>
                      <ChevronDown className="companion-details-chevron size-4 shrink-0 text-muted transition-transform duration-200" />
                    </summary>
                    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100 bg-white/60">
                      <button
                        type="button"
                        onClick={() =>
                          patch(comp.id, {
                            ...comp,
                            traits: [...comp.traits, { id: nid(), name: 'Trait', description: '' }],
                          })
                        }
                        className="text-xs font-black uppercase tracking-wide text-accent hover:underline"
                      >
                        + Add trait
                      </button>
                      {comp.traits.map((tr, ti) => (
                        <div key={tr.id} className="p-3 md:p-4 bg-white rounded-xl border border-slate-100 space-y-2.5 shadow-sm">
                          <div className="flex gap-2 items-start">
                            <input
                              value={tr.name}
                              onChange={(e) => {
                                const traits = [...comp.traits];
                                traits[ti] = { ...tr, name: e.target.value };
                                patch(comp.id, { ...comp, traits });
                              }}
                              className="flex-1 font-bold text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            />
                            <button
                              type="button"
                              title="Remove trait"
                              onClick={() =>
                                patch(comp.id, { ...comp, traits: comp.traits.filter((_, i) => i !== ti) })
                              }
                              className="shrink-0 p-2 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <textarea
                            value={tr.description}
                            onChange={(e) => {
                              const traits = [...comp.traits];
                              traits[ti] = { ...tr, description: e.target.value };
                              patch(comp.id, { ...comp, traits });
                            }}
                            rows={3}
                            className="w-full text-sm leading-relaxed border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent resize-y min-h-[5rem]"
                          />
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden [&:open_.companion-details-chevron]:rotate-180">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-slate-600 px-4 py-3 hover:bg-slate-100/90 transition-colors">
                      <span>Actions ({comp.attacks.length})</span>
                      <ChevronDown className="companion-details-chevron size-4 shrink-0 text-muted transition-transform duration-200" />
                    </summary>
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100 bg-white/60">
                      <button
                        type="button"
                        onClick={() =>
                          patch(comp.id, {
                            ...comp,
                            attacks: [
                              ...comp.attacks,
                              {
                                id: nid(),
                                name: 'Attack',
                                attackBonus: 0,
                                damage: '1d6',
                                reachOrRange: '5 ft.',
                                damageType: 'Bludgeoning',
                              },
                            ],
                          })
                        }
                        className="text-xs font-black uppercase tracking-wide text-accent hover:underline"
                      >
                        + Add attack
                      </button>
                      {comp.attacks.map((atk, ai) => (
                        <div
                          key={atk.id}
                          className="p-3 md:p-4 bg-white rounded-xl border border-slate-100 space-y-3 shadow-sm"
                        >
                          <input
                            value={atk.name}
                            onChange={(e) => {
                              const attacks = [...comp.attacks];
                              attacks[ai] = { ...atk, name: e.target.value };
                              patch(comp.id, { ...comp, attacks });
                            }}
                            placeholder="Attack name"
                            className="w-full font-bold text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <MiniField label="Hit bonus">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={atk.attackBonus}
                                  onChange={(e) => {
                                    const attacks = [...comp.attacks];
                                    attacks[ai] = {
                                      ...atk,
                                      attackBonus: Math.floor(Number(e.target.value) || 0),
                                    };
                                    patch(comp.id, { ...comp, attacks });
                                  }}
                                  className="w-16 text-center font-black text-sm border border-slate-200 rounded-lg px-2 py-2"
                                />
                                <span className="text-sm font-bold text-slate-600">{formatBonus(atk.attackBonus)}</span>
                              </div>
                            </MiniField>
                            <MiniField label="Reach / range">
                              <input
                                value={atk.reachOrRange}
                                onChange={(e) => {
                                  const attacks = [...comp.attacks];
                                  attacks[ai] = { ...atk, reachOrRange: e.target.value };
                                  patch(comp.id, { ...comp, attacks });
                                }}
                                placeholder="5 ft."
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                              />
                            </MiniField>
                            <MiniField label="Damage">
                              <input
                                value={atk.damage}
                                onChange={(e) => {
                                  const attacks = [...comp.attacks];
                                  attacks[ai] = { ...atk, damage: e.target.value };
                                  patch(comp.id, { ...comp, attacks });
                                }}
                                placeholder="1d6+2"
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                              />
                            </MiniField>
                            <MiniField label="Damage type">
                              <input
                                value={atk.damageType}
                                onChange={(e) => {
                                  const attacks = [...comp.attacks];
                                  attacks[ai] = { ...atk, damageType: e.target.value };
                                  patch(comp.id, { ...comp, attacks });
                                }}
                                placeholder="Slashing"
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                              />
                            </MiniField>
                          </div>
                          <MiniField label="Notes (DC, riders…)">
                            <input
                              value={atk.notes ?? ''}
                              onChange={(e) => {
                                const attacks = [...comp.attacks];
                                attacks[ai] = { ...atk, notes: e.target.value };
                                patch(comp.id, { ...comp, attacks });
                              }}
                              placeholder="DC 13 Con save…"
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                            />
                          </MiniField>
                          <button
                            type="button"
                            onClick={() =>
                              patch(comp.id, { ...comp, attacks: comp.attacks.filter((_, i) => i !== ai) })
                            }
                            className="text-xs font-black uppercase text-red-600 hover:text-red-700"
                          >
                            Remove attack
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>

                  <MiniField label="Challenge / notes">
                    <textarea
                      value={comp.extraNotes}
                      onChange={(e) => patch(comp.id, { ...comp, extraNotes: e.target.value })}
                      rows={3}
                      className="w-full text-sm leading-relaxed border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-accent resize-y min-h-[5rem]"
                    />
                  </MiniField>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function MiniField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5 min-w-0', className)}>
      <div className="text-[10px] font-black uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  );
}
