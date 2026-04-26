/**
 * Features that require picking a rules branch before adding from the library.
 * Curated from 2024 PHB class/subclass JSON and feat rules (see docs/rules_copypaste.md).
 *
 * Branch UI (FeatPickerModal): Divine Order, Primal Order, Blessed Strikes (+ Improved), Elemental Fury (+ Improved),
 * Path of the Wild Heart (Rage / Aspect / Power of the Wilds), Elemental Adept (damage type).
 * Character creation wizard only auto-grants level 1 class features — it handles Divine + Primal Order inline; other
 * branches appear when you add those rows from the library or level up. Open-ended PHB choices (Magic Initiate list,
 * Skilled, spell picks, etc.) use separate flows, not this registry.
 */

import type { FeatTemplate } from '@/data/feats';
import type { FeatureLibraryChoicePayload } from '@/lib/featPickerOrderChoices';
import {
  splitDivineOrderDescription,
  splitIntroAndTwoBranchesInOrder,
  splitNBranchesByLabels,
  splitPrimalOrderDescription,
} from '@/lib/featPickerBranchSplits';

export interface LibraryChoiceOption {
  id: string;
  label: string;
}

export type LibraryChoiceAccent = 'violet' | 'amber' | 'sky' | 'rose' | 'slate';

export interface LibraryChoiceRule {
  id: string;
  title: string;
  blurb: string;
  accent: LibraryChoiceAccent;
  match: (f: FeatTemplate, characterClass?: string) => boolean;
  options: LibraryChoiceOption[];
  build: (
    feat: FeatTemplate,
    optionId: string,
  ) => { feat: FeatTemplate; payload?: FeatureLibraryChoicePayload };
}

function featName(f: FeatTemplate) {
  return f.name.trim();
}

export const LIBRARY_CHOICE_RULES: LibraryChoiceRule[] = [
  {
    id: 'cleric_divine_order',
    title: 'Choose Divine Order',
    blurb: 'Pick Protector or Thaumaturge — sheet text and spell budget follow this branch.',
    accent: 'violet',
    match: (f, cls) =>
      f.category === 'Class Feature' &&
      featName(f) === 'Divine Order' &&
      f.source === 'Cleric' &&
      cls === 'Cleric',
    options: [
      { id: 'protector', label: 'Protector' },
      { id: 'thaumaturge', label: 'Thaumaturge' },
    ],
    build: (feat, optionId) => {
      const parts = splitDivineOrderDescription(feat.description);
      const v = optionId as 'protector' | 'thaumaturge';
      const body = v === 'protector' ? parts?.protector : parts?.thaumaturge;
      return {
        feat: {
          ...feat,
          name: `Divine Order (${v === 'protector' ? 'Protector' : 'Thaumaturge'})`,
          description: parts ? `${parts.intro}\n\n${body ?? ''}`.trim() : feat.description,
        },
        payload: { kind: 'cleric_divine_order', value: v },
      };
    },
  },
  {
    id: 'druid_primal_order',
    title: 'Choose Primal Order',
    blurb: 'Pick Magician or Warden — sheet text and spell budget follow this branch.',
    accent: 'amber',
    match: (f, cls) =>
      f.category === 'Class Feature' &&
      featName(f) === 'Primal Order' &&
      f.source === 'Druid' &&
      cls === 'Druid',
    options: [
      { id: 'magician', label: 'Magician' },
      { id: 'warden', label: 'Warden' },
    ],
    build: (feat, optionId) => {
      const parts = splitPrimalOrderDescription(feat.description);
      const v = optionId as 'magician' | 'warden';
      const body = v === 'magician' ? parts?.magician : parts?.warden;
      return {
        feat: {
          ...feat,
          name: `Primal Order (${v === 'magician' ? 'Magician' : 'Warden'})`,
          description: parts ? `${parts.intro}\n\n${body ?? ''}`.trim() : feat.description,
        },
        payload: { kind: 'druid_primal_order', value: v },
      };
    },
  },
  {
    id: 'cleric_blessed_strikes',
    title: 'Choose Blessed Strikes option',
    blurb: 'Divine Strike (weapon riders) or Potent Spellcasting (cantrip damage).',
    accent: 'violet',
    match: (f, cls) =>
      f.category === 'Class Feature' &&
      featName(f) === 'Blessed Strikes' &&
      f.source === 'Cleric' &&
      cls === 'Cleric',
    options: [
      { id: 'divine_strike', label: 'Divine Strike' },
      { id: 'potent_spellcasting', label: 'Potent Spellcasting' },
    ],
    build: (feat, optionId) => {
      const s = splitIntroAndTwoBranchesInOrder(
        feat.description,
        'Divine Strike',
        'Potent Spellcasting',
      );
      const v = optionId as 'divine_strike' | 'potent_spellcasting';
      const body = v === 'divine_strike' ? s?.first : s?.second;
      const label = v === 'divine_strike' ? 'Divine Strike' : 'Potent Spellcasting';
      return {
        feat: {
          ...feat,
          name: `Blessed Strikes (${label})`,
          description: s ? `${s.intro}\n\n${body ?? ''}`.trim() : feat.description,
        },
        payload: { kind: 'cleric_blessed_strikes', value: v },
      };
    },
  },
  {
    id: 'cleric_improved_blessed_strikes',
    title: 'Choose Improved Blessed Strikes option',
    blurb: 'Must match the option you chose for Blessed Strikes.',
    accent: 'violet',
    match: (f, cls) =>
      f.category === 'Class Feature' &&
      featName(f) === 'Improved Blessed Strikes' &&
      f.source === 'Cleric' &&
      cls === 'Cleric',
    options: [
      { id: 'divine_strike', label: 'Divine Strike' },
      { id: 'potent_spellcasting', label: 'Potent Spellcasting' },
    ],
    build: (feat, optionId) => {
      const s = splitIntroAndTwoBranchesInOrder(
        feat.description,
        'Divine Strike',
        'Potent Spellcasting',
      );
      const v = optionId as 'divine_strike' | 'potent_spellcasting';
      const body = v === 'divine_strike' ? s?.first : s?.second;
      const label = v === 'divine_strike' ? 'Divine Strike' : 'Potent Spellcasting';
      return {
        feat: {
          ...feat,
          name: `Improved Blessed Strikes (${label})`,
          description: s ? `${s.intro}\n\n${body ?? ''}`.trim() : feat.description,
        },
        payload: { kind: 'cleric_blessed_strikes', value: v },
      };
    },
  },
  {
    id: 'druid_elemental_fury',
    title: 'Choose Elemental Fury option',
    blurb: 'Potent Spellcasting (cantrip) or Primal Strike (weapon/beast).',
    accent: 'amber',
    match: (f, cls) =>
      f.category === 'Class Feature' &&
      featName(f) === 'Elemental Fury' &&
      f.source === 'Druid' &&
      cls === 'Druid',
    options: [
      { id: 'potent_spellcasting', label: 'Potent Spellcasting' },
      { id: 'primal_strike', label: 'Primal Strike' },
    ],
    build: (feat, optionId) => {
      const s = splitIntroAndTwoBranchesInOrder(
        feat.description,
        'Potent Spellcasting',
        'Primal Strike',
      );
      const v = optionId as 'potent_spellcasting' | 'primal_strike';
      const body = v === 'potent_spellcasting' ? s?.first : s?.second;
      const label = v === 'potent_spellcasting' ? 'Potent Spellcasting' : 'Primal Strike';
      return {
        feat: {
          ...feat,
          name: `Elemental Fury (${label})`,
          description: s ? `${s.intro}\n\n${body ?? ''}`.trim() : feat.description,
        },
        payload: { kind: 'druid_elemental_fury', value: v },
      };
    },
  },
  {
    id: 'druid_improved_elemental_fury',
    title: 'Choose Improved Elemental Fury option',
    blurb: 'Must match Elemental Fury.',
    accent: 'amber',
    match: (f, cls) =>
      f.category === 'Class Feature' &&
      featName(f) === 'Improved Elemental Fury' &&
      f.source === 'Druid' &&
      cls === 'Druid',
    options: [
      { id: 'potent_spellcasting', label: 'Potent Spellcasting' },
      { id: 'primal_strike', label: 'Primal Strike' },
    ],
    build: (feat, optionId) => {
      const s = splitIntroAndTwoBranchesInOrder(
        feat.description,
        'Potent Spellcasting',
        'Primal Strike',
      );
      const v = optionId as 'potent_spellcasting' | 'primal_strike';
      const body = v === 'potent_spellcasting' ? s?.first : s?.second;
      const label = v === 'potent_spellcasting' ? 'Potent Spellcasting' : 'Primal Strike';
      return {
        feat: {
          ...feat,
          name: `Improved Elemental Fury (${label})`,
          description: s ? `${s.intro}\n\n${body ?? ''}`.trim() : feat.description,
        },
        payload: { kind: 'druid_elemental_fury', value: v },
      };
    },
  },
  {
    id: 'barbarian_rage_of_the_wilds',
    title: 'Choose Rage of the Wilds animal',
    blurb: 'Bear, Eagle, or Wolf — each grants different benefits while raging.',
    accent: 'rose',
    match: (f) =>
      f.category === 'Subclass Feature' &&
      featName(f) === 'Rage of the Wilds' &&
      f.subclass === 'Path of the Wild Heart',
    options: [
      { id: 'bear', label: 'Bear' },
      { id: 'eagle', label: 'Eagle' },
      { id: 'wolf', label: 'Wolf' },
    ],
    build: (feat, optionId) => {
      const s = splitNBranchesByLabels(feat.description, ['Bear', 'Eagle', 'Wolf']);
      const cap = optionId.charAt(0).toUpperCase() + optionId.slice(1);
      const body = s?.byLabel[cap];
      return {
        feat: {
          ...feat,
          name: `Rage of the Wilds (${cap})`,
          description: s && body ? `${s.intro}\n\n${body}`.trim() : feat.description,
        },
        payload: {
          kind: 'barbarian_rage_of_the_wilds',
          value: optionId as 'bear' | 'eagle' | 'wolf',
        },
      };
    },
  },
  {
    id: 'barbarian_aspect_of_the_wilds',
    title: 'Choose Aspect of the Wilds',
    blurb: 'Owl, Panther, or Salmon — you can change this after each Long Rest.',
    accent: 'rose',
    match: (f) =>
      f.category === 'Subclass Feature' &&
      featName(f) === 'Aspect of the Wilds' &&
      f.subclass === 'Path of the Wild Heart',
    options: [
      { id: 'owl', label: 'Owl' },
      { id: 'panther', label: 'Panther' },
      { id: 'salmon', label: 'Salmon' },
    ],
    build: (feat, optionId) => {
      const s = splitNBranchesByLabels(feat.description, ['Owl', 'Panther', 'Salmon']);
      const cap = optionId.charAt(0).toUpperCase() + optionId.slice(1);
      const body = s?.byLabel[cap];
      return {
        feat: {
          ...feat,
          name: `Aspect of the Wilds (${cap})`,
          description: s && body ? `${s.intro}\n\n${body}`.trim() : feat.description,
        },
        payload: {
          kind: 'barbarian_aspect_of_the_wilds',
          value: optionId as 'owl' | 'panther' | 'salmon',
        },
      };
    },
  },
  {
    id: 'barbarian_power_of_the_wilds',
    title: 'Choose Power of the Wilds',
    blurb: 'Falcon, Lion, or Ram — each changes your Rage activation benefits.',
    accent: 'rose',
    match: (f) =>
      f.category === 'Subclass Feature' &&
      featName(f) === 'Power of the Wilds' &&
      f.subclass === 'Path of the Wild Heart',
    options: [
      { id: 'falcon', label: 'Falcon' },
      { id: 'lion', label: 'Lion' },
      { id: 'ram', label: 'Ram' },
    ],
    build: (feat, optionId) => {
      const s = splitNBranchesByLabels(feat.description, ['Falcon', 'Lion', 'Ram']);
      const cap = optionId.charAt(0).toUpperCase() + optionId.slice(1);
      const body = s?.byLabel[cap];
      return {
        feat: {
          ...feat,
          name: `Power of the Wilds (${cap})`,
          description: s && body ? `${s.intro}\n\n${body}`.trim() : feat.description,
        },
        payload: {
          kind: 'barbarian_power_of_the_wilds',
          value: optionId as 'falcon' | 'lion' | 'ram',
        },
      };
    },
  },
  {
    id: 'feat_elemental_adept',
    title: 'Choose damage type (Energy Mastery)',
    blurb: 'Repeatable feat: each time pick a different type. Spells ignore Resistance to this type.',
    accent: 'sky',
    match: (f) => f.category === 'Feat' && featName(f) === 'Elemental Adept',
    options: [
      { id: 'acid', label: 'Acid' },
      { id: 'cold', label: 'Cold' },
      { id: 'fire', label: 'Fire' },
      { id: 'lightning', label: 'Lightning' },
      { id: 'thunder', label: 'Thunder' },
    ],
    build: (feat, optionId) => {
      const v = optionId as 'acid' | 'cold' | 'fire' | 'lightning' | 'thunder';
      const label = v.charAt(0).toUpperCase() + v.slice(1);
      return {
        feat: {
          ...feat,
          name: `Elemental Adept (${label})`,
          description: `${feat.description}\n\n— Your Energy Mastery choice: ${label}.`,
        },
        payload: { kind: 'feat_elemental_adept', value: v },
      };
    },
  },
];

export function matchLibraryChoiceRule(
  f: FeatTemplate | null,
  characterClass?: string,
): LibraryChoiceRule | null {
  if (!f) return null;
  for (const r of LIBRARY_CHOICE_RULES) {
    if (r.match(f, characterClass)) return r;
  }
  return null;
}

export const LIBRARY_CHOICE_ACCENT_STYLES: Record<
  LibraryChoiceAccent,
  {
    border: string;
    bg: string;
    title: string;
    text: string;
    chip: string;
    chipInactive: string;
  }
> = {
  violet: {
    border: 'border-zinc-700 border-l-4 border-l-violet-500',
    bg: 'bg-zinc-900',
    title: 'text-zinc-200',
    text: 'text-zinc-400',
    chip: 'border-violet-500 bg-zinc-800 text-zinc-100 ring-1 ring-violet-400/35',
    chipInactive: 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
  },
  amber: {
    border: 'border-zinc-700 border-l-4 border-l-amber-500',
    bg: 'bg-zinc-900',
    title: 'text-zinc-200',
    text: 'text-zinc-400',
    chip: 'border-amber-500 bg-zinc-800 text-zinc-100 ring-1 ring-amber-400/35',
    chipInactive: 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
  },
  sky: {
    border: 'border-zinc-700 border-l-4 border-l-sky-500',
    bg: 'bg-zinc-900',
    title: 'text-zinc-200',
    text: 'text-zinc-400',
    chip: 'border-sky-500 bg-zinc-800 text-zinc-100 ring-1 ring-sky-400/35',
    chipInactive: 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
  },
  rose: {
    border: 'border-zinc-700 border-l-4 border-l-rose-500',
    bg: 'bg-zinc-900',
    title: 'text-zinc-200',
    text: 'text-zinc-400',
    chip: 'border-rose-500 bg-zinc-800 text-zinc-100 ring-1 ring-rose-400/35',
    chipInactive: 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
  },
  slate: {
    border: 'border-zinc-700 border-l-4 border-l-zinc-500',
    bg: 'bg-zinc-900',
    title: 'text-zinc-200',
    text: 'text-zinc-400',
    chip: 'border-zinc-400 bg-zinc-800 text-zinc-100 ring-1 ring-zinc-400/35',
    chipInactive: 'border-zinc-600 bg-zinc-800/70 text-zinc-300 hover:border-zinc-500',
  },
};
