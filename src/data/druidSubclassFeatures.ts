import type { LevelFeature } from './levelData';

/**
 * Druid circles — scripted subclass rows for level-up / class features.
 * 2024 PHB: Land, Moon, Sea, Stars. Supplemental: Dreams (XGtE), Shepherd, Spores, Wildfire (TCoE) — confirm numbers at your table.
 * Milestones on this sheet follow SUBCLASS_FEATURE_LEVELS (3, 6, 10, 15); some books list capstones at 14 — we attach them at 15.
 */
export const DRUID_SUBCLASS_FEATURES: Partial<
  Record<string, Partial<Record<number, LevelFeature[]>>>
> = {
  'Circle of Dreams': {
    3: [
      {
        name: 'Balm of the Summer Court',
        desc:
          'You have a pool of fey energy represented by a number of d6s equal to your Druid level. As a Bonus Action, you can expend one die from the pool and target one creature you can see within 120 feet. Roll the die; the target regains a number of HP equal to the roll + your WIS modifier (min 1 HP), or you can instead grant the target temporary HP equal to the roll. The pool refills when you finish a Long Rest.',
      },
    ],
    6: [
      {
        name: 'Hearth of Moonlight and Brightness',
        desc:
          'During a Short Rest, you can touch a point in space to create an invisible 30-foot-radius sphere until the end of the rest. Within it, you and allies gain a +5 bonus to Dexterity (Stealth) and Wisdom (Perception) checks, and nonmagical light there counts as sunlight for features like sunlight sensitivity. (XGtE.)',
      },
    ],
    10: [
      {
        name: 'Hidden Paths',
        desc:
          'As an Action, you can open a closed door or container within 30 feet without using a spell slot (as if with knock). As an Action you can teleport up to 60 feet to a space you can see; you can do this a number of times per Long Rest equal to your WIS modifier (min 1). (XGtE.)',
      },
    ],
    15: [
      {
        name: 'Walker in Dreams',
        desc:
          'After a Long Rest you can cast dream without a spell slot (no range limit on targeting). Once per Long Rest you can cast teleportation circle without a spell slot. WIS is your spellcasting ability. (XGtE lists this at 14th level; this sheet places it with other circle capstones at Druid 15.)',
      },
    ],
  },

  'Circle of the Land': {
    3: [
      {
        name: 'Circle of the Land Spells',
        desc:
          'Whenever you finish a Long Rest, choose a land type: Arid, Polar, Temperate, or Tropical. You always have the circle spells for that type whose level is ≤ your Druid level prepared (see 2024 PHB tables). You can change land type each Long Rest.',
      },
      {
        name: 'Land’s Aid',
        desc:
          'Magic action: expend one Wild Shape use and choose a point within 60 feet. Creatures you choose in a 10-foot-radius Sphere make a Constitution save vs your spell save DC, taking 2d6 Necrotic on a failed save, or half on a success. Creatures you choose instead heal 2d6 HP. Damage/healing increases by 1d6 at Druid 10 (3d6) and 14 (4d6).',
      },
    ],
    6: [
      {
        name: 'Natural Recovery',
        desc:
          'Once per Long Rest you can cast one prepared circle spell of 1st level or higher without a slot. After a Short Rest you can recover expended spell slots with combined level ≤ half your Druid level (round up), none of them 6th level or higher.',
      },
    ],
    10: [
      {
        name: 'Nature’s Ward',
        desc:
          'You are immune to the Poisoned condition. You have Resistance to a damage type tied to your current land choice (Arid: Fire; Polar: Cold; Temperate: Lightning; Tropical: Poison) — see 2024 PHB.',
      },
    ],
    15: [
      {
        name: 'Nature’s Sanctuary',
        desc:
          'Magic action: expend one Wild Shape use to conjure spectral plants in a 15-foot Cube within 120 feet (see 2024 PHB for difficult terrain, cover, and Bonus Action relocation). (2024 PHB lists this at 14th; this sheet uses Druid 15 with the class table.)',
      },
    ],
  },

  'Circle of the Moon': {
    3: [
      {
        name: 'Circle Forms',
        desc:
          'When you use Wild Shape, max beast CR equals your Druid level ÷ 3 (round down). In beast form your AC is 13 + WIS modifier if higher than the beast’s AC. You gain temporary HP equal to 3 × your Druid level when you transform.',
      },
      {
        name: 'Circle of the Moon Spells',
        desc:
          'You always have the spells from the Circle of the Moon table prepared for your level (3rd: cure wounds, moonbeam, starry wisp; higher levels per 2024 PHB). You can cast them in Wild Shape form.',
      },
    ],
    6: [
      {
        name: 'Improved Circle Forms',
        desc:
          'In Wild Shape, each of your attacks can deal its normal damage type or Radiant. You add your WIS modifier to Constitution saving throws you make.',
      },
    ],
    10: [
      {
        name: 'Moonlight Step',
        desc:
          'Bonus Action: teleport up to 30 feet to an unoccupied space you can see; you have Advantage on the next attack roll you make before the end of this turn. Uses per Long Rest = WIS modifier (min 1). You can restore uses by expending a 2nd-level+ spell slot for each use (no action).',
      },
    ],
    15: [
      {
        name: 'Lunar Form',
        desc:
          'In Wild Shape, once per turn you can deal +2d10 Radiant damage to a target you hit. When you use Moonlight Step, you can bring one willing creature with you. (2024 PHB lists this at 14th; this sheet uses Druid 15.)',
      },
    ],
  },

  'Circle of the Sea': {
    3: [
      {
        name: 'Circle of the Sea Spells',
        desc:
          'You always have the spells from the Circle of the Sea table prepared at your Druid level (3rd: fog cloud, gust of wind, ray of frost, shatter, thunderwave; see 2024 PHB for higher levels).',
      },
      {
        name: 'Wrath of the Sea',
        desc:
          'Bonus Action: expend one Wild Shape use to manifest a 5-foot Emanation of ocean spray around you for 10 minutes. When you manifest it and as a Bonus Action on later turns you can force one creature in the Emanation to make a Constitution save vs your spell DC, taking cold damage equal to WIS modifier d6s (min 1) and being pushed 15 feet from you on a failed save.',
      },
    ],
    6: [
      {
        name: 'Aquatic Affinity',
        desc:
          'Your Wrath of the Sea Emanation becomes 10 feet. You gain a Swim Speed equal to your walking Speed.',
      },
    ],
    10: [
      {
        name: 'Stormborn',
        desc:
          'While Wrath of the Sea is active you gain Fly Speed equal to your Speed and Resistance to Cold, Lightning, and Thunder damage.',
      },
    ],
    15: [
      {
        name: 'Oceanic Gift',
        desc:
          'You can manifest Wrath of the Sea around one willing creature within 60 feet instead of yourself (they use your save DC and WIS for damage). You can manifest it around both you and that creature by expending two Wild Shape uses. (2024 PHB lists this at 14th; this sheet uses Druid 15.)',
      },
    ],
  },

  'Circle of Stars': {
    3: [
      {
        name: 'Star Map',
        desc:
          'You have a Tiny star chart (form from 2024 PHB table or your choice) that is a spellcasting focus. While holding it, guidance and guiding bolt are prepared; you can cast guiding bolt without a slot WIS modifier times per Long Rest (min 1). Replace a lost map with a 1-hour ceremony during a Short or Long Rest.',
      },
      {
        name: 'Starry Form',
        desc:
          'Bonus Action: expend one Wild Shape use to assume a luminous starry form for 10 minutes (you keep your stats). Choose Archer, Chalice, or Dragon constellation — see 2024 PHB for attack, healing boost, and D20 floor benefits.',
      },
    ],
    6: [
      {
        name: 'Cosmic Omen',
        desc:
          'After a Long Rest, roll a die and gain Weal or Woe omen (even/odd); until your next Long Rest you can use WIS modifier reactions (min 1) to roll a d6 and add it to a creature’s attack, save, or ability check you can see within 30 feet.',
      },
    ],
    10: [
      {
        name: 'Twinkling Constellations',
        desc:
          'Your Starry Form constellations improve: Archer and Chalice use larger dice, and Dragon gains an extra protective option — see 2024 Player’s Handbook for exact wording.',
      },
    ],
    15: [
      {
        name: 'Full of Stars',
        desc:
          'While in Starry Form you have Resistance to Bludgeoning, Piercing, and Slashing damage. (2024 PHB lists this at 14th; this sheet uses Druid 15.)',
      },
    ],
  },

  'Circle of the Shepherd': {
    3: [
      {
        name: 'Speech of the Woods',
        desc:
          'You can cast speak with animals at will. You learn sylvan.',
      },
      {
        name: 'Spirit Totem',
        desc:
          'As a Bonus Action, summon a spectral totem for 1 minute within 60 feet (Bear, Hawk, or Unicorn — see XGtE for temp HP, advantage on Perception in the aura, unicorn healing options, and exact numbers).',
      },
    ],
    6: [
      {
        name: 'Mighty Summoner',
        desc:
          'Beasts and fey you conjure have +2 HP per Hit Die and their attacks count as magical for overcoming resistance.',
      },
    ],
    10: [
      {
        name: 'Guardian Spirit',
        desc:
          'While a Spirit Totem is active, you can use a Reaction when a visible ally in the aura takes damage to reduce that damage by 1d6 + half your Druid level.',
      },
    ],
    15: [
      {
        name: 'Faithful Summons',
        desc:
          'When you are reduced to 0 HP or incapacitated against your will, you can summon four CR 1/4 or lower beasts within 20 feet that protect you and fight for 1 hour. Once per Long Rest. (XGtE lists at 14th; this sheet uses Druid 15.)',
      },
    ],
  },

  'Circle of Spores': {
    3: [
      {
        name: 'Circle of Spores Spells',
        desc:
          'You always have chill touch prepared. At Druid 3, 5, 7, 9 you gain additional always-prepared spells from the circle list (TCoE).',
      },
      {
        name: 'Halo of Spores',
        desc:
          'Reaction when a creature you can see within 10 feet of you is hit by an attack: the attacker takes 1d4 Necrotic (scales at higher levels per TCoE).',
      },
      {
        name: 'Symbiotic Entity',
        desc:
          'Bonus Action: expend Wild Shape to awaken spores for 10 minutes — gain temp HP and boost Halo of Spores damage; your melee weapon attacks deal extra Necrotic damage. (TCoE.)',
      },
    ],
    6: [
      {
        name: 'Fungal Infestation',
        desc:
          'When a Small or larger beast/humanoid dies within 60 feet, use Reaction to animate a zombie (1 HP) that makes one attack then falls apart.',
      },
    ],
    10: [
      {
        name: 'Spreading Spores',
        desc:
          'While Symbiotic Entity is active, your Halo of Spores range becomes 30 feet.',
      },
    ],
    15: [
      {
        name: 'Fungal Body',
        desc:
          'You are immune to critical hits unless incapacitated; you have advantage on saves vs being blinded, deafened, frightened, or poisoned. (TCoE lists at 14th; this sheet uses Druid 15.)',
      },
    ],
  },

  'Circle of Wildfire': {
    3: [
      {
        name: 'Circle of Wildfire Spells',
        desc:
          'You always have certain fire-themed spells prepared at Druid 3, 5, 7, 9 (TCoE table).',
      },
      {
        name: 'Summon Wildfire Spirit',
        desc:
          'Action: expend Wild Shape use to summon a Wildfire Spirit in an unoccupied space within 30 feet for 1 hour. It can teleport and deal fire damage in an aura; you command it as a Bonus Action. Uses scale with TCoE.',
      },
    ],
    6: [
      {
        name: 'Enhanced Bond',
        desc:
          'While your Wildfire Spirit is summoned, add 1d8 fire damage to a damage roll when you cast a spell; you can cast cure wounds targeting yourself or the spirit without somatic components at its space.',
      },
    ],
    10: [
      {
        name: 'Cauterizing Flames',
        desc:
          'When a Small or larger creature dies within 30 feet of you or your spirit, you or an ally in 30 feet regains HP or stands from prone as a Reaction.',
      },
    ],
    15: [
      {
        name: 'Blazing Revival',
        desc:
          'When reduced to 0 HP you can instead drop to 1 HP and have your Wildfire Spirit appear in an empty space within 30 feet (even if you had none). Once per Long Rest. (TCoE lists at 14th; this sheet uses Druid 15.)',
      },
    ],
  },
};
