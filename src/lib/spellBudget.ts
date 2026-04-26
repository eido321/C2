import type { Ability, Character, Spell } from '@/types';
import { getPhb2024CantripBudget, getPhb2024PreparedSpellBudget } from '@/data/spellLevelUp';
import { getPreparedSpellCap } from '@/lib/reconcileCharacterLevel';
import { getModifier } from '@/lib/utils';

/** True if this spell should not count toward class cantrip / leveled prepared limits. */
export function isSpellExemptFromClassBudget(spell: Spell, character: Character): boolean {
  if (spell.spellBudgetExempt) return true;
  if (spell.isFree && spell.level >= 1) return true;
  const ids = character.backgroundPickApplied?.miSpellIds;
  if (ids?.includes(spell.id)) return true;
  return false;
}

function allFeatureEntries(c: Character): { name: string; description: string }[] {
  const out: { name: string; description: string }[] = [];
  for (const list of [c.classFeatures, c.subclassFeatures, c.racialTraits]) {
    if (!list) continue;
    for (const f of list) {
      out.push({ name: f.name, description: f.description ?? '' });
    }
  }
  return out;
}

function featureBlob(c: Character): string {
  return allFeatureEntries(c)
    .map((f) => `${f.name}\n${f.description}`)
    .join('\n');
}

/** True if a class / subclass / trait row uses this exact feature name. */
function hasNamedFeature(c: Character, name: string): boolean {
  for (const list of [c.classFeatures, c.subclassFeatures, c.racialTraits]) {
    if (!list) continue;
    if (list.some((f) => f.name.trim() === name)) return true;
  }
  return false;
}

/** Number of Magic Initiate instances (repeatable feat; each grants 2 cantrips + 1 level-1 spell). */
export function countMagicInitiateStacks(c: Character): number {
  let n = 0;
  for (const f of allFeatureEntries(c)) {
    if (/Magic Initiate\s*\(/i.test(f.name)) n += 1;
    else if (/^Feat:\s*Magic Initiate/i.test(f.name)) n += 1;
  }
  const bgIds = c.backgroundPickApplied?.miSpellIds;
  if (bgIds && bgIds.length > 0 && n === 0) {
    const cantripRows = c.spellcasting.spells.filter(
      (s) => s.level === 0 && bgIds.includes(s.id),
    ).length;
    if (cantripRows >= 1) n = 1;
  }
  return n;
}

/**
 * Extra cantrip “slots” from feats and subclass/class features (2024 PHB–aligned heuristics).
 * Added on top of getPhb2024CantripBudget for the character’s class.
 */
export function getCantripCapBonusFromFeatures(c: Character): number {
  let bonus = 0;
  bonus += countMagicInitiateStacks(c) * 2;

  const blob = featureBlob(c);

  // Divine Order / Primal Order: feature JSON lists both options — use explicit sheet picks only.
  if (c.class === 'Cleric' && c.clericDevotion?.divineOrder === 'thaumaturge') bonus += 1;
  if (c.class === 'Druid' && c.wildShape?.primalOrder === 'magician') bonus += 1;
  // Nature Domain — Acolyte of Nature: one extra Druid cantrip that doesn’t count vs your Cleric cantrips.
  if (c.class === 'Cleric' && hasNamedFeature(c, 'Acolyte of Nature')) bonus += 1;

  if (c.class === 'Paladin' && blob.includes('Blessed Warrior. You learn two Cleric cantrips')) bonus += 2;
  if (c.class === 'Ranger' && blob.includes('Druidic Warrior. You learn two Druid cantrips')) bonus += 2;

  if (
    c.class === 'Wizard' &&
    c.subclass === 'Illusionist' &&
    blob.includes("doesn't count against your number of cantrips known")
  ) {
    bonus += 1;
  }

  // Warlock: Pact of the Tome (Eldritch Invocation) — three extra cantrips from any class lists.
  if (c.class === 'Warlock' && /\bPact of the Tome\b/i.test(blob)) bonus += 3;

  return bonus;
}

function stripFeatPrefix(name: string): string {
  return name.replace(/^Feat:\s*/i, '').trim();
}

/**
 * How many leveled spells typical feat text grants as “always prepared” without counting toward your class limit
 * (for UI hints; per-spell exempt still uses rows + spellBudgetExempt).
 */
export function getPreparedExemptBonusFromFeats(c: Character, proficiencyBonus: number): number {
  let bonus = 0;
  for (const f of allFeatureEntries(c)) {
    const key = stripFeatPrefix(f.name);
    if (/^Magic Initiate\s*\(/i.test(key)) bonus += 1;
    else if (key === 'Fey-Touched' || key === 'Fey Touched') bonus += 2;
    else if (key === 'Shadow-Touched' || key === 'Shadow Touched') bonus += 2;
    else if (key === 'Telepathic') bonus += 1;
    else if (key === 'Ritual Caster') bonus += Math.max(0, proficiencyBonus);
  }
  return bonus;
}

/** Subclass features that add always-prepared spells in addition to your normal prepared list. */
export function getPreparedExemptBonusFromSubclassFeatures(c: Character): number {
  let bonus = 0;
  const seen = new Set<string>();
  for (const list of [c.subclassFeatures, c.classFeatures]) {
    if (!list) continue;
    for (const f of list) {
      if (seen.has(f.name)) continue;
      seen.add(f.name);
      if (f.name === 'Magical Discoveries') bonus += 2;
      if (f.name === 'Star Map') bonus += 1;
      // Nature Domain — Acolyte of Nature: two extra Druid leveled spells (always prepared–style; don’t count vs cap).
      if (f.name === 'Acolyte of Nature' && c.class === 'Cleric') bonus += 2;
    }
  }
  return bonus;
}

export interface SpellBudgetSummary {
  cantripCapBase: number | null;
  cantripCapBonus: number;
  /** null if class has no PHB cantrip column and no extras */
  cantripCapTotal: number | null;
  cantripsCountingTowardCap: number;
  cantripsExemptOnSheet: number;
  preparedCap: number | null;
  /** Extra prepared spells from subclass / class feature rows (Acolyte of Nature, Magical Discoveries, …) — don’t count toward `preparedCap`. */
  preparedSubclassExemptBonus: number;
  /** Typical extra prepared spells from feats + subclass (hint for marking rows exempt). */
  preparedExemptBonusHint: number;
  discretionaryPrepared: number;
  exemptPreparedOnSheet: number;
  /** Max total prepared leveled spells if you use full class cap + full exempt allowance (cap + hint). */
  preparedTotalMaxHint: number | null;
}

export function getSpellBudgetSummary(c: Character): SpellBudgetSummary {
  const cls = c.class;
  const lvl = c.level;
  const spellAb = c.spellcasting.ability as Ability;
  const spellMod = getModifier(c.abilities[spellAb]);
  const prof = c.proficiencyBonus ?? 2;

  const baseCantrip = getPhb2024CantripBudget(cls, lvl);
  const cantripBonus = getCantripCapBonusFromFeatures(c);
  let cantripCapTotal: number | null =
    baseCantrip != null ? baseCantrip + cantripBonus : cantripBonus > 0 ? cantripBonus : null;

  const spells = c.spellcasting.spells;
  const cantrips = spells.filter((s) => s.level === 0);
  const cantripsExemptOnSheet = cantrips.filter((s) =>
    isSpellExemptFromClassBudget(s, c),
  ).length;
  const cantripsCountingTowardCap = cantrips.length - cantripsExemptOnSheet;

  let preparedCap: number | null = getPhb2024PreparedSpellBudget(cls, lvl);
  if (preparedCap == null && cls === 'Artificer') {
    preparedCap = getPreparedSpellCap(cls, spellMod, lvl);
  }

  const preparedSubclassExemptBonus = getPreparedExemptBonusFromSubclassFeatures(c);
  const preparedExemptBonusHint =
    getPreparedExemptBonusFromFeats(c, prof) + preparedSubclassExemptBonus;

  const leveled = spells.filter((s) => s.level > 0);
  const exemptPreparedOnSheet = leveled.filter(
    (s) => s.prepared && isSpellExemptFromClassBudget(s, c),
  ).length;
  const discretionaryPrepared = leveled.filter(
    (s) => s.prepared && !isSpellExemptFromClassBudget(s, c),
  ).length;

  const preparedTotalMaxHint =
    preparedCap != null ? preparedCap + preparedExemptBonusHint : null;

  return {
    cantripCapBase: baseCantrip,
    cantripCapBonus: cantripBonus,
    cantripCapTotal,
    cantripsCountingTowardCap,
    cantripsExemptOnSheet,
    preparedCap,
    preparedSubclassExemptBonus,
    preparedExemptBonusHint,
    discretionaryPrepared,
    exemptPreparedOnSheet,
    preparedTotalMaxHint,
  };
}
