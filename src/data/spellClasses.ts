import spellClassMapPhb2024 from './spellClassMapPhb2024.json';

/**
 * Spell name → classes that have it on their list (from PHB extract parentheses + Artificer merge).
 * Regenerate with `node scripts/generate-spells-from-phb.mjs`
 */
export const SPELL_CLASS_MAP = spellClassMapPhb2024 as Record<string, string[]>;

/** Ordered list of spellcasting classes for the filter UI */
export const SPELL_FILTER_CLASSES = [
  'Artificer',
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;
