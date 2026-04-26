export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

/** Main sheet nav tab — persisted on `Character.sheetActiveTab` so reload keeps your place */
export type SheetTab =
  | 'core'
  | 'combat'
  | 'spells'
  | 'features'
  | 'wildshape'
  | 'faith'
  | 'companions'
  | 'bio'
  | 'lore'
  | 'settings';

export interface Skill {
  name: string;
  ability: Ability;
  proficient: boolean;
  expert?: boolean;
  /** When set, used as the total skill modifier instead of ability + proficiency + expertise */
  bonusOverride?: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  prepared: boolean;
  castingTime: string;
  range: string;
  description: string;
  components: {
    v: boolean;
    s: boolean;
    m: boolean;
  };
  isRitual: boolean;
  isConcentration: boolean;
  /** Spell can be cast for free once per day */
  isFree?: boolean;
  /** The free once-per-day cast has been used this rest */
  freeUsed?: boolean;
  /**
   * Does not count toward class cantrip / prepared (or known) budgets — Magic Initiate, domain spells, subclass “always prepared,” etc.
   * Use for any spell that the rules grant in addition to your normal limits.
   */
  spellBudgetExempt?: boolean;
}

export interface SpellSlots {
  [level: number]: {
    total: number;
    expended: number;
  };
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  source?: string;
  /** Class level at which this row was granted (optional); used to sort class features. */
  acquiredAtLevel?: number;
}

export interface Weapon {
  id: string;
  name: string;
  proficient: boolean;
  damageDice: string;
  damageType: string;
  bonus?: number;
  properties?: string;
  /** Ability modifier used for attack and damage (default STR). */
  attackAbility?: Ability;
}

/** Optional numeric tweaks from a special item card (stack across all cards). */
export interface SpecialInventoryModifiers {
  ac?: number;
  initiative?: number;
  spellSaveDc?: number;
  spellAttack?: number;
  /** Flat bonus to passive Perception only (does not change the Perception skill row). */
  passivePerception?: number;
  /** Walking speed in feet (adds to the speed shown on Combat after armor penalties). */
  speed?: number;
  /** Skill name → bonus (names should match a row on your sheet). */
  skills?: Record<string, number>;
  saves?: Partial<Record<Ability, number>>;
}

/** Inventory tab — notable magic items, relics, etc. shown as cards */
export interface SpecialInventoryItem {
  id: string;
  name: string;
  /** Data URL from upload (stored in save). Older characters may still have an https image URL. */
  imageUrl: string;
  description: string;
  modifiers?: SpecialInventoryModifiers;
}

/** Limited-use class or custom abilities (e.g. Second Wind) — tracked on Combat tab */
export interface AbilityUseTrack {
  id: string;
  name: string;
  max: number;
  /** Uses still available (0 … max) */
  remaining: number;
}

/** One attack line on a companion stat block (PHB Appendix B style) */
export interface CompanionAttack {
  id: string;
  name: string;
  attackBonus: number;
  damage: string;
  reachOrRange: string;
  damageType: string;
  notes?: string;
}

export interface CompanionTrait {
  id: string;
  name: string;
  description: string;
}

/**
 * Full companion / familiar / beast ally stat block (2024 PHB layout).
 * Templates live in `data/companions.ts` (sourced from Appendix B — adjust at your table).
 */
export interface CharacterCompanion {
  id: string;
  name: string;
  /** How you got it: Find Familiar, Ranger companion, etc. */
  sourceNote: string;
  size: string;
  creatureType: string;
  alignment: string;
  ac: number;
  hpMax: number;
  hpCurrent: number;
  /**
   * Number of Hit Dice for this stat block. When set (≥1), changing Constitution adjusts max and current HP by
   * (new CON mod − old CON mod) × this number, matching 5e monster math.
   */
  hitDiceCount?: number;
  speed: string;
  abilities: Record<Ability, number>;
  skills: string;
  senses: string;
  languages: string;
  traits: CompanionTrait[];
  attacks: CompanionAttack[];
  extraNotes: string;
}

export interface Character {
  id: string;
  name: string;
  image?: string;
  class: string;
  level: number;
  background: string;
  race: string;
  alignment: string;
  subclass: string;
  xp: number;
  proficiencyBonus?: number;
  inspiration?: boolean;
  
  abilities: Record<Ability, number>;
  proficiencies: string[]; // For saving throws
  /** PHB 2024 armor + shield names — checkbox picks on Core tab */
  armorProficiencies?: string[];
  /** PHB 2024 tool names — checkbox picks on Core tab */
  toolProficiencies?: string[];
  /** PHB 2024 weapon names — checkbox picks on Core tab */
  weaponProficiencies?: string[];
  skills: Skill[];
  
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  ac: number;
  initiative: number;
  speed: string;
  size?: string;
  
  hitDice: {
    total: string;
    remaining: number;
  };
  
  deathSaves: {
    successes: number;
    failures: number;
  };
  
  inventory: string;
  /** Card-style special items (image + description) on Inventory tab */
  specialInventoryItems?: SpecialInventoryItem[];
  /** Free-form backstory, personality, hooks — separate from mechanical background name */
  lore?: string;
  /** Languages the character speaks (species, class, background, extras) — edited on Lore tab */
  languages?: string;
  features: string;
  classFeatures?: Feature[];
  /** Subclass features (PHB subclass options — separate from generic class features) */
  subclassFeatures?: Feature[];
  racialTraits?: Feature[];
  /**
   * Tracks the last background applied via the sheet picker (ASI, skills, Origin feat).
   * Used to strip those effects when picking a different background or renaming away from that pick.
   */
  backgroundPickApplied?: {
    name: string;
    asiDeltas: Partial<Record<Ability, number>>;
    skills: [string, string];
    feat: string;
    /** Spell row ids added for Magic Initiate from this background (removed on revert) */
    miSpellIds?: string[];
  };
  weapons?: Weapon[];
  /** Combat tab: named limited-use abilities (Second Wind, Channel Divinity, custom) */
  abilityUses?: AbilityUseTrack[];
  /** Companions tab — familiars, Ranger companions, etc. (optional tab, hidden by default) */
  companions?: CharacterCompanion[];
  hiddenTabs?: string[];
  /** Settings → compact spell rows on the Spellbook tab (persisted with the character). */
  compactSpellbook?: boolean;
  /** Last-opened sheet tab (persisted with the character / JSON export). */
  sheetActiveTab?: SheetTab;

  conditions: string[];
  exhaustion: number;

  /** Name of the equipped armor piece ('' = unarmored) */
  equippedArmor?: string;
  /** Whether a shield is currently equipped */
  equippedShield?: boolean;

  spellcasting: {
    ability: Ability;
    slots: SpellSlots;
    spells: Spell[];
  };

  /** Druid Wild Shape — uses since last rest & bookmarked beast stat blocks */
  wildShape?: {
    usesExpended: number;
    bookmarkedBeastIds: string[];
    /** Per-beast `Skills:` line edits (merged over built-in reference text when present) */
    beastSkillsEdit?: Record<string, string>;
    /**
     * Druid level 1 — Primal Order: Magician (extra cantrip) vs Warden (martial proficiencies).
     * Spell budget uses this instead of parsing the full feature text (which lists both options).
     */
    primalOrder?: 'magician' | 'warden' | null;
  };

  /** Cleric — patron deity from PHB-style multiverse tables + sample prayers (see `data/clericDeities.ts`) */
  clericDevotion?: {
    /**
     * Cleric level 1 — Divine Order: Protector vs Thaumaturge (2024 PHB).
     * Thaumaturge grants an extra cantrip that doesn’t count against your normal cantrip count.
     */
    divineOrder?: 'protector' | 'thaumaturge' | null;
    /** `ClericDeity.id`, `null` if not chosen yet, or `'other'` for homebrew name */
    deityId: string | null;
    customDeityName?: string;
    notes?: string;
    /** Player-written prayers (add / edit / delete on Faith tab); separate from PHB sample prayers */
    customPrayers?: Array<{ id: string; label: string; text: string }>;
  };

  /** Coin — matches Inventory tab (2024-style denominations incl. EP) */
  currency?: {
    cp?: number;
    sp?: number;
    ep?: number;
    gp?: number;
    pp?: number;
  };
}

export const INITIAL_CHARACTER: Character = {
  id: 'default',
  name: 'New Hero',
  image: '',
  class: 'Fighter',
  level: 1,
  background: 'Soldier',
  race: 'Human',
  alignment: 'Neutral Good',
  subclass: '',
  xp: 0,
  proficiencyBonus: 2,
  inspiration: false,
  abilities: {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  },
  proficiencies: [],
  armorProficiencies: [],
  toolProficiencies: [],
  weaponProficiencies: [],
  skills: [
    { name: 'Acrobatics', ability: 'dex', proficient: false },
    { name: 'Animal Handling', ability: 'wis', proficient: false },
    { name: 'Arcana', ability: 'int', proficient: false },
    { name: 'Athletics', ability: 'str', proficient: false },
    { name: 'Deception', ability: 'cha', proficient: false },
    { name: 'History', ability: 'int', proficient: false },
    { name: 'Insight', ability: 'wis', proficient: false },
    { name: 'Intimidation', ability: 'cha', proficient: false },
    { name: 'Investigation', ability: 'int', proficient: false },
    { name: 'Medicine', ability: 'wis', proficient: false },
    { name: 'Nature', ability: 'int', proficient: false },
    { name: 'Perception', ability: 'wis', proficient: false },
    { name: 'Performance', ability: 'cha', proficient: false },
    { name: 'Persuasion', ability: 'cha', proficient: false },
    { name: 'Religion', ability: 'int', proficient: false },
    { name: 'Sleight of Hand', ability: 'dex', proficient: false },
    { name: 'Stealth', ability: 'dex', proficient: false },
    { name: 'Survival', ability: 'wis', proficient: false },
  ],
  hp: { current: 10, max: 10, temp: 0 },
  ac: 10,
  initiative: 0,
  speed: '30ft',
  size: 'Medium',
  hitDice: { total: '1d10', remaining: 1 },
  deathSaves: { successes: 0, failures: 0 },
  inventory: '',
  specialInventoryItems: [],
  lore: '',
  languages: '',
  features: '',
  classFeatures: [],
  subclassFeatures: [],
  racialTraits: [],
  weapons: [
    {
      id: 'default-weapon',
      name: 'Longsword',
      proficient: true,
      damageDice: '1d8',
      damageType: 'Slashing',
      bonus: 0,
      properties: 'Versatile (1d10)',
      attackAbility: 'str',
    }
  ],
  hiddenTabs: ['lore', 'companions', 'wildshape', 'faith'],
  conditions: [],
  exhaustion: 0,
  spellcasting: {
    ability: 'int',
    slots: {
      1: { total: 0, expended: 0 },
      2: { total: 0, expended: 0 },
      3: { total: 0, expended: 0 },
      4: { total: 0, expended: 0 },
      5: { total: 0, expended: 0 },
      6: { total: 0, expended: 0 },
      7: { total: 0, expended: 0 },
      8: { total: 0, expended: 0 },
      9: { total: 0, expended: 0 },
    },
    spells: [],
  },
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  abilityUses: [],
  companions: [],
};
