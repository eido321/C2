/**
 * Starting wealth & equipment — 2024 Player's Handbook character creation.
 * - Background: equipment package (includes trailing GP in the line) OR 50 GP instead.
 * - Class: starting equipment (option A — includes GP in the pouch) OR take gold instead (flat GP: option B, or Fighter option C).
 *   Values match `public/rules.pdf` Core * Traits tables.
 */

import type { ArmorTemplate } from './armor';

/** 2024 PHB: forgo background equipment → 50 GP (same for all backgrounds). */
export const BACKGROUND_GOLD_INSTEAD_GP = 50;

/** Gold noted at the end of each background's equipment package (e.g. "…, 8 GP"). */
export function trailingGoldFromBackgroundEquipment(equipmentLine: string): number {
  const m = equipmentLine.trim().match(/(\d+)\s*GP\s*$/i);
  return m ? parseInt(m[1], 10) : 0;
}

/** Parse "5 GP", "1,500 GP" → number */
export function parseEquipmentCostGp(cost: string): number {
  const m = cost.replace(/,/g, '').match(/(\d+)\s*GP/i);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * GP in the pouch when you take class starting equipment (2024 PHB option A for each class;
 * Fighter uses loadout A: Chain Mail… — 4 GP).
 * Artificer: not in the PHB PDF bundled with this app; left 0 until sourced.
 */
export const CLASS_PACK_EXTRA_GP: Record<string, number> = {
  Artificer: 0,
  Barbarian: 15,
  Bard: 19,
  Cleric: 7,
  Druid: 9,
  Fighter: 4,
  Monk: 11,
  Paladin: 9,
  Ranger: 7,
  Rogue: 8,
  Sorcerer: 28,
  Warlock: 15,
  Wizard: 5,
};

/**
 * Default body armor included when you take the class equipment package (first listed loadout in 2024 PHB).
 * Empty string = no armor in kit / unarmored default.
 */
export const CLASS_PACK_DEFAULT_ARMOR: Record<string, string> = {
  Artificer: '',
  Barbarian: '',
  Bard: 'Leather',
  Cleric: 'Chain Shirt',
  Druid: 'Leather',
  Fighter: 'Chain Mail',
  Monk: '',
  Paladin: 'Chain Mail',
  Ranger: 'Studded Leather',
  Rogue: 'Leather',
  Sorcerer: '',
  Warlock: 'Leather',
  Wizard: '',
};

/**
 * Flat GP if you forgo class starting equipment and take gold instead (2024 PHB option B, or Fighter option C).
 */
export const CLASS_GOLD_INSTEAD_GP: Record<string, number> = {
  Artificer: 125, // not in bundled PHB PDF — typical 5d4×10 average; replace when sourced
  Barbarian: 75,
  Bard: 90,
  Cleric: 110,
  Druid: 50,
  Fighter: 155,
  Monk: 50,
  Paladin: 150,
  Ranger: 150,
  Rogue: 100,
  Sorcerer: 50,
  Warlock: 100,
  Wizard: 55,
};

/** @deprecated Use CLASS_GOLD_INSTEAD_GP — kept for older imports */
export const CLASS_STARTING_GOLD_AVERAGE_GP = CLASS_GOLD_INSTEAD_GP;

export interface WealthChoices {
  backgroundEquipmentChoice: 'package' | 'gold';
  classEquipmentChoice: 'package' | 'gold';
  /** Body armor name from ARMOR_LIST, or '' for unarmored / use kit default */
  startingArmorName: string;
  /** True = explicitly no armor (overrides class kit default) */
  startingUnarmored?: boolean;
  /** Buy a shield for 10 GP */
  startingShield: boolean;
}

export function computeStartingWalletGp(input: {
  backgroundEquipmentChoice: 'package' | 'gold';
  classEquipmentChoice: 'package' | 'gold';
  backgroundEquipmentLine: string;
  className: string;
}): number {
  let gp = 0;
  if (input.backgroundEquipmentChoice === 'package') {
    gp += trailingGoldFromBackgroundEquipment(input.backgroundEquipmentLine);
  } else {
    gp += BACKGROUND_GOLD_INSTEAD_GP;
  }
  if (input.classEquipmentChoice === 'package') {
    gp += CLASS_PACK_EXTRA_GP[input.className] ?? 0;
  } else {
    gp += CLASS_GOLD_INSTEAD_GP[input.className] ?? 100;
  }
  return gp;
}

/** Body armor pieces only (no shield) for the equipment step */
export function bodyArmorOptions(armors: ArmorTemplate[]): ArmorTemplate[] {
  return armors.filter((a) => a.category !== 'Shield');
}

/** True if this armor is free because it came with the class kit */
export function isArmorFreeFromClassPack(
  className: string,
  classEquipmentChoice: 'package' | 'gold',
  armorName: string,
): boolean {
  if (classEquipmentChoice !== 'package') return false;
  const def = CLASS_PACK_DEFAULT_ARMOR[className] ?? '';
  return def !== '' && armorName === def;
}

export function armorAndShieldCostGp(input: {
  className: string;
  classEquipmentChoice: 'package' | 'gold';
  bodyArmorName: string;
  buyShield: boolean;
  armors: ArmorTemplate[],
}): { bodyCost: number; shieldCost: number; total: number } {
  const body = input.armors.find(
    (a) => a.name === input.bodyArmorName && a.category !== 'Shield',
  );
  const bodyBase = body ? parseEquipmentCostGp(body.cost) : 0;
  const free = isArmorFreeFromClassPack(
    input.className,
    input.classEquipmentChoice,
    input.bodyArmorName,
  );
  const bodyCost = free ? 0 : bodyBase;
  const shieldCost = input.buyShield ? 10 : 0;
  return { bodyCost, shieldCost, total: bodyCost + shieldCost };
}

/** Resolved body armor for the sheet (explicit pick or class-kit default). */
export function effectiveStartingBodyArmor(s: {
  startingArmorName: string;
  startingUnarmored?: boolean;
  classEquipmentChoice: 'package' | 'gold';
  className: string;
}): string {
  if (s.startingUnarmored) return '';
  if (s.startingArmorName) return s.startingArmorName;
  if (s.classEquipmentChoice === 'package') {
    return CLASS_PACK_DEFAULT_ARMOR[s.className] || '';
  }
  return '';
}

export function canAffordStartingGear(
  walletGp: number,
  className: string,
  classEquipmentChoice: 'package' | 'gold',
  bodyArmorName: string,
  buyShield: boolean,
  armors: ArmorTemplate[],
  strScore: number,
): boolean {
  const { total } = armorAndShieldCostGp({
    className,
    classEquipmentChoice,
    bodyArmorName,
    buyShield,
    armors,
  });
  if (walletGp < total) return false;
  if (!bodyArmorName) return true;
  const piece = armors.find((a) => a.name === bodyArmorName);
  if (piece?.strRequirement && strScore < piece.strRequirement) return false;
  return true;
}
