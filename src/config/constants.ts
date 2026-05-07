export const DND_CLASSES = [
  'Artificer',
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard'
] as const;

export type DndClass = typeof DND_CLASSES[number];

export const ABILITIES = [
  { id: 'str', label: 'Strength' },
  { id: 'dex', label: 'Dexterity' },
  { id: 'con', label: 'Constitution' },
  { id: 'int', label: 'Intelligence' },
  { id: 'wis', label: 'Wisdom' },
  { id: 'cha', label: 'Charisma' }
] as const;

/** PHB 2024 subclass names — aligned with docs/rules_copypaste.md (see tools/sync_subclass_features_from_rules.py). */
export const SUBCLASSES: Record<string, string[]> = {
  Artificer: ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith'],
  Barbarian: ['Path of the Berserker', 'Path of the Wild Heart', 'Path of the World Tree', 'Path of the Zealot'],
  Bard: ['College of Dance', 'College of Glamour', 'College of Lore', 'College of Valor'],
  /** Core 2024 PHB domains plus Nature Domain (legacy PHB subclass; not in rules_copypaste.md). */
  Cleric: ['Life Domain', 'Light Domain', 'Nature Domain', 'Trickery Domain', 'War Domain'],
  Druid: ['Circle of the Land', 'Circle of the Moon', 'Circle of the Sea', 'Circle of the Stars'],
  Fighter: ['Battle Master', 'Champion', 'Eldritch Knight', 'Psi Warrior'],
  Monk: [
    'Warrior of Mercy',
    'Warrior of Shadow',
    'Warrior of the Elements',
    'Warrior of the Open Hand',
  ],
  Paladin: ['Oath of Devotion', 'Oath of Glory', 'Oath of the Ancients', 'Oath of Vengeance'],
  Ranger: ['Beast Master', 'Fey Wanderer', 'Gloom Stalker', 'Hunter'],
  Rogue: ['Arcane Trickster', 'Assassin', 'Soulknife', 'Thief'],
  Sorcerer: ['Aberrant Sorcery', 'Clockwork Sorcery', 'Draconic Sorcery', 'Wild Magic Sorcery'],
  Warlock: ['Archfey Patron', 'Celestial Patron', 'Fiend Patron', 'Great Old One Patron'],
  Wizard: ['Abjurer', 'Diviner', 'Evoker', 'Illusionist'],
};

export const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil'
] as const;

/** Max checkboxes per spell slot tier (2024 PHB full-caster table caps). */
export const SPELL_SLOT_TRACKER_MAX: Record<number, number> = {
  1: 4,
  2: 3,
  3: 3,
  4: 3,
  5: 3,
  6: 2,
  7: 2,
  8: 1,
  9: 1,
};

export function maxSpellSlotTrackerSlots(level: number): number {
  return SPELL_SLOT_TRACKER_MAX[level] ?? 4;
}

export const COMMON_DICE = [
  '1d4',
  '1d6',
  '1d8',
  '1d10',
  '1d12',
  '2d4',
  '2d6',
  '2d8'
] as const;

export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Restrained', 'Stunned', 'Unconscious'
] as const;

export const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
] as const;
