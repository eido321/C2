import type { Ability } from '@/types';

/**
 * Default spellcasting ability for a class (2024 PHB).
 * Non-casters return `int` to match legacy sheet defaults (e.g. Magic Initiate).
 */
export function getDefaultSpellcastingAbility(className: string): Ability {
  const byClass: Record<string, Ability> = {
    Artificer: 'int',
    Bard: 'cha',
    Cleric: 'wis',
    Druid: 'wis',
    Paladin: 'cha',
    Ranger: 'wis',
    Sorcerer: 'cha',
    Warlock: 'cha',
    Wizard: 'int',
  };
  return byClass[className] ?? 'int';
}
