/**
 * Spells / cantrips gained per level (cumulative totals at each character level 1–20).
 * Aligns with 5e / 2024 PHB class tables — confirm against public/rules.pdf if needed.
 */

import { getSpellSlots } from './levelData';

export type SpellLevelUpMode = 'none' | 'known' | 'spellbook' | 'prepared';

export interface LevelUpSpellPicks {
  cantrips: number;
  /** Leveled spells (1st+) to pick this level-up */
  spells: number;
  mode: SpellLevelUpMode;
  /** Highest spell level the character can cast after leveling (0 = none) */
  maxSpellLevel: number;
  blurb: string;
  /** 2024 PHB: whenever you gain a level you may replace one class cantrip (if your class grants cantrips). */
  allowCantripSwap: boolean;
  /** 2024 PHB: Bard / Sorcerer / Warlock may replace one spell on their list when they gain a level. */
  allowSpellSwap: boolean;
}

/** Optional swaps at this new level (independent of how many new spells/cantrips the table grants). */
export function getLevelUpSpellSwapOptions(className: string, newLevel: number): {
  allowCantripSwap: boolean;
  allowSpellSwap: boolean;
} {
  if (newLevel < 1) return { allowCantripSwap: false, allowSpellSwap: false };
  const meta = CASTER[className];
  if (!meta) return { allowCantripSwap: false, allowSpellSwap: false };

  const allowSpellSwap = ['Bard', 'Sorcerer', 'Warlock'].includes(className);
  const idx = Math.min(19, newLevel - 1);
  const cantripBudget = CANTRIPS[className]?.[idx] ?? 0;
  if (cantripBudget >= 1) return { allowCantripSwap: true, allowSpellSwap };

  if ((className === 'Ranger' || className === 'Paladin') && newLevel >= 2) {
    return { allowCantripSwap: true, allowSpellSwap };
  }

  return { allowCantripSwap: false, allowSpellSwap };
}

const CASTER: Record<
  string,
  { mode: SpellLevelUpMode; spellsStartLevel: number }
> = {
  Artificer: { mode: 'prepared', spellsStartLevel: 1 },
  Bard: { mode: 'known', spellsStartLevel: 1 },
  Cleric: { mode: 'prepared', spellsStartLevel: 1 },
  Druid: { mode: 'prepared', spellsStartLevel: 1 },
  Paladin: { mode: 'prepared', spellsStartLevel: 2 },
  Ranger: { mode: 'known', spellsStartLevel: 2 },
  Sorcerer: { mode: 'known', spellsStartLevel: 1 },
  Warlock: { mode: 'known', spellsStartLevel: 1 },
  Wizard: { mode: 'spellbook', spellsStartLevel: 1 },
};

/** Cantrip count at end of each level (index 0 = level 1) */
const CANTRIPS: Partial<Record<string, number[]>> = {
  Artificer: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  Bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6],
  Druid: [2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6],
  Sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  Warlock: [2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Wizard: [3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
};

/** Spells known (1st+) at end of each level — known casters & Ranger (0 at L1) */
const SPELLS_KNOWN: Partial<Record<string, number[]>> = {
  Bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 22],
  Sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 16],
  Warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 15, 15, 16, 16, 16, 16],
  Ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
};

/** Wizard spellbook size (6 + 2 per wizard level after 1st) at end of each level */
const WIZARD_BOOK: number[] = Array.from({ length: 20 }, (_, i) => 6 + 2 * i);

/**
 * 2024 PHB — “Prepared Spells” column (how many level 1+ spells can be on your prepared list).
 * Index 0 = character level 1. Bard / Cleric / Druid / Sorcerer share the same progression.
 */
const PHB2024_SHARED_PREPARED: number[] = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
];

const PHB2024_WIZARD_PREPARED: number[] = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25,
];

const PHB2024_WARLOCK_PREPARED: number[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15,
];

/** Paladin and Ranger use the same Prepared Spells column in 2024 PHB. */
const PHB2024_HALF_CASTER_PREPARED: number[] = [
  2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15,
];

const PHB2024_PREPARED_BY_CLASS: Record<string, number[]> = {
  Bard: PHB2024_SHARED_PREPARED,
  Cleric: PHB2024_SHARED_PREPARED,
  Druid: PHB2024_SHARED_PREPARED,
  Sorcerer: PHB2024_SHARED_PREPARED,
  Wizard: PHB2024_WIZARD_PREPARED,
  Warlock: PHB2024_WARLOCK_PREPARED,
  Paladin: PHB2024_HALF_CASTER_PREPARED,
  Ranger: PHB2024_HALF_CASTER_PREPARED,
};

/** Cantrips known (2024 PHB class table), index = level − 1. */
export function getPhb2024CantripBudget(className: string, level: number): number | null {
  const row = CANTRIPS[className];
  if (!row?.length) return null;
  const idx = Math.min(19, Math.max(0, level - 1));
  return row[idx] ?? null;
}

/** Prepared level-1+ spell list size (2024 PHB). Artificer is not in core PHB — returns null. */
export function getPhb2024PreparedSpellBudget(className: string, level: number): number | null {
  const row = PHB2024_PREPARED_BY_CLASS[className];
  if (!row?.length) return null;
  const idx = Math.min(19, Math.max(0, level - 1));
  return row[idx] ?? null;
}

function deltaCumulative(fromLevel: number, toLevel: number, table: number[]): number {
  if (toLevel <= fromLevel) return 0;
  const prev = fromLevel <= 0 ? 0 : table[fromLevel - 1] ?? 0;
  const next = table[toLevel - 1] ?? 0;
  return Math.max(0, next - prev);
}

export function maxCastableSpellLevel(className: string, level: number): number {
  const slots = getSpellSlots(className, level);
  const keys = Object.keys(slots)
    .map(Number)
    .filter((l) => (slots[l] ?? 0) > 0);
  return keys.length ? Math.max(...keys) : 0;
}

export function getLevelUpSpellPicks(
  className: string,
  fromLevel: number,
  toLevel: number,
): LevelUpSpellPicks {
  const swapFlags = getLevelUpSpellSwapOptions(className, toLevel);
  const none: LevelUpSpellPicks = {
    cantrips: 0,
    spells: 0,
    mode: 'none',
    maxSpellLevel: 0,
    blurb: '',
    ...swapFlags,
  };
  if (toLevel <= fromLevel) return none;

  const meta = CASTER[className];
  if (!meta) return none;

  const maxSpellLevel = maxCastableSpellLevel(className, toLevel);
  const slotTierUp = maxCastableSpellLevel(className, toLevel) > maxCastableSpellLevel(className, fromLevel);

  if (meta.mode === 'known') {
    const cantrips = deltaCumulative(fromLevel, toLevel, CANTRIPS[className] ?? []);
    const spells = deltaCumulative(fromLevel, toLevel, SPELLS_KNOWN[className] ?? []);
    if (cantrips === 0 && spells === 0) {
      if (!swapFlags.allowCantripSwap && !swapFlags.allowSpellSwap) return none;
      const tierNote = slotTierUp
        ? ` You now have ${maxSpellLevel}${ordinal(maxSpellLevel)}-level spell slots.`
        : '';
      return {
        cantrips: 0,
        spells: 0,
        mode: 'known',
        maxSpellLevel,
        blurb: `No new spells from the table this level.${tierNote} You may still replace one cantrip and/or swap one spell on your list (2024 PHB).`,
        ...swapFlags,
      };
    }
    const tierNote = slotTierUp
      ? ` You now have ${maxSpellLevel}${ordinal(maxSpellLevel)}-level spell slots — picks can be up to that level.`
      : '';
    return {
      cantrips,
      spells,
      mode: 'known',
      maxSpellLevel,
      blurb:
        `Choose new spells known from the ${className} list (see rules.pdf).${tierNote} Whenever you gain a level you may also replace one cantrip and (for this class) swap one spell on your list.`,
      ...swapFlags,
    };
  }

  if (meta.mode === 'spellbook') {
    const cantrips = deltaCumulative(fromLevel, toLevel, CANTRIPS.Wizard ?? []);
    const spells = deltaCumulative(fromLevel, toLevel, WIZARD_BOOK);
    if (cantrips === 0 && spells === 0) {
      if (!swapFlags.allowCantripSwap) return none;
      const tierNote = slotTierUp
        ? ` Your highest slot is now ${maxSpellLevel}${ordinal(maxSpellLevel)}.`
        : '';
      return {
        cantrips: 0,
        spells: 0,
        mode: 'spellbook',
        maxSpellLevel,
        blurb: `No new spellbook rows this level.${tierNote} You may still replace one Wizard cantrip (2024 PHB).`,
        ...swapFlags,
      };
    }
    const tierNote = slotTierUp
      ? ` Your highest slot is now ${maxSpellLevel}${ordinal(maxSpellLevel)} — new spellbook spells can be up to that level if you can cast them.`
      : '';
    return {
      cantrips,
      spells,
      mode: 'spellbook',
      maxSpellLevel,
      blurb:
        `Add ${spells} spell(s) to your spellbook (Wizard: typically 2 per level) and any new cantrips.${tierNote} You may replace one cantrip when you gain a level.`,
      ...swapFlags,
    };
  }

  if (meta.mode === 'prepared') {
    if (toLevel < meta.spellsStartLevel) return none;
    const cantrips = deltaCumulative(fromLevel, toLevel, CANTRIPS[className] ?? []);
    /** One new spell “slot” on the sheet per level once spellcasting is online (full list in book; you track favorites here). */
    let spells = 0;
    if (toLevel >= meta.spellsStartLevel) {
      spells = toLevel - Math.max(fromLevel, meta.spellsStartLevel - 1);
    }
    const spellsCapped = Math.max(0, spells);
    if (cantrips === 0 && spellsCapped === 0) {
      if (!swapFlags.allowCantripSwap) return none;
      const tierNote = slotTierUp
        ? ` You can prepare spells up to ${maxSpellLevel}${ordinal(maxSpellLevel)} level.`
        : '';
      return {
        cantrips: 0,
        spells: 0,
        mode: 'prepared',
        maxSpellLevel,
        blurb: `No new spells to add from the table this level.${tierNote} You may still replace one cantrip (2024 PHB).`,
        ...swapFlags,
      };
    }
    const tierNote = slotTierUp
      ? ` You can prepare spells up to ${maxSpellLevel}${ordinal(maxSpellLevel)} level.`
      : '';
    return {
      cantrips,
      spells: spellsCapped,
      mode: 'prepared',
      maxSpellLevel,
      blurb:
        `Your prepared capacity increased — add spell(s) from the ${className} list to this sheet (mark prepared as you like after a rest).${tierNote} You may replace one cantrip when you gain a level.`,
      ...swapFlags,
    };
  }

  return none;
}

function ordinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}
