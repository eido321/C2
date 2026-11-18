import {useEffect, useRef, useState, type KeyboardEvent, type WheelEvent} from 'react';
import {Check, ChevronDown, ChevronRight, Plus, X} from 'lucide-react';
import type {SpellComponents, SpellEntry, SpellLevelGroup} from '@/types';
import {cn, uid} from '@/lib/utils';
import {componentsLabel, spellLevelLabel, type BlockViewProps} from './shared';

function SummaryCell({label, value}: {label: string; value: string}) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg border border-gold/40 bg-white/35 px-2 py-1.5 shadow-sm">
      <span className="font-display text-[9px] font-bold uppercase tracking-wide text-accent">{label}</span>
      <span className="font-serif text-sm font-bold text-slate-800">{value || '—'}</span>
    </div>
  );
}

function SlotPips({
  total,
  expended,
  editing,
  onChange,
}: {
  total: number;
  expended: number;
  editing: boolean;
  onChange?: (expended: number) => void;
}) {
  if (total <= 0) return null;
  return (
    <span className="flex items-center gap-1" onPointerDown={editing ? (e) => e.stopPropagation() : undefined}>
      {Array.from({length: total}, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={!editing}
          onClick={() => {
            if (!editing || !onChange) return;
            const next = i + 1 === expended ? i : i + 1;
            onChange(next);
          }}
          className={cn(
            'h-3.5 w-3.5 rounded-full border transition-colors',
            i < expended ? 'border-accent bg-accent shadow-sm' : 'border-gold/60 bg-white/40',
            editing ? 'cursor-pointer hover:border-accent hover:bg-accent/20' : 'cursor-default',
          )}
          title={i < expended ? 'Slot expended' : 'Slot available'}
        />
      ))}
    </span>
  );
}

const DEFAULT_COMPONENTS: SpellComponents = {v: true, s: true, m: false};

function createSpell(name = ''): SpellEntry {
  return {id: uid('sp'), prepared: true, name, components: {...DEFAULT_COMPONENTS}};
}

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function safeNumber(value: string, max?: number): number {
  const next = Math.max(0, Number(value) || 0);
  return max === undefined ? next : Math.min(next, max);
}

function canScrollInDirection(el: HTMLElement, deltaX: number, deltaY: number): boolean {
  const maxTop = el.scrollHeight - el.clientHeight;
  const maxLeft = el.scrollWidth - el.clientWidth;
  const canScrollY = maxTop > 1 && ((deltaY < 0 && el.scrollTop > 0) || (deltaY > 0 && el.scrollTop < maxTop));
  const canScrollX = maxLeft > 1 && ((deltaX < 0 && el.scrollLeft > 0) || (deltaX > 0 && el.scrollLeft < maxLeft));
  return canScrollY || canScrollX;
}

export function SpellListBlock({block, editing, update}: BlockViewProps<'spellList'>) {
  const {content, style} = block;
  const fontSize = style?.fontSize ?? 14;
  const columns = content.columns ?? [];
  const groups = content.groups ?? [];
  const rowRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const notesRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [focusSpellId, setFocusSpellId] = useState<string | null>(null);

  useEffect(() => {
    groups.forEach((group) => {
      group.spells.forEach((spell) => {
        resizeTextarea(rowRefs.current[spell.id]);
        resizeTextarea(notesRefs.current[spell.id]);
      });
    });
  }, [groups]);

  useEffect(() => {
    if (!focusSpellId) return;
    const el = rowRefs.current[focusSpellId];
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    setFocusSpellId(null);
  }, [focusSpellId, groups]);

  const setGroups = (groups: SpellLevelGroup[]) => update({groups});
  const patchGroup = (groupId: string, patch: Partial<SpellLevelGroup>) =>
    setGroups(groups.map((g) => (g.id === groupId ? {...g, ...patch} : g)));
  const patchSpell = (groupId: string, spellId: string, patch: Partial<SpellEntry>) =>
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {...g, spells: g.spells.map((s) => (s.id === spellId ? {...s, ...patch} : s))}
          : g,
      ),
    );
  const patchSlotsTotal = (groupId: string, total: number) =>
    setGroups(groups.map((g) => (g.id === groupId ? {...g, slotsTotal: total, slotsExpended: Math.min(g.slotsExpended, total)} : g)));

  const addSpellAfter = (groupId: string, index: number, name = '') => {
    const nextSpell = createSpell(name);
    setGroups(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const spells = [...g.spells];
        spells.splice(index + 1, 0, nextSpell);
        return {...g, spells};
      }),
    );
    setFocusSpellId(nextSpell.id);
  };

  const removeSpell = (groupId: string, spellId: string) => {
    const group = groups.find((g) => g.id === groupId);
    const index = group?.spells.findIndex((s) => s.id === spellId) ?? -1;
    setGroups(groups.map((g) => (g.id === groupId ? {...g, spells: g.spells.filter((s) => s.id !== spellId)} : g)));
    const fallback = group?.spells[index - 1] ?? group?.spells[index + 1];
    if (fallback) setFocusSpellId(fallback.id);
  };

  const metaFor = (spell: SpellEntry): {label: string; value: string}[] => {
    const parts: {label: string; value: string}[] = [];
    if (columns.includes('school') && spell.school) parts.push({label: 'School', value: spell.school});
    if (columns.includes('castingTime') && spell.castingTime) parts.push({label: 'Cast', value: spell.castingTime});
    if (columns.includes('range') && spell.range) parts.push({label: 'Range', value: spell.range});
    if (columns.includes('components')) {
      const c = componentsLabel(spell.components);
      if (c) parts.push({label: 'Comp', value: c});
    }
    if (columns.includes('duration') && spell.duration) parts.push({label: 'Dur', value: spell.duration});
    if (columns.includes('attackSave') && spell.attackSave) parts.push({label: 'Roll', value: spell.attackSave});
    if (columns.includes('damageEffect') && spell.damageEffect) parts.push({label: 'Effect', value: spell.damageEffect});
    if (columns.includes('source') && spell.source) parts.push({label: 'Src', value: spell.source});
    return parts;
  };

  const onSpellKeyDown = (groupId: string, spellId: string, index: number) => (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const group = groups.find((g) => g.id === groupId);
    const spell = group?.spells.find((s) => s.id === spellId);
    if (!spell) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addSpellAfter(groupId, index);
      return;
    }
    if (e.key === 'Backspace' && spell.name.length === 0) {
      e.preventDefault();
      removeSpell(groupId, spellId);
    }
  };

  const onScrollAreaWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) return;
    if (canScrollInDirection(e.currentTarget, e.deltaX, e.deltaY)) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-ink" style={{fontSize}}>
      {editing ? (
        <input
          value={content.title ?? ''}
          onChange={(e) => update({title: e.target.value})}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Spell list title"
          className="mb-2 border-b border-gold/40 bg-transparent pb-1 font-display text-sm font-bold uppercase tracking-wide text-accent outline-none placeholder:text-accent/35"
        />
      ) : content.title ? (
        <div className="mb-2 border-b border-gold/40 pb-1 font-display text-sm font-bold uppercase tracking-wide text-accent">
          {content.title}
        </div>
      ) : null}

      {content.showHeader ? (
        <div className="mb-2 grid grid-cols-3 gap-1.5" onPointerDown={editing ? (e) => e.stopPropagation() : undefined}>
          {editing ? (
            <>
              <label className="flex flex-col items-center rounded-lg border border-gold/40 bg-white/35 px-1 py-1.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-wide text-accent">Ability</span>
                <input
                  value={content.ability ?? ''}
                  onChange={(e) => update({ability: e.target.value})}
                  className="w-full bg-transparent text-center font-serif text-sm font-bold text-slate-800 outline-none"
                />
              </label>
              <label className="flex flex-col items-center rounded-lg border border-gold/40 bg-white/35 px-1 py-1.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-wide text-accent">Save DC</span>
                <input
                  value={content.saveDc ?? ''}
                  onChange={(e) => update({saveDc: e.target.value})}
                  className="w-full bg-transparent text-center font-serif text-sm font-bold text-slate-800 outline-none"
                />
              </label>
              <label className="flex flex-col items-center rounded-lg border border-gold/40 bg-white/35 px-1 py-1.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-wide text-accent">Spell Atk</span>
                <input
                  value={content.attackBonus ?? ''}
                  onChange={(e) => update({attackBonus: e.target.value})}
                  className="w-full bg-transparent text-center font-serif text-sm font-bold text-slate-800 outline-none"
                />
              </label>
            </>
          ) : (
            <>
              <SummaryCell label="Ability" value={content.ability ?? ''} />
              <SummaryCell label="Save DC" value={content.saveDc ?? ''} />
              <SummaryCell label="Spell Atk" value={content.attackBonus ?? ''} />
            </>
          )}
        </div>
      ) : null}

      <div
        data-canvas-wheel="internal-scroll"
        className="no-scrollbar flex-1 space-y-3 overflow-auto overscroll-contain pr-1 font-serif text-ink-soft"
        onWheel={onScrollAreaWheel}
      >
        {groups.map((group) => (
          <section key={group.id} className="rounded-lg border border-gold/25 bg-white/20">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-lg border-b border-gold/30 bg-parchment/95 px-2 py-1.5 backdrop-blur">
              <div>
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-accent">
                  {spellLevelLabel(group.level)}
                </span>
                <span className="ml-2 font-sans text-[10px] font-medium text-slate-400">{group.spells.length} spells</span>
              </div>
              {group.level > 0 ? (
                editing ? (
                  <span className="flex items-center gap-1.5 font-sans text-[10px] text-slate-500" onPointerDown={(e) => e.stopPropagation()}>
                    <SlotPips
                      total={group.slotsTotal}
                      expended={group.slotsExpended}
                      editing={editing}
                      onChange={(slotsExpended) => patchGroup(group.id, {slotsExpended})}
                    />
                    <input
                      type="number"
                      min={0}
                      value={group.slotsExpended}
                      onChange={(e) => patchGroup(group.id, {slotsExpended: safeNumber(e.target.value, group.slotsTotal)})}
                      className="w-8 rounded border border-gold/40 bg-white/40 px-1 text-center outline-none focus:border-accent/60"
                      title="Slots expended"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      min={0}
                      value={group.slotsTotal}
                      onChange={(e) => patchSlotsTotal(group.id, safeNumber(e.target.value))}
                      className="w-8 rounded border border-gold/40 bg-white/40 px-1 text-center outline-none focus:border-accent/60"
                      title="Total slots"
                    />
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-sans text-[10px] text-slate-500">
                    <SlotPips total={group.slotsTotal} expended={group.slotsExpended} editing={false} />
                    {group.slotsTotal > 0 ? (
                      <span>
                        {group.slotsExpended}/{group.slotsTotal}
                      </span>
                    ) : null}
                  </span>
                )
              ) : null}
            </div>

            <div className="space-y-1.5 p-1.5">
              {group.spells.map((spell) => {
                const meta = metaFor(spell);
                const expanded = spell.expanded ?? false;
                const description = spell.description || spell.notes || '';
                const muted = group.level > 0 && !spell.prepared;
                return (
                  <article
                    key={spell.id}
                    className={cn(
                      'group/spell rounded-lg border border-transparent bg-white/30 px-2 py-1.5 leading-tight transition-colors',
                      editing && 'hover:border-gold/35 hover:bg-white/45',
                      muted && !editing && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => patchSpell(group.id, spell.id, {expanded: !expanded})}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="mt-0.5 rounded p-0.5 text-accent/70 transition-colors hover:bg-white/50 hover:text-accent"
                        title={expanded ? 'Collapse spell details' : 'Expand spell details'}
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {group.level > 0 ? (
                        <button
                          type="button"
                          onClick={editing ? () => patchSpell(group.id, spell.id, {prepared: !spell.prepared}) : undefined}
                          onPointerDown={editing ? (e) => e.stopPropagation() : undefined}
                          disabled={!editing}
                          className={cn(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                            spell.prepared
                              ? 'border-accent bg-accent text-parchment'
                              : 'border-gold/60 bg-parchment/70 text-transparent',
                            editing ? 'cursor-pointer hover:border-accent' : 'cursor-default',
                          )}
                          title={spell.prepared ? 'Prepared' : 'Not prepared'}
                        >
                          <Check size={11} strokeWidth={3} />
                        </button>
                      ) : null}
                      {editing ? (
                        <div className="min-w-0 flex-1" onPointerDown={(e) => e.stopPropagation()}>
                          <textarea
                            ref={(el) => {
                              rowRefs.current[spell.id] = el;
                              resizeTextarea(el);
                            }}
                            value={spell.name}
                            onChange={(e) => patchSpell(group.id, spell.id, {name: e.target.value})}
                            onInput={(e) => resizeTextarea(e.currentTarget)}
                            onKeyDown={onSpellKeyDown(group.id, spell.id, group.spells.findIndex((s) => s.id === spell.id))}
                            rows={1}
                            placeholder="Spell name"
                            className="min-h-6 w-full resize-none overflow-hidden rounded-md border border-transparent bg-white/35 px-1.5 py-0.5 font-medium leading-snug text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-gold/40 focus:bg-white/60"
                          />
                        </div>
                      ) : (
                        <span className="min-w-0 flex-1 whitespace-pre-wrap font-medium leading-snug text-slate-800">{spell.name || 'Unnamed spell'}</span>
                      )}
                      {columns.includes('concentration') && spell.concentration ? (
                        <span
                          className="shrink-0 rounded-full border border-gold/50 bg-white/70 px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase text-ink-soft"
                          title="Concentration"
                        >
                          Conc
                        </span>
                      ) : null}
                      {columns.includes('ritual') && spell.ritual ? (
                        <span
                          className="shrink-0 rounded-full border border-gold/50 bg-white/70 px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase text-ink-soft"
                          title="Ritual"
                        >
                          Ritual
                        </span>
                      ) : null}
                      {editing ? (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => removeSpell(group.id, spell.id)}
                          className="mt-0.5 rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-white/40 hover:text-accent group-hover/spell:opacity-100 focus:opacity-100"
                          title="Remove spell"
                        >
                          <X size={13} />
                        </button>
                      ) : null}
                    </div>
                    {meta.length > 0 ? (
                      <div className={cn('mt-1 flex flex-wrap gap-1 font-sans text-[10px]', group.level > 0 ? 'pl-6' : 'pl-0')}>
                        {meta.map((item) => (
                          <span key={`${spell.id}-${item.label}-${item.value}`} className="rounded-full bg-parchment-deep/60 px-1.5 py-0.5 text-slate-500">
                            <span className="font-semibold uppercase tracking-wide text-accent/70">{item.label}</span> {item.value}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {expanded ? (
                      <div className="mt-2 rounded-lg border border-gold/25 bg-parchment/45 p-2">
                        {editing ? (
                          <div onPointerDown={(e) => e.stopPropagation()}>
                            <span className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-wide text-accent/70">
                              Description
                            </span>
                            <textarea
                              ref={(el) => {
                                notesRefs.current[spell.id] = el;
                                resizeTextarea(el);
                              }}
                              value={description}
                              onChange={(e) => patchSpell(group.id, spell.id, {description: e.target.value})}
                              onInput={(e) => resizeTextarea(e.currentTarget)}
                              rows={1}
                              placeholder="Spell description, targets, area, scaling..."
                              className="min-h-8 w-full resize-none overflow-hidden rounded-md border border-gold/25 bg-white/35 px-2 py-1 text-[0.9em] italic leading-snug text-slate-600 outline-none transition-colors placeholder:text-slate-400 focus:border-gold/50 focus:bg-white/60"
                            />
                          </div>
                        ) : description ? (
                          <div>
                            <span className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-wide text-accent/70">
                              Description
                            </span>
                            <p className="whitespace-pre-wrap text-[0.9em] italic leading-snug text-slate-500">{description}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {editing ? (
              <button
                type="button"
                onClick={() => addSpellAfter(group.id, group.spells.length - 1, 'New spell')}
                onPointerDown={(e) => e.stopPropagation()}
                className="mx-1.5 mb-1.5 flex w-fit items-center gap-1 rounded-md px-1.5 py-1 font-sans text-xs font-medium text-accent hover:bg-white/35"
              >
                <Plus size={13} /> Add spell
              </button>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
