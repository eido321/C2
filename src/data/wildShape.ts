// ─────────────────────────────────────────────────────────────────────────────
// Wild Shape — aligned with 2024 PHB progression in levelData.ts (Druid class).
// Beast stat summaries are SRD-style references for player convenience at the table.
// ─────────────────────────────────────────────────────────────────────────────

export interface WildShapeBeast {
  id: string;
  name: string;
  /** Challenge rating as decimal (0.125 = 1/8) */
  cr: number;
  size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge';
  ac: number;
  /** e.g. "19 (3d10+3)" */
  hp: string;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  skills?: string;
  senses?: string;
  traits?: string;
  /** Main attacks & special actions (condensed) */
  actions: string;
}

export interface WildShapeRules {
  hasWildShape: boolean;
  /** Maximum CR for beast form; Infinity at level 20 (Archdruid — any beast you have seen) */
  maxCr: number;
  allowSwim: boolean;
  allowFly: boolean;
  /**
   * Maximum uses in your pool (2 → 3 at 6 → 4 at 17+). Stays 4 at level 20 (2024 PHB).
   * Recovery (2024 PHB): Short Rest regains 1 expended use; Long Rest regains all.
   * Archdruid (20): when you roll Initiative, if you have no uses left, you regain one use.
   */
  usesPerRest: number;
  /** Level 20 — Archdruid initiative refill when the pool is empty */
  hasArchdruid: boolean;
  isMoon: boolean;
}

function baseMaxCr(level: number): number {
  if (level < 2) return 0;
  if (level >= 20) return Infinity;
  if (level >= 17) return 6;
  if (level >= 15) return 5;
  if (level >= 13) return 4;
  if (level >= 11) return 3;
  if (level >= 9) return 2;
  if (level >= 7) return 1;
  if (level >= 4) return 0.5;
  return 0.25;
}

function isCircleOfMoon(subclass: string): boolean {
  return /moon/i.test(subclass);
}

/**
 * Wild Shape pool size — 2024 Player's Handbook (Druid).
 * 2 (level 2+) → 3 (level 6+) → 4 (level 17+). Still 4 at 20; Archdruid adds refill on Initiative when empty, not an infinite pool.
 */
export function wildShapeUsesPerRest(level: number): number {
  if (level < 2) return 0;
  if (level >= 17) return 4;
  if (level >= 6) return 3;
  return 2;
}

/** 2024 PHB: Wild Shape improvements from Druid class table */
export function getWildShapeRules(level: number, subclass: string): WildShapeRules {
  const moon = isCircleOfMoon(subclass);
  let maxCr = baseMaxCr(level);
  if (level >= 3 && moon) {
    const moonCr = Math.floor(level / 3);
    maxCr = Math.max(maxCr, moonCr);
  }
  if (level >= 20) maxCr = Infinity;

  return {
    hasWildShape: level >= 2,
    maxCr,
    allowSwim: level >= 4,
    allowFly: level >= 7,
    usesPerRest: wildShapeUsesPerRest(level),
    hasArchdruid: level >= 20,
    isMoon: moon,
  };
}

function beastHasFly(b: WildShapeBeast): boolean {
  return /\bfly\b/i.test(b.speed) || /\bfly\b/i.test(b.traits ?? '');
}

function beastIsAquaticOrSwimPrimary(b: WildShapeBeast): boolean {
  const s = b.speed.toLowerCase();
  if (s.includes('swim') && !s.match(/\d+\s*ft\.?\s*(walk|burrow)/i)) {
    return true;
  }
  return false;
}

/** Beasts eligible at this druid level (CR + movement gates from 2024 PHB Wild Shape) */
export function filterBeastsForWildShape(
  beasts: WildShapeBeast[],
  rules: WildShapeRules,
): WildShapeBeast[] {
  if (!rules.hasWildShape) return [];
  return beasts.filter((b) => {
    const crOk = rules.maxCr === Infinity || b.cr <= rules.maxCr + 1e-6;
    if (!crOk) return false;
    const fly = beastHasFly(b);
    const swimHeavy = beastIsAquaticOrSwimPrimary(b);
    if (fly && !rules.allowFly) return false;
    if (swimHeavy && !rules.allowSwim) return false;
    return true;
  });
}

export const WILD_SHAPE_BEASTS: WildShapeBeast[] = [
  {
    id: 'cat',
    name: 'Cat',
    cr: 0,
    size: 'Tiny',
    ac: 12,
    hp: '2 (1d4)',
    speed: '40 ft., climb 30 ft.',
    str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7,
    skills: 'Perception +3, Stealth +4',
    senses: 'Darkvision 60 ft., passive Perception 13',
    actions: 'Claws. Melee +0 to hit, 1 slashing.',
  },
  {
    id: 'frog',
    name: 'Frog',
    cr: 0,
    size: 'Tiny',
    ac: 11,
    hp: '1 (1d4-1)',
    speed: '20 ft., swim 20 ft.',
    str: 1, dex: 13, con: 8, int: 1, wis: 8, cha: 3,
    senses: 'Darkvision 30 ft.',
    actions: 'Standing Leap. Long jump up to 10 ft., high jump up to 5 ft. with or without running start.',
  },
  {
    id: 'owl',
    name: 'Owl',
    cr: 0,
    size: 'Tiny',
    ac: 11,
    hp: '1 (1d4-1)',
    speed: '5 ft., fly 60 ft.',
    str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7,
    skills: 'Perception +3, Stealth +3',
    senses: 'Darkvision 120 ft.',
    traits: 'Flyby. Provoke no opportunity attack when flying out of reach.',
    actions: 'Talons. Melee +1 to hit, 1 slashing.',
  },
  {
    id: 'rat',
    name: 'Rat',
    cr: 0,
    size: 'Tiny',
    ac: 10,
    hp: '1 (1d4-1)',
    speed: '20 ft.',
    str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4,
    senses: 'Darkvision 30 ft.',
    traits: 'Keen Smell. Advantage on Perception (smell).',
    actions: 'Bite. Melee +0 to hit, 1 piercing.',
  },
  {
    id: 'raven',
    name: 'Raven',
    cr: 0,
    size: 'Tiny',
    ac: 12,
    hp: '1 (1d4-1)',
    speed: '10 ft., fly 50 ft.',
    str: 2, dex: 14, con: 8, int: 2, wis: 12, cha: 6,
    skills: 'Perception +3',
    senses: 'passive Perception 13',
    traits: 'Mimicry. Mimic simple sounds on DC 10 Wis (Insight).',
    actions: 'Beak. Melee +4 to hit, 1 piercing.',
  },
  {
    id: 'spider',
    name: 'Spider',
    cr: 0,
    size: 'Tiny',
    ac: 12,
    hp: '1 (1d4-1)',
    speed: '20 ft., climb 20 ft.',
    str: 2, dex: 14, con: 8, int: 1, wis: 10, cha: 2,
    skills: 'Stealth +4',
    senses: 'Darkvision 30 ft.',
    traits: 'Spider Climb. Walk on ceilings; Web Sense; Web Walker.',
    actions: 'Bite. Melee +4 to hit, 1 piercing + DC 9 CON save or 1 poison.',
  },
  {
    id: 'weasel',
    name: 'Weasel',
    cr: 0,
    size: 'Tiny',
    ac: 13,
    hp: '1 (1d4-1)',
    speed: '30 ft.',
    str: 3, dex: 16, con: 8, int: 2, wis: 12, cha: 3,
    skills: 'Perception +3, Stealth +5',
    senses: 'passive Perception 13',
    actions: 'Bite. Melee +5 to hit, 1 piercing.',
  },
  {
    id: 'mastiff',
    name: 'Mastiff',
    cr: 0.125,
    size: 'Medium',
    ac: 12,
    hp: '5 (1d8+1)',
    speed: '40 ft.',
    str: 13, dex: 14, con: 12, int: 3, wis: 12, cha: 7,
    skills: 'Perception +3',
    senses: 'passive Perception 13',
    traits: 'Keen Hearing and Smell. Advantage on Perception (hear/smell).',
    actions: 'Bite. Melee +3 to hit, reach 5 ft., 4 (1d4+2) piercing. Target DC 11 STR save or prone.',
  },
  {
    id: 'giant_weasel',
    name: 'Giant Weasel',
    cr: 0.125,
    size: 'Medium',
    ac: 13,
    hp: '9 (2d8)',
    speed: '40 ft.',
    str: 11, dex: 16, con: 10, int: 4, wis: 12, cha: 5,
    skills: 'Perception +3, Stealth +5',
    senses: 'Darkvision 60 ft.',
    actions: 'Bite. Melee +5 to hit, 5 (1d6+2) piercing.',
  },
  {
    id: 'giant_crab',
    name: 'Giant Crab',
    cr: 0.125,
    size: 'Medium',
    ac: 15,
    hp: '13 (3d8)',
    speed: '30 ft., swim 30 ft.',
    str: 13, dex: 15, con: 11, int: 1, wis: 9, cha: 3,
    skills: 'Stealth +4',
    senses: 'Blindsight 30 ft.',
    traits: 'Amphibious.',
    actions: 'Claw. Melee +3 to hit, 4 (1d6+1) bludgeoning. Target grappled (escape DC 11) if one claw, restrained if two.',
  },
  {
    id: 'constrictor_snake',
    name: 'Constrictor Snake',
    cr: 0.25,
    size: 'Large',
    ac: 12,
    hp: '13 (2d10+2)',
    speed: '30 ft., swim 30 ft.',
    str: 15, dex: 14, con: 12, int: 1, wis: 10, cha: 3,
    senses: 'Blindsight 10 ft.',
    actions: 'Bite. Melee +4 to hit, 5 (1d6+2) piercing.\nConstrict. Melee +4 to hit, 6 (1d8+2) bludgeoning, Large or smaller grappled (escape DC 14).',
  },
  {
    id: 'wolf',
    name: 'Wolf',
    cr: 0.25,
    size: 'Medium',
    ac: 13,
    hp: '11 (2d8+2)',
    speed: '40 ft.',
    str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6,
    skills: 'Perception +3, Stealth +4',
    senses: 'passive Perception 13',
    traits: 'Keen Hearing and Smell. Pack Tactics if ally within 5 ft. of target.',
    actions: 'Bite. Melee +4 to hit, 4 (1d4+2) piercing. DC 11 STR save or prone.',
  },
  {
    id: 'panther',
    name: 'Panther',
    cr: 0.25,
    size: 'Medium',
    ac: 12,
    hp: '13 (3d8)',
    speed: '50 ft., climb 40 ft.',
    str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7,
    skills: 'Perception +4, Stealth +6',
    senses: 'Darkvision 60 ft.',
    traits: 'Keen Smell.',
    actions: 'Bite. Melee +4 to hit, 5 (1d6+2) piercing.\nClaw. Melee +4 to hit, 4 (1d4+2) slashing.',
  },
  {
    id: 'riding_horse',
    name: 'Riding Horse',
    cr: 0.25,
    size: 'Large',
    ac: 10,
    hp: '13 (2d10+2)',
    speed: '60 ft.',
    str: 16, dex: 10, con: 12, int: 2, wis: 11, cha: 7,
    senses: 'passive Perception 10',
    actions: 'Hooves. Melee +2 to hit, 8 (2d4+3) bludgeoning.',
  },
  {
    id: 'giant_badger',
    name: 'Giant Badger',
    cr: 0.25,
    size: 'Medium',
    ac: 10,
    hp: '13 (2d8+4)',
    speed: '30 ft., burrow 10 ft.',
    str: 13, dex: 10, con: 15, int: 2, wis: 12, cha: 5,
    senses: 'Darkvision 30 ft.',
    traits: 'Keen Smell.',
    actions: 'Multiattack. Two attacks: Bite and Claws.\nBite. +3 to hit, 4 (1d6+1) piercing.\nClaws. +3 to hit, 6 (2d4+1) slashing.',
  },
  {
    id: 'giant_bat',
    name: 'Giant Bat',
    cr: 0.25,
    size: 'Large',
    ac: 13,
    hp: '22 (4d10)',
    speed: '10 ft., fly 60 ft.',
    str: 15, dex: 16, con: 11, int: 2, wis: 12, cha: 6,
    senses: 'Blindsight 60 ft.',
    actions: 'Bite. Melee +4 to hit, 5 (1d6+2) piercing.',
  },
  {
    id: 'giant_owl',
    name: 'Giant Owl',
    cr: 0.25,
    size: 'Large',
    ac: 12,
    hp: '19 (3d10+3)',
    speed: '5 ft., fly 60 ft.',
    str: 13, dex: 15, con: 12, int: 8, wis: 13, cha: 10,
    skills: 'Perception +5, Stealth +4',
    senses: 'Darkvision 120 ft.',
    traits: 'Flyby.',
    actions: 'Talons. Melee +3 to hit, 8 (2d6+1) slashing.',
  },
  {
    id: 'boar',
    name: 'Boar',
    cr: 0.25,
    size: 'Medium',
    ac: 11,
    hp: '11 (2d8+2)',
    speed: '40 ft.',
    str: 13, dex: 11, con: 12, int: 2, wis: 9, cha: 5,
    senses: 'passive Perception 9',
    traits: 'Charge. If 20 ft. straight before hit, +3 damage and DC 11 STR or prone.',
    actions: 'Tusk. Melee +3 to hit, 4 (1d6+1) slashing.',
  },
  {
    id: 'black_bear',
    name: 'Black Bear',
    cr: 0.5,
    size: 'Medium',
    ac: 11,
    hp: '19 (3d8+6)',
    speed: '40 ft., climb 30 ft.',
    str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7,
    skills: 'Perception +3',
    senses: 'passive Perception 13',
    traits: 'Keen Smell.',
    actions: 'Multiattack. Bite + Claw.\nBite. +3 to hit, 5 (1d6+2) piercing.\nClaws. +3 to hit, 7 (2d4+2) slashing.',
  },
  {
    id: 'crocodile',
    name: 'Crocodile',
    cr: 0.5,
    size: 'Large',
    ac: 12,
    hp: '19 (3d10+3)',
    speed: '20 ft., swim 30 ft.',
    str: 15, dex: 10, con: 13, int: 2, wis: 10, cha: 5,
    skills: 'Stealth +2',
    senses: 'passive Perception 10',
    traits: 'Hold Breath 15 minutes.',
    actions: 'Bite. Melee +4 to hit, 7 (1d10+2) piercing, grappled (escape DC 12).',
  },
  {
    id: 'reef_shark',
    name: 'Reef Shark',
    cr: 0.5,
    size: 'Medium',
    ac: 12,
    hp: '22 (4d8+4)',
    speed: 'swim 40 ft.',
    str: 14, dex: 13, con: 13, int: 1, wis: 10, cha: 4,
    skills: 'Perception +2',
    senses: 'Blindsight 30 ft.',
    traits: 'Pack Tactics; Water Breathing.',
    actions: 'Bite. Melee +4 to hit, 6 (1d8+2) piercing.',
  },
  {
    id: 'ape',
    name: 'Ape',
    cr: 0.5,
    size: 'Medium',
    ac: 12,
    hp: '19 (3d8+6)',
    speed: '30 ft., climb 30 ft.',
    str: 16, dex: 14, con: 14, int: 6, wis: 12, cha: 7,
    skills: 'Athletics +5, Perception +3',
    senses: 'passive Perception 13',
    actions: 'Multiattack. Two fist attacks.\nFist. +5 to hit, 6 (1d6+3) bludgeoning.\nRock. Ranged 25/50 ft., +5 to hit, 6 (1d6+3) bludgeoning.',
  },
  {
    id: 'brown_bear',
    name: 'Brown Bear',
    cr: 1,
    size: 'Large',
    ac: 11,
    hp: '34 (4d10+12)',
    speed: '40 ft., climb 30 ft.',
    str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
    skills: 'Perception +3',
    senses: 'passive Perception 13',
    traits: 'Keen Smell.',
    actions: 'Multiattack. Bite + Claw.\nBite. +5 to hit, 8 (1d8+4) piercing.\nClaws. +5 to hit, 11 (2d6+4) slashing.',
  },
  {
    id: 'dire_wolf',
    name: 'Dire Wolf',
    cr: 1,
    size: 'Large',
    ac: 14,
    hp: '37 (5d10+10)',
    speed: '50 ft.',
    str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7,
    skills: 'Perception +3, Stealth +4',
    senses: 'passive Perception 13',
    traits: 'Keen Hearing and Smell; Pack Tactics.',
    actions: 'Bite. Melee +5 to hit, 10 (1d10+5) piercing. DC 13 STR or prone.',
  },
  {
    id: 'giant_eagle',
    name: 'Giant Eagle',
    cr: 1,
    size: 'Large',
    ac: 13,
    hp: '26 (4d10+4)',
    speed: '10 ft., fly 80 ft.',
    str: 16, dex: 17, con: 13, int: 8, wis: 14, cha: 10,
    skills: 'Perception +4',
    senses: 'passive Perception 14',
    traits: 'Keen Sight.',
    actions: 'Multiattack. Two beak attacks.\nBeak. +5 to hit, 6 (1d6+3) slashing.\nTalons. +5 to hit, 10 (2d6+3) slashing.',
  },
  {
    id: 'giant_spider',
    name: 'Giant Spider',
    cr: 1,
    size: 'Large',
    ac: 14,
    hp: '26 (4d10+4)',
    speed: '30 ft., climb 30 ft.',
    str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4,
    skills: 'Stealth +7',
    senses: 'Darkvision 60 ft.',
    traits: 'Spider Climb; Web Sense; Web Walker.',
    actions: 'Bite. +5 to hit, 7 (1d8+3) piercing + DC 11 CON or 7 (2d6) poison.\nWeb (Recharge 5–6). Ranged 30/60 ft., restrained, escape DC 12 STR.',
  },
  {
    id: 'giant_toad',
    name: 'Giant Toad',
    cr: 1,
    size: 'Large',
    ac: 11,
    hp: '39 (6d10+6)',
    speed: '20 ft., swim 40 ft.',
    str: 15, dex: 13, con: 13, int: 2, wis: 10, cha: 3,
    senses: 'Darkvision 30 ft.',
    traits: 'Amphibious; Standing Leap 20 ft. long / 10 ft. high.',
    actions: 'Bite. +4 to hit, 5 (1d6+2) piercing + swallow Small or smaller (grappled first).',
  },
  {
    id: 'lion',
    name: 'Lion',
    cr: 1,
    size: 'Large',
    ac: 12,
    hp: '26 (4d10+4)',
    speed: '50 ft.',
    str: 17, dex: 15, con: 13, int: 3, wis: 12, cha: 8,
    skills: 'Perception +3, Stealth +6',
    senses: 'passive Perception 13',
    traits: 'Keen Smell; Pack Tactics.',
    actions: 'Multiattack. Bite + Claw.\nBite. +5 to hit, 7 (1d8+3) piercing.\nClaw. +5 to hit, 6 (1d6+3) slashing.',
  },
  {
    id: 'tiger',
    name: 'Tiger',
    cr: 1,
    size: 'Large',
    ac: 12,
    hp: '37 (5d10+10)',
    speed: '40 ft.',
    str: 17, dex: 15, con: 14, int: 3, wis: 12, cha: 8,
    skills: 'Perception +3, Stealth +7',
    senses: 'Darkvision 60 ft.',
    traits: 'Keen Smell.',
    actions: 'Multiattack. Bite + Claw.\nBite. +5 to hit, 8 (1d8+4) piercing.\nClaw. +5 to hit, 9 (2d4+4) slashing.',
  },
  {
    id: 'polar_bear',
    name: 'Polar Bear',
    cr: 2,
    size: 'Large',
    ac: 12,
    hp: '42 (5d10+15)',
    speed: '40 ft., swim 30 ft.',
    str: 20, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
    skills: 'Perception +3',
    senses: 'passive Perception 13',
    traits: 'Keen Smell.',
    actions: 'Multiattack. Bite + Claws.\nBite. +7 to hit, 9 (1d8+5) piercing.\nClaws. +7 to hit, 12 (2d6+5) slashing.',
  },
  {
    id: 'saber_toothed_tiger',
    name: 'Saber-Toothed Tiger',
    cr: 2,
    size: 'Large',
    ac: 12,
    hp: '52 (7d10+14)',
    speed: '40 ft.',
    str: 18, dex: 14, con: 15, int: 3, wis: 12, cha: 8,
    skills: 'Perception +3, Stealth +6',
    senses: 'passive Perception 13',
    traits: 'Keen Smell; Pounce (20 ft. move: DC 14 STR or prone + bonus bite).',
    actions: 'Bite. +6 to hit, 10 (1d10+5) piercing.\nClaw. +6 to hit, 12 (2d6+5) slashing.',
  },
  {
    id: 'giant_constrictor_snake',
    name: 'Giant Constrictor Snake',
    cr: 2,
    size: 'Huge',
    ac: 12,
    hp: '60 (8d12+8)',
    speed: '30 ft., swim 30 ft.',
    str: 19, dex: 14, con: 12, int: 1, wis: 10, cha: 3,
    senses: 'Blindsight 10 ft.',
    actions: 'Bite. +6 to hit, 11 (2d6+4) piercing.\nConstrict. +6 to hit, 13 (2d8+4) bludgeoning, Large or smaller grappled (escape DC 16).',
  },
  {
    id: 'killer_whale',
    name: 'Killer Whale',
    cr: 3,
    size: 'Huge',
    ac: 12,
    hp: '90 (12d12+12)',
    speed: 'swim 60 ft.',
    str: 19, dex: 10, con: 13, int: 3, wis: 12, cha: 5,
    skills: 'Perception +3',
    senses: 'Blindsight 120 ft.',
    traits: 'Echolocation 120 ft.; Hold Breath 30 min.; Underwater Camouflage in water.',
    actions: 'Bite. Melee +6 to hit, 21 (5d6+4) piercing.',
  },
  {
    id: 'giant_scorpion',
    name: 'Giant Scorpion',
    cr: 3,
    size: 'Large',
    ac: 15,
    hp: '52 (7d10+14)',
    speed: '40 ft.',
    str: 15, dex: 13, con: 15, int: 1, wis: 9, cha: 3,
    senses: 'Blindsight 60 ft.',
    actions: 'Multiattack. Three attacks: two claws and sting.\nClaw. +4 to hit, 5 (1d6+2) bludgeoning, grappled (escape DC 12).\nSting. +4 to hit, 7 (1d8+3) piercing + DC 12 CON or 22 (4d10) poison.',
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    cr: 3,
    size: 'Huge',
    ac: 15,
    hp: '68 (8d12+20)',
    speed: '30 ft.',
    str: 19, dex: 11, con: 15, int: 2, wis: 12, cha: 5,
    senses: 'passive Perception 11',
    actions: 'Tail. Melee +7 to hit, reach 10 ft., 18 (4d6+4) bludgeoning. If Huge or smaller creature, DC 14 STR or knocked prone.',
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    cr: 5,
    size: 'Huge',
    ac: 13,
    hp: '95 (10d12+30)',
    speed: '50 ft.',
    str: 22, dex: 9, con: 17, int: 2, wis: 11, cha: 5,
    senses: 'passive Perception 10',
    traits: 'Trampling Charge.',
    actions: 'Gore. Melee +8 to hit, reach 5 ft., 18 (4d6+4) piercing.\nStomp. Melee +8 to hit, 16 (2d10+5) bludgeoning.',
  },
  {
    id: 'mammoth',
    name: 'Mammoth',
    cr: 6,
    size: 'Huge',
    ac: 13,
    hp: '126 (11d12+55)',
    speed: '40 ft.',
    str: 24, dex: 9, con: 21, int: 3, wis: 11, cha: 6,
    skills: 'Perception +3',
    senses: 'passive Perception 13',
    traits: 'Trampling Charge.',
    actions: 'Gore. Melee +10 to hit, 25 (4d8+7) piercing.\nStomp. Melee +10 to hit, 29 (4d10+7) bludgeoning vs prone Medium or smaller.',
  },
];

export function formatCr(cr: number): string {
  if (!Number.isFinite(cr)) return '—';
  if (cr === 0) return '0';
  if (Math.abs(cr - 0.125) < 1e-6) return '1/8';
  if (Math.abs(cr - 0.25) < 1e-6) return '1/4';
  if (Math.abs(cr - 0.5) < 1e-6) return '1/2';
  return String(cr);
}
