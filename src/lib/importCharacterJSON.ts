import { Character, INITIAL_CHARACTER } from '@/types';
import { migrateCharacterTabDefaults, migrateWeaponAttackAbility } from '@/lib/characterMigration';

/**
 * Merge a partial save onto defaults so nested objects (hp, spell slots) stay valid.
 */
function mergeImportedCharacter(raw: Partial<Character>): Character {
  const merged: Character = {
    ...INITIAL_CHARACTER,
    ...raw,
    abilities: { ...INITIAL_CHARACTER.abilities, ...raw.abilities },
    hp: { ...INITIAL_CHARACTER.hp, ...raw.hp },
    hitDice: { ...INITIAL_CHARACTER.hitDice, ...raw.hitDice },
    deathSaves: { ...INITIAL_CHARACTER.deathSaves, ...raw.deathSaves },
    spellcasting: {
      ...INITIAL_CHARACTER.spellcasting,
      ...raw.spellcasting,
      slots: { ...INITIAL_CHARACTER.spellcasting.slots, ...raw.spellcasting?.slots },
      spells: raw.spellcasting?.spells ?? INITIAL_CHARACTER.spellcasting.spells,
    },
    skills: raw.skills ?? INITIAL_CHARACTER.skills,
    currency: { ...INITIAL_CHARACTER.currency, ...raw.currency },
  };
  return migrateWeaponAttackAbility(migrateCharacterTabDefaults(merged));
}

/**
 * Parse JSON from a C2 export (or compatible partial). Throws on failure.
 */
export function parseCharacterFromJsonText(text: string): Character {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Character data must be a JSON object.');
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.name !== 'string') {
    throw new Error('Missing character name — not a valid C2 export.');
  }
  return mergeImportedCharacter(parsed as Partial<Character>);
}
