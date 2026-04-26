import type { Character, Feature } from '@/types';

/** All feat / trait rows we scan for the 2024 PHB Tough Origin feat. */
function allNamedFeatures(c: Character): Feature[] {
  return [...(c.racialTraits ?? []), ...(c.classFeatures ?? [])];
}

/**
 * True if the character has the Tough feat (Origin or general) by name.
 * Matches `Tough`, `Feat: Tough`, and leading `Feat: Tough` variants.
 */
export function characterHasToughFeat(c: Character): boolean {
  return allNamedFeatures(c).some((f) => {
    const n = f.name.trim().toLowerCase();
    return n === 'tough' || n === 'feat: tough' || n.startsWith('feat: tough');
  });
}

/**
 * PHB 2024 Tough — total max HP from the feat alone at character level `level`
 * (gain 2×level when you take it; +2 for each later level; sums to 2×level).
 */
export function toughFeatTotalHpBonus(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return 2 * L;
}

/**
 * HP to add on one level-up to `newLevel` from Tough.
 * - Newly taking Tough this level: +2×newLevel (initial benefit at your new level).
 * - Already had Tough: +2 for this level.
 */
export function toughHpDeltaOnLevelUp(
  hadToughBefore: boolean,
  gainsToughThisLevel: boolean,
  newLevel: number,
): number {
  if (gainsToughThisLevel && !hadToughBefore) return toughFeatTotalHpBonus(newLevel);
  if (hadToughBefore) return 2;
  return 0;
}

/** HP to add when taking Tough outside of level-up (e.g. feat picker on sheet). */
export function toughHpDeltaOnAcquireFeat(currentLevel: number): number {
  return toughFeatTotalHpBonus(currentLevel);
}

/** Level-up modal: user chose feat improvement and selected Tough (library or custom name). */
export function levelUpSelectionGrantsTough(
  needsASI: boolean,
  improvementChoice: 'asi' | 'feat',
  featFromLibrary: { name: string } | null,
  customFeatNameTrim: string,
): boolean {
  if (!needsASI || improvementChoice !== 'feat') return false;
  if (customFeatNameTrim.trim().toLowerCase() === 'tough') return true;
  return featFromLibrary?.name?.trim().toLowerCase() === 'tough';
}
