import type { Ability } from '@/types';

export interface BackgroundTemplate {
  name: string;
  description: string;
  /** Three ability scores eligible for the background's ASI */
  abilityScores: [Ability, Ability, Ability];
  /** The Origin feat granted by this background */
  feat: string;
  featDescription: string;
  /** Two skill proficiencies */
  skills: [string, string];
  /** Tool proficiency (may be "choose one" for some) */
  toolProficiency: string;
  /** Equipment option A description */
  equipmentA: string;
}

/** Backgrounds whose tool line is “Choose one kind of Gaming Set” (Guard, Noble, Soldier). */
export function backgroundRequiresGamingSetChoice(bg: BackgroundTemplate): boolean {
  const t = bg.toolProficiency.toLowerCase();
  return t.includes('gaming set') && t.includes('choose');
}

// ─── 2024 PHB BACKGROUNDS ─────────────────────────────────────────────────────
export const BACKGROUND_LIST: BackgroundTemplate[] = [
  {
    name: 'Acolyte',
    description: 'You devoted yourself to service in a temple, either nestled in a town or secluded in a sacred grove. There you performed rites in honor of a god or pantheon. You served under a priest and studied religion. Thanks to your priest\'s instruction and your own devotion, you also learned how to channel a modicum of divine power in service to your place of worship and the people who prayed there.',
    abilityScores: ['int', 'wis', 'cha'],
    feat: 'Magic Initiate (Cleric)',
    featDescription: 'You learn two Cleric cantrips and one level 1 Cleric spell. You can cast the level 1 spell once per Long Rest without a spell slot.',
    skills: ['Insight', 'Religion'],
    toolProficiency: 'Calligrapher\'s Supplies',
    equipmentA: 'Calligrapher\'s Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP',
  },
  {
    name: 'Artisan',
    description: 'You began mopping floors and scrubbing counters in an artisan\'s workshop for a few coppers per day as soon as you were strong enough to carry a bucket. When you were old enough to apprentice, you learned to create basic crafts of your own, as well as how to sweet-talk the occasional demanding customer. Your trade has also given you a keen eye for detail.',
    abilityScores: ['str', 'dex', 'int'],
    feat: 'Crafter',
    featDescription:
      'Discount: 20 percent off nonmagical purchases. Fast Crafting: after a Long Rest, craft one item from the Fast Crafting table if you have the associated Artisan\'s Tools and proficiency (item lasts until your next Long Rest). Your Artisan background also grants proficiency in one Artisan\'s tool set—choose that set in the builder.',
    skills: ['Investigation', 'Persuasion'],
    toolProficiency: 'Choose one kind of Artisan\'s Tools',
    equipmentA: 'Artisan\'s Tools (same as above), 2 Pouches, Traveler\'s Clothes, 32 GP',
  },
  {
    name: 'Charlatan',
    description: 'Once you were old enough to order an ale, you soon had a favorite stool in every tavern within ten miles of where you were born. As you traveled the circuit from public house to watering hole, you learned to prey on unfortunates who were in the market for a comforting lie or two—perhaps a sham potion or forged ancestry records.',
    abilityScores: ['dex', 'con', 'cha'],
    feat: 'Skilled',
    featDescription: 'Gain proficiency in any combination of three skills or tools of your choice.',
    skills: ['Deception', 'Sleight of Hand'],
    toolProficiency: 'Forgery Kit',
    equipmentA: 'Forgery Kit, Costume, Fine Clothes, 15 GP',
  },
  {
    name: 'Criminal',
    description: 'You eked out a living in dark alleyways, cutting purses or burgling shops. Perhaps you were part of a small gang of like-minded wrongdoers who looked out for each other. Or maybe you were a lone wolf, fending for yourself against the local thieves\' guild and more fearsome lawbreakers.',
    abilityScores: ['dex', 'con', 'int'],
    feat: 'Alert',
    featDescription: 'Add Proficiency Bonus to Initiative rolls. Immediately after rolling Initiative, you can swap your result with one willing ally\'s result.',
    skills: ['Sleight of Hand', 'Stealth'],
    toolProficiency: 'Thieves\' Tools',
    equipmentA: '2 Daggers, Thieves\' Tools, Crowbar, 2 Pouches, Traveler\'s Clothes, 16 GP',
  },
  {
    name: 'Entertainer',
    description: 'You spent much of your youth following roving fairs and carnivals, performing odd jobs for musicians and acrobats in exchange for lessons. You may have learned how to walk a tightrope, how to play a lute in a distinct style, or how to recite poetry with impeccable diction. To this day, you thrive on applause and long for the stage.',
    abilityScores: ['str', 'dex', 'cha'],
    feat: 'Musician',
    featDescription:
      'Encouraging Song: after a Short or Long Rest, play a song on a Musical Instrument you are proficient with to give Heroic Inspiration to a number of allies who hear it equal to your Proficiency Bonus. Your Entertainer background also grants proficiency with one Musical Instrument—choose that instrument in the builder.',
    skills: ['Acrobatics', 'Performance'],
    toolProficiency: 'Choose one kind of Musical Instrument',
    equipmentA: 'Musical Instrument (same as above), 2 Costumes, Mirror, Perfume, Traveler\'s Clothes, 11 GP',
  },
  {
    name: 'Farmer',
    description: 'You grew up close to the land. Years tending animals and cultivating the earth rewarded you with patience and good health. You have a keen appreciation for nature\'s bounty alongside a healthy respect for nature\'s wrath.',
    abilityScores: ['str', 'con', 'wis'],
    feat: 'Tough',
    featDescription: 'HP maximum increases by twice your character level when you gain this feat, and by 2 for each subsequent level.',
    skills: ['Animal Handling', 'Nature'],
    toolProficiency: 'Carpenter\'s Tools',
    equipmentA: 'Sickle, Carpenter\'s Tools, Healer\'s Kit, Iron Pot, Shovel, Traveler\'s Clothes, 30 GP',
  },
  {
    name: 'Guard',
    description: 'Your feet ache when you remember the countless hours you spent at your post in the tower. You were trained to keep one eye looking outside the wall, watching for marauders sweeping from the nearby forest, and your other eye looking inside the wall, searching for cutpurses and troublemakers.',
    abilityScores: ['str', 'int', 'wis'],
    feat: 'Alert',
    featDescription: 'Add Proficiency Bonus to Initiative rolls. Immediately after rolling Initiative, you can swap your result with one willing ally\'s result.',
    skills: ['Athletics', 'Perception'],
    toolProficiency: 'Choose one kind of Gaming Set',
    equipmentA: 'Spear, Light Crossbow, 20 Bolts, Gaming Set (same as above), Hooded Lantern, Manacles, Quiver, Traveler\'s Clothes, 12 GP',
  },
  {
    name: 'Guide',
    description: 'You came of age outdoors, far from settled lands. Your home was anywhere you chose to spread your bedroll. There are wonders in the wilderness—strange monsters, pristine forests and streams, overgrown ruins of great halls once trod by giants—and you learned to fend for yourself as you explored them. From time to time, you guided friendly nature priests who instructed you in the fundamentals of channeling the magic of the wild.',
    abilityScores: ['dex', 'con', 'wis'],
    feat: 'Magic Initiate (Druid)',
    featDescription: 'You learn two Druid cantrips and one level 1 Druid spell. You can cast the level 1 spell once per Long Rest without a spell slot.',
    skills: ['Stealth', 'Survival'],
    toolProficiency: 'Cartographer\'s Tools',
    equipmentA: 'Shortbow, 20 Arrows, Cartographer\'s Tools, Bedroll, Quiver, Tent, Traveler\'s Clothes, 3 GP',
  },
  {
    name: 'Hermit',
    description: 'You spent your early years secluded in a hut or monastery located well beyond the outskirts of the nearest settlement. In those days, your only companions were the creatures of the forest and those who would occasionally visit to bring news of the outside world and supplies. The solitude allowed you to spend many hours pondering the mysteries of creation.',
    abilityScores: ['con', 'wis', 'cha'],
    feat: 'Healer',
    featDescription: 'Expend a Healer\'s Kit use to let a creature spend one Hit Die and regain HP equal to the roll + Proficiency Bonus. Reroll 1s on any healing dice.',
    skills: ['Medicine', 'Religion'],
    toolProficiency: 'Herbalism Kit',
    equipmentA: 'Quarterstaff, Herbalism Kit, Bedroll, Book (philosophy), Lamp, Oil (3 flasks), Traveler\'s Clothes, 16 GP',
  },
  {
    name: 'Merchant',
    description: 'You were apprenticed to a trader, caravan master, or shopkeeper, learning the fundamentals of commerce. You traveled broadly, and you earned a living by buying and selling the raw materials artisans need to practice their craft or finished works from such crafters. You might have transported goods from one place to another or bought them from traveling traders and sold them in your own shop.',
    abilityScores: ['con', 'int', 'cha'],
    feat: 'Lucky',
    featDescription: 'Luck Points equal to Proficiency Bonus. Spend 1 to gain Advantage on a D20 Test, or impose Disadvantage on an attack roll against you. Regain all on a Long Rest.',
    skills: ['Animal Handling', 'Persuasion'],
    toolProficiency: 'Navigator\'s Tools',
    equipmentA: 'Navigator\'s Tools, 2 Pouches, Traveler\'s Clothes, 22 GP',
  },
  {
    name: 'Noble',
    description: 'You were raised in a castle, surrounded by wealth, power, and privilege. Your family of minor aristocrats ensured that you received a first-class education, some of which you appreciated and some of which you resented. Your time in the castle, especially the many hours you spent observing your family at court, also taught you a great deal about leadership.',
    abilityScores: ['str', 'int', 'cha'],
    feat: 'Skilled',
    featDescription: 'Gain proficiency in any combination of three skills or tools of your choice.',
    skills: ['History', 'Persuasion'],
    toolProficiency: 'Choose one kind of Gaming Set',
    equipmentA: 'Gaming Set (same as above), Fine Clothes, Perfume, 29 GP',
  },
  {
    name: 'Sage',
    description: 'You spent your formative years traveling between manors and monasteries, performing various odd jobs and services in exchange for access to their libraries. You whiled away many a long evening studying books and scrolls, learning the lore of the multiverse—even the rudiments of magic—and your mind yearns for more.',
    abilityScores: ['con', 'int', 'wis'],
    feat: 'Magic Initiate (Wizard)',
    featDescription: 'You learn two Wizard cantrips and one level 1 Wizard spell. You can cast the level 1 spell once per Long Rest without a spell slot.',
    skills: ['Arcana', 'History'],
    toolProficiency: 'Calligrapher\'s Supplies',
    equipmentA: 'Quarterstaff, Calligrapher\'s Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP',
  },
  {
    name: 'Sailor',
    description: 'You lived as a seafarer, wind at your back and decks swaying beneath your feet. You\'ve perched on barstools in more ports of call than you can remember, faced mighty storms, and swapped stories with folk who live beneath the waves.',
    abilityScores: ['str', 'dex', 'wis'],
    feat: 'Tavern Brawler',
    featDescription: 'Unarmed Strikes deal 1d4 + Strength. Reroll 1s on Unarmed Strike damage. Proficiency with improvised weapons. Push a creature 5 ft. after hitting with an Unarmed Strike.',
    skills: ['Acrobatics', 'Perception'],
    toolProficiency: 'Navigator\'s Tools',
    equipmentA: 'Dagger, Navigator\'s Tools, Rope, Traveler\'s Clothes, 20 GP',
  },
  {
    name: 'Scribe',
    description: 'You spent formative years in a scriptorium, a monastery dedicated to the preservation of knowledge, or a government agency, where you learned to write with a clear hand and produce finely written texts. Perhaps you scribed government documents or copied tomes of literature. You might have some skill as a writer of poetry, narrative, or scholarly research. Above all, you have a careful attention to detail.',
    abilityScores: ['dex', 'int', 'wis'],
    feat: 'Skilled',
    featDescription: 'Gain proficiency in any combination of three skills or tools of your choice.',
    skills: ['Investigation', 'Perception'],
    toolProficiency: 'Calligrapher\'s Supplies',
    equipmentA: 'Calligrapher\'s Supplies, Fine Clothes, Lamp, Oil (3 flasks), Parchment (12 sheets), 23 GP',
  },
  {
    name: 'Soldier',
    description: 'You began training for war as soon as you reached adulthood and carry precious few memories of life before you took up arms. Battle is in your blood. Sometimes you catch yourself reflexively performing the basic fighting exercises you learned first. Eventually, you put that training to use on the battlefield, protecting the realm by waging war.',
    abilityScores: ['str', 'dex', 'con'],
    feat: 'Savage Attacker',
    featDescription: 'Once per turn when you hit a target with a weapon, you can roll the weapon\'s damage dice twice and use either roll.',
    skills: ['Athletics', 'Intimidation'],
    toolProficiency: 'Choose one kind of Gaming Set',
    equipmentA: 'Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer\'s Kit, Quiver, Traveler\'s Clothes, 14 GP',
  },
  {
    name: 'Wayfarer',
    description: 'You grew up on the streets surrounded by similarly ill-fated castoffs, a few of them friends and a few of them rivals. You slept where you could and did odd jobs for food. At times, when the hunger became unbearable, you resorted to theft. Still, you never lost your pride and never abandoned hope. Fate is not yet finished with you.',
    abilityScores: ['dex', 'wis', 'cha'],
    feat: 'Lucky',
    featDescription: 'Luck Points equal to Proficiency Bonus. Spend 1 to gain Advantage on a D20 Test, or impose Disadvantage on an attack roll against you. Regain all on a Long Rest.',
    skills: ['Insight', 'Stealth'],
    toolProficiency: 'Thieves\' Tools',
    equipmentA: '2 Daggers, Thieves\' Tools, Gaming Set (any), Bedroll, 2 Pouches, Traveler\'s Clothes, 16 GP',
  },
];

export const ABILITY_LABELS: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};
