import type { Character, SpellSlots } from '@/types';
import { getSpellSlots } from '@/data/levelData';
import { getProficiencyBonus } from '@/lib/utils';

const SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Resync slot totals to the class table at this character level; clear stale higher-tier rows when leveling down. */
export function resyncSpellSlotRows(
  className: string,
  characterLevel: number,
  prev: SpellSlots,
): SpellSlots {
  const table = getSpellSlots(className, characterLevel);
  const next: SpellSlots = { ...prev };
  for (const lvl of SLOT_LEVELS) {
    const total = table[lvl] ?? 0;
    const prevRow = prev[lvl] ?? { total: 0, expended: 0 };
    next[lvl] = {
      total,
      expended: total === 0 ? 0 : Math.min(prevRow.expended, total),
    };
  }
  return next;
}

/** Prepared leveled-spell cap by class (2024 PHB; Artificer uses INT + half level rounded up, min 1). */
export function getPreparedSpellCap(
  className: string,
  spellcastingAbilityMod: number,
  characterLevel: number,
): number | null {
  if (['Barbarian', 'Fighter', 'Monk', 'Rogue'].includes(className)) return null;
  if (['Cleric', 'Druid', 'Wizard'].includes(className)) {
    return Math.max(1, spellcastingAbilityMod + characterLevel);
  }
  if (className === 'Artificer') {
    return Math.max(1, spellcastingAbilityMod + Math.ceil(characterLevel / 2));
  }
  if (['Paladin', 'Ranger'].includes(className)) {
    return Math.max(1, spellcastingAbilityMod + Math.floor(characterLevel / 2));
  }
  return null;
}

/** Apply a new character level: proficiency bonus and spell slot table match the level (fixes manual level edits vs Level Up modal). */
export function applyCharacterLevelChange(character: Character, rawLevel: number): Character {
  const newLevel = Math.min(20, Math.max(1, Number.isFinite(rawLevel) ? rawLevel : 1));
  return {
    ...character,
    level: newLevel,
    proficiencyBonus: getProficiencyBonus(newLevel),
    spellcasting: {
      ...character.spellcasting,
      slots: resyncSpellSlotRows(character.class, newLevel, character.spellcasting.slots),
    },
  };
}
