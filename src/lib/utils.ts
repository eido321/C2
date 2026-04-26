import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Skill } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Optional tabs (Companions, Wild Shape, Faith) are hidden by default. Faith works for any class (deity / patron notes).
 * When `hiddenTabs` is missing,
 * or it includes the tab id. Showing the tab requires `hiddenTabs` without that id.
 */
export function isCompanionTabHidden(character: { hiddenTabs?: string[] | null }): boolean {
  const ht = character.hiddenTabs;
  if (ht === undefined || ht === null) return true;
  return ht.includes('companions');
}

export function isWildShapeTabHidden(character: { hiddenTabs?: string[] | null }): boolean {
  const ht = character.hiddenTabs;
  if (ht === undefined || ht === null) return true;
  return ht.includes('wildshape');
}

export function isFaithTabHidden(character: { hiddenTabs?: string[] | null }): boolean {
  const ht = character.hiddenTabs;
  if (ht === undefined || ht === null) return true;
  return ht.includes('faith');
}

export function getModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(score: number) {
  const mod = getModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatBonus(bonus: number) {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

export function getProficiencyBonus(level: number) {
  return Math.ceil(level / 4) + 1;
}

/** Calculated skill modifier from ability score and proficiency flags */
export function getSkillAutoBonus(skill: Skill, abilityScore: number, profBonus: number): number {
  const mod = getModifier(abilityScore);
  return mod + (skill.proficient ? profBonus : 0) + (skill.expert ? profBonus : 0);
}

/** Modifier shown on the sheet (manual override or calculated) */
export function getSkillEffectiveBonus(skill: Skill, abilityScore: number, profBonus: number): number {
  const auto = getSkillAutoBonus(skill, abilityScore, profBonus);
  return skill.bonusOverride ?? auto;
}
