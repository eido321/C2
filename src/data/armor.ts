/**
 * All armor from the 2024 Player's Handbook.
 * Source: Chapter 6 – Equipment › Armor
 */

export type ArmorCategory = 'Light' | 'Medium' | 'Heavy' | 'Shield';
export type DexBonus = 'full' | 'max2' | 'none';

export interface ArmorTemplate {
  name: string;
  category: ArmorCategory;
  /** Base AC value (shields add this to current AC) */
  acBase: number;
  /** How Dexterity modifier is applied */
  dexBonus: DexBonus;
  /** Minimum Strength score required to wear without speed penalty */
  strRequirement?: number;
  /** Gives disadvantage on Stealth checks */
  stealthDisadvantage: boolean;
  /** Cost in gold pieces */
  cost: string;
  /** Weight in pounds */
  weight: string;
  description: string;
}

export const ARMOR_LIST: ArmorTemplate[] = [
  // ── LIGHT ARMOR ────────────────────────────────────────────────────────────
  {
    name: 'Padded',
    category: 'Light',
    acBase: 11,
    dexBonus: 'full',
    stealthDisadvantage: true,
    cost: '5 GP',
    weight: '8 lb.',
    description:
      'Padded armor consists of quilted layers of cloth and batting. ' +
      'While it provides some protection, the layers of padding muffle sound and impose Disadvantage on Stealth checks. ' +
      'AC: 11 + Dex modifier.',
  },
  {
    name: 'Leather',
    category: 'Light',
    acBase: 11,
    dexBonus: 'full',
    stealthDisadvantage: false,
    cost: '10 GP',
    weight: '10 lb.',
    description:
      'The breastplate and shoulder protectors of this armor are made of leather that has been stiffened by being boiled in oil. ' +
      'The rest of the armor is made of softer, more flexible leather. ' +
      'AC: 11 + Dex modifier.',
  },
  {
    name: 'Studded Leather',
    category: 'Light',
    acBase: 12,
    dexBonus: 'full',
    stealthDisadvantage: false,
    cost: '45 GP',
    weight: '13 lb.',
    description:
      'Made from tough but flexible leather, studded leather is reinforced with close-set rivets or spikes. ' +
      'It offers better protection than regular leather while maintaining good mobility. ' +
      'AC: 12 + Dex modifier.',
  },

  // ── MEDIUM ARMOR ───────────────────────────────────────────────────────────
  {
    name: 'Hide',
    category: 'Medium',
    acBase: 12,
    dexBonus: 'max2',
    stealthDisadvantage: false,
    cost: '10 GP',
    weight: '12 lb.',
    description:
      'This crude armor consists of thick furs and pelts. It is commonly worn by barbarian tribes and other folk who lack access to the tools and materials needed to create better armor. ' +
      'AC: 12 + Dex modifier (max +2).',
  },
  {
    name: 'Chain Shirt',
    category: 'Medium',
    acBase: 13,
    dexBonus: 'max2',
    stealthDisadvantage: false,
    cost: '50 GP',
    weight: '20 lb.',
    description:
      'Made of interlocking metal rings, a chain shirt is worn between layers of clothing or leather. ' +
      'This armor offers modest protection to the wearer\'s upper body and allows the sound of the rings to be muffled by outer layers. ' +
      'AC: 13 + Dex modifier (max +2).',
  },
  {
    name: 'Scale Mail',
    category: 'Medium',
    acBase: 14,
    dexBonus: 'max2',
    stealthDisadvantage: true,
    cost: '50 GP',
    weight: '45 lb.',
    description:
      'This armor consists of a coat and leggings (and perhaps a separate skirt) of leather covered with overlapping pieces of metal, much like the scales of a fish. ' +
      'The suit includes gauntlets. Disadvantage on Stealth checks. ' +
      'AC: 14 + Dex modifier (max +2).',
  },
  {
    name: 'Breastplate',
    category: 'Medium',
    acBase: 14,
    dexBonus: 'max2',
    stealthDisadvantage: false,
    cost: '400 GP',
    weight: '20 lb.',
    description:
      'This armor consists of a fitted metal chest piece worn with supple leather. ' +
      'Although it leaves the legs and arms relatively unprotected, this armor provides good protection for the wearer\'s vital organs while leaving the wearer relatively unencumbered. ' +
      'AC: 14 + Dex modifier (max +2).',
  },
  {
    name: 'Half Plate',
    category: 'Medium',
    acBase: 15,
    dexBonus: 'max2',
    stealthDisadvantage: true,
    cost: '750 GP',
    weight: '40 lb.',
    description:
      'Half plate consists of shaped metal plates that cover most of the wearer\'s body. ' +
      'It does not include leg protection beyond simple greaves that are attached with leather straps. ' +
      'Disadvantage on Stealth checks. AC: 15 + Dex modifier (max +2).',
  },

  // ── HEAVY ARMOR ────────────────────────────────────────────────────────────
  {
    name: 'Ring Mail',
    category: 'Heavy',
    acBase: 14,
    dexBonus: 'none',
    stealthDisadvantage: true,
    cost: '30 GP',
    weight: '40 lb.',
    description:
      'This armor is leather armor with heavy rings sewn into it. The rings help reinforce the armor against blows from swords and axes. ' +
      'Ring mail is inferior to chain mail, and it\'s usually worn only by those who can\'t afford better armor. ' +
      'Disadvantage on Stealth checks. AC: 14.',
  },
  {
    name: 'Chain Mail',
    category: 'Heavy',
    acBase: 16,
    dexBonus: 'none',
    strRequirement: 13,
    stealthDisadvantage: true,
    cost: '75 GP',
    weight: '55 lb.',
    description:
      'Made of interlocking metal rings, chain mail includes a layer of quilted fabric worn underneath the mail to prevent chafing and to cushion the impact of blows. ' +
      'The suit includes gauntlets. Requires Strength 13. Disadvantage on Stealth checks. AC: 16.',
  },
  {
    name: 'Splint',
    category: 'Heavy',
    acBase: 17,
    dexBonus: 'none',
    strRequirement: 15,
    stealthDisadvantage: true,
    cost: '200 GP',
    weight: '60 lb.',
    description:
      'This armor is made of narrow vertical strips of metal riveted to a backing of leather that is worn over cloth padding. ' +
      'Flexible chain mail protects the joints. Requires Strength 15. Disadvantage on Stealth checks. AC: 17.',
  },
  {
    name: 'Plate',
    category: 'Heavy',
    acBase: 18,
    dexBonus: 'none',
    strRequirement: 15,
    stealthDisadvantage: true,
    cost: '1,500 GP',
    weight: '65 lb.',
    description:
      'Plate consists of shaped, interlocking metal plates to cover the entire body. ' +
      'A suit of plate includes gauntlets, heavy leather boots, a visored helmet, and thick layers of padding underneath the armor. ' +
      'Buckles and straps distribute the weight over the body. Requires Strength 15. Disadvantage on Stealth checks. AC: 18.',
  },

  // ── SHIELD ─────────────────────────────────────────────────────────────────
  {
    name: 'Shield',
    category: 'Shield',
    acBase: 2,
    dexBonus: 'none',
    stealthDisadvantage: false,
    cost: '10 GP',
    weight: '6 lb.',
    description:
      'A shield is made from wood or metal and is carried in one hand. ' +
      'Wielding a shield increases your Armor Class by 2. ' +
      'You can benefit from only one shield at a time. ' +
      'Bonus: +2 AC (stacks with worn armor).',
  },
];

/** Compute the total AC from an equipped armor name + shield + character's DEX modifier */
export function computeAC(
  armorName: string,
  hasShield: boolean,
  dexMod: number,
): number {
  if (!armorName) {
    // Unarmored: 10 + DEX
    return 10 + dexMod + (hasShield ? 2 : 0);
  }
  const armor = ARMOR_LIST.find((a) => a.name === armorName);
  if (!armor) return 10 + dexMod + (hasShield ? 2 : 0);

  let ac = armor.acBase;
  if (armor.category === 'Shield') {
    // Shields stack; treat as additive bonus on top of whatever worn armor gives
    return ac; // caller adds to base
  }
  if (armor.dexBonus === 'full') ac += dexMod;
  if (armor.dexBonus === 'max2') ac += Math.min(dexMod, 2);
  if (hasShield) ac += 2;
  return ac;
}

/** PHB / 2024 PHB: wearing heavy armor without enough Strength reduces speed by this many feet. */
export const HEAVY_ARMOR_STR_SPEED_PENALTY_FT = 10;

/** First integer in the speed field (e.g. "30ft", "25 ft." → 30, 25). Defaults to 30 if none found. */
export function parseWalkingSpeedBaseFt(speedField: string): number {
  const m = String(speedField ?? '').match(/\d+/);
  if (!m) return 30;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : 30;
}

export function heavyArmorSpeedPenaltyFt(
  armorName: string | undefined,
  strengthScore: number,
): number {
  if (!armorName?.trim()) return 0;
  const armor = ARMOR_LIST.find((a) => a.name === armorName);
  if (!armor || armor.category !== 'Heavy') return 0;
  const req = armor.strRequirement;
  if (req == null) return 0;
  const str = Number.isFinite(strengthScore) ? strengthScore : 10;
  return str >= req ? 0 : HEAVY_ARMOR_STR_SPEED_PENALTY_FT;
}

/** Walking speed used in play: normal speed from the sheet minus heavy-armor Str penalty when applicable. */
export function effectiveWalkingSpeedFt(
  speedField: string,
  armorName: string | undefined,
  strengthScore: number,
): number {
  const base = parseWalkingSpeedBaseFt(speedField);
  return Math.max(0, base - heavyArmorSpeedPenaltyFt(armorName, strengthScore));
}
