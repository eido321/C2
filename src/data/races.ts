import type { FeatTemplate } from './feats';

export interface RaceTrait {
  name: string;
  description: string;
}

export interface LineageOption {
  name: string;
  description: string;
  traits: RaceTrait[];
}

export type BonusChoiceType = 'feat' | 'skill_1' | 'lineage';

export interface BonusChoice {
  type: BonusChoiceType;
  label: string;
  /** For skill_1: list of skills to pick from */
  skillOptions?: string[];
  /** For lineage: list of selectable lineages */
  lineageOptions?: LineageOption[];
}

export interface RaceTemplate {
  name: string;
  description: string;
  speed: number;
  /** Display string, e.g. "Medium (about 5–6 feet tall)" */
  size: string;
  /** If the species lets the player pick their size, these are the options */
  sizeChoices?: string[];
  /** Skills always granted by this species (static, no choice) */
  staticSkillProfs?: string[];
  /** Number of additional skill proficiencies to choose (like Human's Skillful) */
  bonusSkillCount?: number;
  /** Pool to pick bonus skills from (undefined = all skills) */
  bonusSkillPool?: string[];
  languages: string[];
  traits: RaceTrait[];
  bonusChoice?: BonusChoice;
}

export const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
  'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
  'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
  'Sleight of Hand', 'Stealth', 'Survival',
];

// ─── 2024 PHB SPECIES ─────────────────────────────────────────────────────────
export const RACE_LIST: RaceTemplate[] = [

  // ── AASIMAR ─────────────────────────────────────────────────────────────────
  {
    name: 'Aasimar',
    description: 'Aasimar are mortals who carry a spark of the Upper Planes within their souls. Whether descended from an angel or touched by divine power, they can call on that power to heal, harm, or spread hope.',
    speed: 30, size: 'Medium or Small (your choice)', sizeChoices: ['Medium', 'Small'], languages: ['Common', 'one additional language'],
    traits: [
      { name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Celestial Resistance', description: 'You have Resistance to Necrotic and Radiant damage.' },
      { name: 'Healing Hands', description: 'As a Magic action, you touch a creature and roll a number of d4s equal to your Proficiency Bonus. The creature regains Hit Points equal to the total rolled. Once you use this trait, you can\'t use it again until you finish a Long Rest.' },
      { name: 'Light Bearer', description: 'You know the Light cantrip. Charisma is your spellcasting ability for it.' },
      { name: 'Celestial Revelation (Level 3)', description: 'When you reach character level 3, you can transform as a Bonus Action using one of three options (Heavenly Wings, Inner Radiance, or Necrotic Shroud). The transformation lasts 1 minute, and during it you deal extra damage equal to your Proficiency Bonus (Radiant or Necrotic) to one target each turn. Once you transform, you can\'t do so again until you finish a Long Rest.\n\n• Heavenly Wings: You gain a Fly Speed equal to your Speed.\n• Inner Radiance: You shed Bright Light in a 10-foot radius. At the end of each of your turns, each creature within 10 feet takes Radiant damage equal to your Proficiency Bonus.\n• Necrotic Shroud: Creatures (other than your allies) within 10 feet must succeed on a Charisma saving throw (DC 8 + your Charisma modifier + Proficiency Bonus) or have the Frightened condition until the end of your next turn.' },
    ],
  },

  // ── DRAGONBORN ──────────────────────────────────────────────────────────────
  {
    name: 'Dragonborn',
    description: 'The ancestors of dragonborn hatched from the eggs of chromatic and metallic dragons. Dragonborn look like wingless, bipedal dragons—scaly, bright-eyed, and thick-boned with horns on their heads.',
    speed: 30, size: 'Medium (about 5–7 feet tall)', languages: ['Common', 'Draconic'],
    traits: [
      { name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Damage Resistance', description: 'You have Resistance to the damage type associated with your Draconic Ancestry (chosen below).' },
      { name: 'Breath Weapon', description: 'When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 + your Constitution modifier + Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry. On a successful save, half as much. This damage increases: 2d10 at level 5, 3d10 at level 11, 4d10 at level 17. You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and regain all uses on a Long Rest.' },
      { name: 'Draconic Flight (Level 5)', description: 'When you reach character level 5, you can channel draconic magic to give yourself temporary flight as a Bonus Action. Spectral wings sprout from your back for 10 minutes (or until retracted/Incapacitated). You gain a Fly Speed equal to your Speed. Once you use this trait, you can\'t use it again until you finish a Long Rest.' },
    ],
    bonusChoice: {
      type: 'lineage',
      label: 'Choose a Draconic Ancestry',
      lineageOptions: [
        { name: 'Black (Acid)',     description: 'Your breath weapon deals Acid damage. You have Resistance to Acid damage.',     traits: [{ name: 'Draconic Ancestry: Black', description: 'Damage type: Acid. Breath weapon save: Dexterity.' }] },
        { name: 'Blue (Lightning)', description: 'Your breath weapon deals Lightning damage. You have Resistance to Lightning damage.', traits: [{ name: 'Draconic Ancestry: Blue', description: 'Damage type: Lightning. Breath weapon save: Dexterity.' }] },
        { name: 'Brass (Fire)',     description: 'Your breath weapon deals Fire damage. You have Resistance to Fire damage.',     traits: [{ name: 'Draconic Ancestry: Brass', description: 'Damage type: Fire. Breath weapon save: Dexterity.' }] },
        { name: 'Bronze (Lightning)', description: 'Your breath weapon deals Lightning damage. You have Resistance to Lightning damage.', traits: [{ name: 'Draconic Ancestry: Bronze', description: 'Damage type: Lightning. Breath weapon save: Dexterity.' }] },
        { name: 'Copper (Acid)',    description: 'Your breath weapon deals Acid damage. You have Resistance to Acid damage.',    traits: [{ name: 'Draconic Ancestry: Copper', description: 'Damage type: Acid. Breath weapon save: Dexterity.' }] },
        { name: 'Gold (Fire)',      description: 'Your breath weapon deals Fire damage. You have Resistance to Fire damage.',    traits: [{ name: 'Draconic Ancestry: Gold', description: 'Damage type: Fire. Breath weapon save: Dexterity.' }] },
        { name: 'Green (Poison)',   description: 'Your breath weapon deals Poison damage. You have Resistance to Poison damage.', traits: [{ name: 'Draconic Ancestry: Green', description: 'Damage type: Poison. Breath weapon save: Constitution.' }] },
        { name: 'Red (Fire)',       description: 'Your breath weapon deals Fire damage. You have Resistance to Fire damage.',    traits: [{ name: 'Draconic Ancestry: Red', description: 'Damage type: Fire. Breath weapon save: Dexterity.' }] },
        { name: 'Silver (Cold)',    description: 'Your breath weapon deals Cold damage. You have Resistance to Cold damage.',   traits: [{ name: 'Draconic Ancestry: Silver', description: 'Damage type: Cold. Breath weapon save: Constitution.' }] },
        { name: 'White (Cold)',     description: 'Your breath weapon deals Cold damage. You have Resistance to Cold damage.',   traits: [{ name: 'Draconic Ancestry: White', description: 'Damage type: Cold. Breath weapon save: Constitution.' }] },
      ],
    },
  },

  // ── DWARF ───────────────────────────────────────────────────────────────────
  {
    name: 'Dwarf',
    description: 'Dwarves were raised from the earth in the elder days by a deity of the forge. Their god gave them an affinity for stone and metal and for living underground, and made them resilient like the mountains, with a life span of about 350 years.',
    speed: 30, size: 'Medium (about 4–5 feet tall)', languages: ['Common', 'Dwarvish'],
    traits: [
      { name: 'Darkvision', description: 'You have Darkvision with a range of 120 feet.' },
      { name: 'Dwarven Resilience', description: 'You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.' },
      { name: 'Dwarven Toughness', description: 'Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.' },
      { name: 'Stonecunning', description: 'As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense. The stone can be natural or worked. You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.' },
    ],
  },

  // ── ELF ─────────────────────────────────────────────────────────────────────
  {
    name: 'Elf',
    description: 'Created by the god Corellon, elves have pointed ears and lack facial and body hair. They live for around 750 years, and they don\'t sleep but instead enter a trance when they need to rest. An environment transforms elves after they inhabit it for a millennium or more—Drow, High Elves, and Wood Elves are examples.',
    speed: 30, size: 'Medium (about 5–6 feet tall)', languages: ['Common', 'Elvish'],
    staticSkillProfs: ['Perception'],
    traits: [
      { name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Fey Ancestry', description: 'You have Advantage on saving throws you make to avoid or end the Charmed condition.' },
      { name: 'Keen Senses', description: 'You have proficiency in the Perception skill.' },
      { name: 'Trance', description: 'You don\'t need to sleep, and magic can\'t put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.' },
    ],
    bonusChoice: {
      type: 'lineage',
      label: 'Choose an Elven Lineage',
      lineageOptions: [
        {
          name: 'Drow',
          description: 'Your Darkvision range increases to 120 feet. You know the Dancing Lights cantrip. At level 3 you gain Faerie Fire (once/Long Rest). At level 5 you gain Darkness (once/Long Rest). Spell ability: your choice of Int, Wis, or Cha.',
          traits: [
            { name: 'Elven Lineage: Drow', description: 'Darkvision extends to 120 feet. You know Dancing Lights cantrip.\n• Level 3: Faerie Fire (cast once without spell slot per Long Rest)\n• Level 5: Darkness (cast once without spell slot per Long Rest)\nSpellcasting ability: Intelligence, Wisdom, or Charisma (your choice).' },
          ],
        },
        {
          name: 'High Elf',
          description: 'You know the Prestidigitation cantrip; whenever you finish a Long Rest, you can swap it for a different Wizard cantrip. At level 3 you gain Detect Magic. At level 5 you gain Misty Step. Spell ability: your choice.',
          traits: [
            { name: 'Elven Lineage: High Elf', description: 'You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace it with a different cantrip from the Wizard spell list.\n• Level 3: Detect Magic (cast once without spell slot per Long Rest)\n• Level 5: Misty Step (cast once without spell slot per Long Rest)\nSpellcasting ability: Intelligence, Wisdom, or Charisma (your choice).' },
          ],
        },
        {
          name: 'Wood Elf',
          description: 'Your Speed increases to 35 feet. You know the Druidcraft cantrip. At level 3 you gain Longstrider. At level 5 you gain Pass without Trace. Spell ability: your choice.',
          traits: [
            { name: 'Elven Lineage: Wood Elf', description: 'Your Speed increases to 35 feet. You know the Druidcraft cantrip.\n• Level 3: Longstrider (cast once without spell slot per Long Rest)\n• Level 5: Pass without Trace (cast once without spell slot per Long Rest)\nSpellcasting ability: Intelligence, Wisdom, or Charisma (your choice).' },
          ],
        },
      ],
    },
  },

  // ── GNOME ───────────────────────────────────────────────────────────────────
  {
    name: 'Gnome',
    description: 'Gnomes are magical folk created by gods of invention, illusions, and life underground. What they lacked in size they made up for in cleverness—they live around 425 years. Many gnomes like the feeling of a roof over their head, even if that "roof" is nothing more than a hat.',
    speed: 30, size: 'Small (about 3–4 feet tall)', languages: ['Common', 'Gnomish'],
    traits: [
      { name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Gnomish Cunning', description: 'You have Advantage on Intelligence, Wisdom, and Charisma saving throws.' },
    ],
    bonusChoice: {
      type: 'lineage',
      label: 'Choose a Gnomish Lineage',
      lineageOptions: [
        {
          name: 'Forest Gnome',
          description: 'You know the Minor Illusion cantrip. You always have Speak with Animals prepared, and can cast it without a spell slot a number of times equal to your Proficiency Bonus per Long Rest.',
          traits: [
            { name: 'Gnomish Lineage: Forest Gnome', description: 'You know the Minor Illusion cantrip. You always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, regaining all uses on a Long Rest. You can also cast it using any spell slots you have. Intelligence, Wisdom, or Charisma is your spellcasting ability (your choice).' },
          ],
        },
        {
          name: 'Rock Gnome',
          description: 'You know the Mending and Prestidigitation cantrips. You can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP) with one Prestidigitation effect. You can have up to three such devices at once; each lasts 8 hours.',
          traits: [
            { name: 'Gnomish Lineage: Rock Gnome', description: 'You know the Mending and Prestidigitation cantrips. You can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP). When you create it, choose one effect from Prestidigitation—the device produces that effect when a creature uses a Bonus Action to touch it. You can have up to 3 such devices; each falls apart 8 hours after creation or when you dismantle it.' },
          ],
        },
      ],
    },
  },

  // ── GOLIATH ─────────────────────────────────────────────────────────────────
  {
    name: 'Goliath',
    description: 'Towering over most folk, goliaths are distant descendants of giants. Each goliath bears the favors of the first giants—favors that manifest in various supernatural boons, including the ability to temporarily approach the height of their gigantic kin.',
    speed: 35, size: 'Medium (about 7–8 feet tall)', languages: ['Common', 'Giant'],
    traits: [
      { name: 'Large Form (Level 5)', description: 'Starting at character level 5, you can change your size to Large as a Bonus Action if you\'re in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). During it, you have Advantage on Strength checks and your Speed increases by 10 feet. Once you use this trait, you can\'t use it again until you finish a Long Rest.' },
      { name: 'Powerful Build', description: 'You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity.' },
    ],
    bonusChoice: {
      type: 'lineage',
      label: 'Choose a Giant Ancestry',
      lineageOptions: [
        { name: 'Cloud\'s Jaunt (Cloud Giant)', description: 'As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.', traits: [{ name: 'Giant Ancestry: Cloud\'s Jaunt', description: 'As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see. Uses: Proficiency Bonus per Long Rest.' }] },
        { name: 'Fire\'s Burn (Fire Giant)', description: 'When you hit a target with an attack roll and deal damage, you can also deal 1d10 Fire damage to that target.', traits: [{ name: 'Giant Ancestry: Fire\'s Burn', description: 'When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage. Uses: Proficiency Bonus per Long Rest.' }] },
        { name: 'Frost\'s Chill (Frost Giant)', description: 'When you hit a target with an attack roll and deal damage, you can also deal 1d6 Cold damage and reduce its Speed by 10 feet until the start of your next turn.', traits: [{ name: 'Giant Ancestry: Frost\'s Chill', description: 'When you hit a target with an attack roll and deal damage, deal 1d6 extra Cold damage and reduce its Speed by 10 feet until the start of your next turn. Uses: Proficiency Bonus per Long Rest.' }] },
        { name: 'Hill\'s Tumble (Hill Giant)', description: 'When you hit a Large or smaller creature with an attack roll and deal damage, you can give that target the Prone condition.', traits: [{ name: 'Giant Ancestry: Hill\'s Tumble', description: 'When you hit a Large or smaller creature with an attack roll and deal damage, you can give that target the Prone condition. Uses: Proficiency Bonus per Long Rest.' }] },
        { name: 'Stone\'s Endurance (Stone Giant)', description: 'When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.', traits: [{ name: 'Giant Ancestry: Stone\'s Endurance', description: 'When you take damage, take a Reaction to roll 1d12. Add your Constitution modifier and reduce the incoming damage by that total. Uses: Proficiency Bonus per Long Rest.' }] },
        { name: 'Storm\'s Thunder (Storm Giant)', description: 'When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.', traits: [{ name: 'Giant Ancestry: Storm\'s Thunder', description: 'When you take damage from a creature within 60 feet of you, take a Reaction to deal 1d8 Thunder damage to that creature. Uses: Proficiency Bonus per Long Rest.' }] },
      ],
    },
  },

  // ── HALFLING ────────────────────────────────────────────────────────────────
  {
    name: 'Halfling',
    description: 'Cherished and guided by gods who value life, home, and hearth, halflings gravitate toward bucolic havens where family and community help shape their lives. Their size—similar to that of a human child—helps them pass through crowds unnoticed and slip through tight spaces. They live about 150 years.',
    speed: 30, size: 'Small (about 2–3 feet tall)', languages: ['Common', 'Halfling'],
    traits: [
      { name: 'Brave', description: 'You have Advantage on saving throws you make to avoid or end the Frightened condition.' },
      { name: 'Halfling Nimbleness', description: 'You can move through the space of any creature that is a size larger than you, but you can\'t stop in the same space.' },
      { name: 'Luck', description: 'When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.' },
      { name: 'Naturally Stealthy', description: 'You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.' },
    ],
  },

  // ── HUMAN ───────────────────────────────────────────────────────────────────
  {
    name: 'Human',
    description: 'Found throughout the multiverse, humans are as varied as they are numerous, and they endeavor to achieve as much as they can in the years they are given. Their ambition and resourcefulness are commended, respected, and feared on many worlds.',
    speed: 30, size: 'Medium or Small (your choice)', sizeChoices: ['Medium', 'Small'],
    languages: ['Common', 'one additional language of your choice'],
    bonusSkillCount: 1,
    traits: [
      { name: 'Resourceful', description: 'You gain Heroic Inspiration whenever you finish a Long Rest.' },
      { name: 'Skillful', description: 'You gain proficiency in one skill of your choice.' },
      { name: 'Versatile', description: 'You gain an Origin feat of your choice (see the Feats chapter). The Skilled feat is recommended.' },
    ],
    bonusChoice: {
      type: 'feat',
      label: 'Choose an Origin Feat (Versatile)',
    },
  },

  // ── ORC ─────────────────────────────────────────────────────────────────────
  {
    name: 'Orc',
    description: 'Orcs trace their creation to Gruumsh, a powerful god who roamed the wide open spaces of the Material Plane. Gruumsh equipped his children with gifts to help them wander great plains, vast caverns, and churning seas and face the monsters that lurk there.',
    speed: 30, size: 'Medium (about 6–7 feet tall)', languages: ['Common', 'Orc'],
    traits: [
      { name: 'Adrenaline Rush', description: 'You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.' },
      { name: 'Darkvision', description: 'You have Darkvision with a range of 120 feet.' },
      { name: 'Relentless Endurance', description: 'When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can\'t do so again until you finish a Long Rest.' },
    ],
  },

  // ── TIEFLING ────────────────────────────────────────────────────────────────
  {
    name: 'Tiefling',
    description: 'Tieflings are either born in the Lower Planes or have fiendish ancestors who originated there. A tiefling is linked by blood to a devil, a demon, or some other Fiend. This connection comes with the promise of power yet has no effect on the tiefling\'s moral outlook.',
    speed: 30, size: 'Medium or Small (your choice)', sizeChoices: ['Medium', 'Small'], languages: ['Common', 'Infernal'],
    traits: [
      { name: 'Darkvision', description: 'You have Darkvision with a range of 60 feet.' },
      { name: 'Otherworldly Presence', description: 'You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you chose for your Fiendish Legacy.' },
    ],
    bonusChoice: {
      type: 'lineage',
      label: 'Choose a Fiendish Legacy',
      lineageOptions: [
        {
          name: 'Abyssal',
          description: 'You have Resistance to Poison damage. You know the Poison Spray cantrip. At level 3: Ray of Sickness. At level 5: Hold Person.',
          traits: [
            { name: 'Fiendish Legacy: Abyssal', description: 'Resistance to Poison damage. You know the Poison Spray cantrip.\n• Level 3: Ray of Sickness (cast once without a spell slot per Long Rest)\n• Level 5: Hold Person (cast once without a spell slot per Long Rest)\nSpellcasting ability: Intelligence, Wisdom, or Charisma (your choice).' },
          ],
        },
        {
          name: 'Chthonic',
          description: 'You have Resistance to Necrotic damage. You know the Chill Touch cantrip. At level 3: False Life. At level 5: Ray of Enfeeblement.',
          traits: [
            { name: 'Fiendish Legacy: Chthonic', description: 'Resistance to Necrotic damage. You know the Chill Touch cantrip.\n• Level 3: False Life (cast once without a spell slot per Long Rest)\n• Level 5: Ray of Enfeeblement (cast once without a spell slot per Long Rest)\nSpellcasting ability: Intelligence, Wisdom, or Charisma (your choice).' },
          ],
        },
        {
          name: 'Infernal',
          description: 'You have Resistance to Fire damage. You know the Fire Bolt cantrip. At level 3: Hellish Rebuke. At level 5: Darkness.',
          traits: [
            { name: 'Fiendish Legacy: Infernal', description: 'Resistance to Fire damage. You know the Fire Bolt cantrip.\n• Level 3: Hellish Rebuke (cast once without a spell slot per Long Rest)\n• Level 5: Darkness (cast once without a spell slot per Long Rest)\nSpellcasting ability: Intelligence, Wisdom, or Charisma (your choice).' },
          ],
        },
      ],
    },
  },
];

/** Build a Feature array from a race + optional bonus choices */
export function buildRaceFeatures(
  race: RaceTemplate,
  bonusFeat?: FeatTemplate | null,
  bonusSkill?: string,
  chosenLineage?: LineageOption | null,
): Array<{ id: string; name: string; description: string; source?: string }> {
  const id = () => Math.random().toString(36).substr(2, 9);

  const features = race.traits.map((t) => ({
    id: id(),
    name: t.name,
    description: t.description,
    source: race.name,
  }));

  if (chosenLineage) {
    chosenLineage.traits.forEach((t) => {
      features.push({ id: id(), name: t.name, description: t.description, source: race.name });
    });
  }

  if (bonusFeat) {
    features.push({
      id: id(),
      name: `Feat: ${bonusFeat.name}`,
      description: bonusFeat.description,
      source: race.name,
    });
  }

  if (bonusSkill) {
    features.push({
      id: id(),
      name: 'Keen Senses / Skillful',
      description: `You gain proficiency in: ${bonusSkill}.`,
      source: race.name,
    });
  }

  return features;
}
