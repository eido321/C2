import type {SpellEntry, SpellLevelGroup} from '@/types';
import {makeSpellGroup} from './blockDefaults';
import {uid} from './utils';

export function createSpell(name: string): SpellEntry {
  return {id: uid('sp'), prepared: true, name};
}

export function addSpellToLevel(groups: SpellLevelGroup[], level: number, spell: SpellEntry) {
  const target = groups.find((group) => group.level === level);
  if (target) {
    return groups.map((group) => group === target ? {...group, spells: [...group.spells, spell]} : group);
  }
  return [...groups, {...makeSpellGroup(level, 0), spells: [spell]}].sort((a, b) => a.level - b.level);
}

export function slotCount(value: string | number) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
}
