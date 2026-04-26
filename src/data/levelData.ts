// ─────────────────────────────────────────────────────────────────────────────
// 2024 PHB Level Progression Data
// ─────────────────────────────────────────────────────────────────────────────

import classFeaturesLevelPhb2024 from './classFeaturesLevelPhb2024.json';

/** Proficiency bonus by character level */
export const PROF_BONUS: Record<number, number> = {
  1:2,  2:2,  3:2,  4:2,
  5:3,  6:3,  7:3,  8:3,
  9:4,  10:4, 11:4, 12:4,
  13:5, 14:5, 15:5, 16:5,
  17:6, 18:6, 19:6, 20:6,
};

/** Spell slots per level per casting type */
export type SpellSlotRow = Partial<Record<number, number>>; // spell level → total slots

// Full casters: Artificer, Bard, Cleric, Druid, Sorcerer, Wizard
export const FULL_CASTER_SLOTS: Record<number, SpellSlotRow> = {
  1:  { 1:2 },
  2:  { 1:3 },
  3:  { 1:4, 2:2 },
  4:  { 1:4, 2:3 },
  5:  { 1:4, 2:3, 3:2 },
  6:  { 1:4, 2:3, 3:3 },
  7:  { 1:4, 2:3, 3:3, 4:1 },
  8:  { 1:4, 2:3, 3:3, 4:2 },
  9:  { 1:4, 2:3, 3:3, 4:3, 5:1 },
  10: { 1:4, 2:3, 3:3, 4:3, 5:2 },
  11: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1 },
  12: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1 },
  13: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1 },
  14: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1 },
  15: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1 },
  16: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1 },
  17: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1, 9:1 },
  18: { 1:4, 2:3, 3:3, 4:3, 5:3, 6:1, 7:1, 8:1, 9:1 },
  19: { 1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:1, 8:1, 9:1 },
  20: { 1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:2, 8:1, 9:1 },
};

// Half casters: Paladin, Ranger (spellcasting begins at level 2)
export const HALF_CASTER_SLOTS: Record<number, SpellSlotRow> = {
  1:  {},
  2:  { 1:2 },
  3:  { 1:3 },
  4:  { 1:3 },
  5:  { 1:4, 2:2 },
  6:  { 1:4, 2:2 },
  7:  { 1:4, 2:3 },
  8:  { 1:4, 2:3 },
  9:  { 1:4, 2:3, 3:2 },
  10: { 1:4, 2:3, 3:2 },
  11: { 1:4, 2:3, 3:3 },
  12: { 1:4, 2:3, 3:3 },
  13: { 1:4, 2:3, 3:3, 4:1 },
  14: { 1:4, 2:3, 3:3, 4:1 },
  15: { 1:4, 2:3, 3:3, 4:2 },
  16: { 1:4, 2:3, 3:3, 4:2 },
  17: { 1:4, 2:3, 3:3, 4:3, 5:1 },
  18: { 1:4, 2:3, 3:3, 4:3, 5:1 },
  19: { 1:4, 2:3, 3:3, 4:3, 5:2 },
  20: { 1:4, 2:3, 3:3, 4:3, 5:2 },
};

// Warlock: Pact Magic — all slots are the same level, max 4
export const WARLOCK_SLOTS: Record<number, SpellSlotRow> = {
  1:  { 1:1 },
  2:  { 1:2 },
  3:  { 2:2 },
  4:  { 2:2 },
  5:  { 3:2 },
  6:  { 3:2 },
  7:  { 4:2 },
  8:  { 4:2 },
  9:  { 5:2 },
  10: { 5:2 },
  11: { 5:3 },
  12: { 5:3 },
  13: { 5:3 },
  14: { 5:3 },
  15: { 5:3 },
  16: { 5:3 },
  17: { 5:4 },
  18: { 5:4 },
  19: { 5:4 },
  20: { 5:4 },
};

export type CastingType = 'full' | 'half' | 'warlock' | 'none';

export const CLASS_CASTING_TYPE: Record<string, CastingType> = {
  Artificer: 'full',
  Barbarian: 'none',
  Bard:      'full',
  Cleric:    'full',
  Druid:     'full',
  Fighter:   'none',
  Monk:      'none',
  Paladin:   'half',
  Ranger:    'half',
  Rogue:     'none',
  Sorcerer:  'full',
  Warlock:   'warlock',
  Wizard:    'full',
};

export function getSpellSlots(className: string, level: number): SpellSlotRow {
  const type = CLASS_CASTING_TYPE[className] ?? 'none';
  switch (type) {
    case 'full':    return FULL_CASTER_SLOTS[level] ?? {};
    case 'half':    return HALF_CASTER_SLOTS[level] ?? {};
    case 'warlock': return WARLOCK_SLOTS[level] ?? {};
    default:        return {};
  }
}

// ── ASI levels per class ──────────────────────────────────────────────────────
export const ASI_LEVELS: Record<string, number[]> = {
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue:   [4, 8, 10, 12, 16, 19],
  // All others:
  _default: [4, 8, 12, 16, 19],
};

export function isASILevel(className: string, level: number): boolean {
  const levels = ASI_LEVELS[className] ?? ASI_LEVELS['_default'];
  return levels.includes(level);
}

/** Class-table feature name at ASI levels; omitted when the player takes a feat instead (PHB / rules.pdf). */
export const ABILITY_SCORE_IMPROVEMENT_NAME = 'Ability Score Improvement';

// In 2024 PHB, all classes choose their subclass at level 3
export const SUBCLASS_LEVEL = 3;

// ── Per-class feature table (2024 PHB) ────────────────────────────────────────
export interface LevelFeature {
  name: string;
  desc: string;
}

/** Per-class level-up features from the PHB (2024) extract; regenerate with `node scripts/generate-class-features-from-phb.mjs`. */
export const CLASS_FEATURES = classFeaturesLevelPhb2024 as Record<string, Record<number, LevelFeature[]>>;


/** Returns the features gained when leveling from (level-1) to level */
export function getFeaturesForLevel(className: string, level: number): LevelFeature[] {
  return CLASS_FEATURES[className]?.[level] ?? [];
}

/** Average HP gain from a hit die (rounded up) + CON modifier */
export function avgHPGain(hitDie: string, conMod: number): number {
  const max = parseInt(hitDie.replace('d', ''), 10) || 8;
  return Math.max(1, Math.ceil((max + 1) / 2) + conMod);
}

/** Max value of a hit die string ('d8' → 8) */
export function hitDieMax(hitDie: string): number {
  return parseInt(hitDie.replace('d', ''), 10) || 8;
}
