// Subclass features granted on level up. Detailed entries override the fallback.
// Wording should match your table copy in public/rules.pdf where possible.

import type { LevelFeature } from './levelData';
import { getFeaturesForLevel } from './levelData';
import { DRUID_SUBCLASS_FEATURES } from './druidSubclassFeatures';

/** Class levels at which the PHB-style table grants a subclass-specific feature */
export const SUBCLASS_FEATURE_LEVELS: Record<string, number[]> = {
  Artificer: [3, 7, 15],
  Barbarian: [3, 6, 10, 14],
  Bard: [3, 6, 14],
  Cleric: [3, 6, 8, 17],
  Druid: [3, 6, 10, 15],
  Fighter: [3, 7, 10, 15, 18],
  Monk: [6, 11, 17],
  Paladin: [3, 7, 15, 18, 20],
  Ranger: [3, 6, 10, 14, 17],
  Rogue: [3, 9, 13, 17],
  Sorcerer: [3, 6, 11, 14],
  Warlock: [3, 6, 10, 14, 18],
  Wizard: [3, 6, 10, 14, 18],
};

/**
 * Class-feature rows that are only “choose your subclass” placeholders.
 * When we add real subclass features, these are removed so you don’t get duplicates.
 */
export const SUBCLASS_PLACEHOLDER_NAMES = new Set([
  'Artificer Specialist',
  'Specialist Feature',
  'Barbarian Subclass',
  'Primal Path',
  'Primal Path Feature',
  'Bard College',
  'Bard College Feature',
  'Bard Subclass',
  'Cleric Subclass',
  'Divine Domain',
  'Divine Domain Feature',
  'Druid Subclass',
  'Druid Circle',
  'Druid Circle Feature',
  'Fighter Subclass',
  'Martial Archetype',
  'Martial Archetype Feature',
  'Monastic Tradition',
  'Monastic Tradition Feature',
  'Monk Subclass',
  'Monk Subclass Feature',
  'Paladin Subclass',
  'Sacred Oath',
  'Sacred Oath Feature',
  'Sacred Oath Capstone',
  'Ranger Subclass',
  'Ranger Archetype',
  'Ranger Archetype Feature',
  'Rogue Subclass',
  'Roguish Archetype',
  'Roguish Archetype Feature',
  'Sorcerer Subclass',
  'Sorcerous Origin',
  'Sorcerous Origin Feature',
  'Warlock Subclass',
  'Otherworldly Patron Feature',
  'Wizard Subclass',
  'Arcane Tradition',
  'Arcane Tradition Feature',
]);

export type MergedLevelFeature = LevelFeature & {
  featureSource: 'class' | 'subclass';
};

/**
 * Optional per-subclass, per-level rules text. Keys must match SUBCLASSES in config/constants.ts exactly.
 */
export const SUBCLASS_FEATURES: Partial<
  Record<string, Partial<Record<string, Partial<Record<number, LevelFeature[]>>>>>
> = {
  Barbarian: {
    'Path of the Berserker': {
      3: [
        {
          name: 'Frenzy',
          desc:
            'When you Rage, you can go into a frenzy. Until the rage ends, you can make one melee weapon attack as a Bonus Action on each of your turns after this one. When the rage ends, you suffer one level of Exhaustion. (2024 PHB changed this feature — if you use that printing, replace with the Frenzy text in public/rules.pdf.)',
        },
      ],
      6: [
        {
          name: 'Mindless Rage',
          desc:
            'While raging, you can’t be Charmed or Frightened. If you are Charmed or Frightened when you enter your rage, the effect is suspended for the duration of the rage.',
        },
      ],
      10: [
        {
          name: 'Retaliation',
          desc:
            'When a creature within 5 feet of you hits you with an attack, you can use your Reaction to make a melee weapon attack against that creature.',
        },
      ],
      14: [
        {
          name: 'Intimidating Presence',
          desc:
            'Action: creatures of your choice within 30 feet that can see or hear you must make a WIS save (DC 8 + your proficiency bonus + your CHA modifier) or be Frightened of you until the end of your next turn. Extend with a Bonus Action on later turns. Once a creature succeeds, it is immune to this effect for 24 hours.',
        },
      ],
    },
  },
  Druid: DRUID_SUBCLASS_FEATURES,
};

export function getSubclassFeaturesForLevel(
  className: string,
  subclass: string,
  level: number,
): LevelFeature[] {
  const specific = SUBCLASS_FEATURES[className]?.[subclass]?.[level];
  if (specific && specific.length > 0) return specific;

  const milestones = SUBCLASS_FEATURE_LEVELS[className];
  if (!milestones?.includes(level)) return [];

  return [
    {
      name: `${subclass} (${className} ${level})`,
      desc:
        `Subclass feature at ${className} level ${level}. This subclass is not scripted in the app yet — copy the feature name and full text from your Player’s Handbook (or approved source) onto the Features tab. Your choice (${subclass}) is still saved on the character.`,
    },
  ];
}

export function mergeClassAndSubclassLevelFeatures(
  className: string,
  level: number,
  subclass: string | undefined,
): MergedLevelFeature[] {
  const base = getFeaturesForLevel(className, level);
  const sub = subclass?.trim()
    ? getSubclassFeaturesForLevel(className, subclass.trim(), level)
    : [];

  const filteredBase =
    sub.length === 0
      ? base
      : base.filter((f) => !SUBCLASS_PLACEHOLDER_NAMES.has(f.name));

  const classPart: MergedLevelFeature[] = filteredBase.map((f) => ({
    ...f,
    featureSource: 'class',
  }));
  const subPart: MergedLevelFeature[] = sub.map((f) => ({
    ...f,
    featureSource: 'subclass',
  }));
  return [...classPart, ...subPart];
}
