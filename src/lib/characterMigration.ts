import { Character, INITIAL_CHARACTER, type Ability } from '@/types';

/**
 * Older saves: default `hiddenTabs` only when the key was never persisted.
 * Never re-add individual tab ids when missing — that would undo Settings → “show Faith / Wild Shape”.
 */
export function migrateCharacterTabDefaults(c: Character): Character {
  let out: Character = { ...c };

  if (out.hiddenTabs === undefined) {
    out = {
      ...out,
      hiddenTabs: [...(INITIAL_CHARACTER.hiddenTabs ?? [])],
    };
  }

  if (out.companions === undefined) {
    const ht = [...(out.hiddenTabs ?? [])];
    if (!ht.includes('companions')) {
      ht.push('companions');
    }
    out = { ...out, companions: [], hiddenTabs: ht };
  }

  return out;
}

/** Legacy `weaponAbility` → each weapon’s `attackAbility`; drop global field. */
export function migrateWeaponAttackAbility(c: Character): Character {
  const legacy = (c as Character & { weaponAbility?: string }).weaponAbility;
  const fallback: Ability =
    legacy === 'str' || legacy === 'dex' || legacy === 'con' || legacy === 'int' || legacy === 'wis' || legacy === 'cha'
      ? legacy
      : 'str';
  const weapons = (c.weapons || []).map((w) => ({
    ...w,
    attackAbility: w.attackAbility ?? fallback,
  }));
  const { weaponAbility: _removed, ...rest } = c as Character & { weaponAbility?: string };
  return { ...rest, weapons };
}
