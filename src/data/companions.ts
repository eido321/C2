/**
 * PHB-style companion stat blocks for quick-add on the Companions tab.
 * Based on 2024 Player's Handbook Appendix B (familiars & common beasts) — confirm numbers against `public/rules.pdf` at play.
 */

import type { Ability, CharacterCompanion, CompanionAttack, CompanionTrait } from '@/types';
import { getModifier } from '@/lib/utils';

const nid = () => Math.random().toString(36).substr(2, 9);

function cloneTrait(t: Omit<CompanionTrait, 'id'>): CompanionTrait {
  return { ...t, id: nid() };
}

function cloneAttack(a: Omit<CompanionAttack, 'id'>): CompanionAttack {
  return { ...a, id: nid() };
}

const abs = (
  str: number,
  dex: number,
  con: number,
  int: number,
  wis: number,
  cha: number,
): Record<Ability, number> => ({ str, dex, con, int, wis, cha });

export interface CompanionTemplateMeta {
  templateId: string;
  label: string;
  /** Short hint for the picker */
  blurb: string;
}

/** Deep copy with fresh ids for sheet storage */
/** When hitDiceCount is set, CON changes adjust HP by Δmod × count (PHB-style). */
export function companionHpAfterConChange(
  comp: CharacterCompanion,
  prevCon: number,
  nextCon: number,
): { hpMax: number; hpCurrent: number } | null {
  const n = comp.hitDiceCount;
  if (n === undefined || n < 1) return null;
  const delta = (getModifier(nextCon) - getModifier(prevCon)) * n;
  if (delta === 0) return null;
  const hpMax = Math.max(1, comp.hpMax + delta);
  const hpCurrent = Math.min(hpMax, Math.max(0, comp.hpCurrent + delta));
  return { hpMax, hpCurrent };
}

export function instantiateCompanionTemplate(templateId: string): CharacterCompanion | null {
  const raw = COMPANION_TEMPLATE_MAP[templateId];
  if (!raw) return null;
  return {
    ...raw,
    id: nid(),
    traits: raw.traits.map((t) => cloneTrait({ name: t.name, description: t.description })),
    attacks: raw.attacks.map((a) =>
      cloneAttack({
        name: a.name,
        attackBonus: a.attackBonus,
        damage: a.damage,
        reachOrRange: a.reachOrRange,
        damageType: a.damageType,
        notes: a.notes,
      }),
    ),
  };
}

const COMPANION_TEMPLATE_MAP: Record<string, CharacterCompanion> = {
  bat: {
    id: '',
    name: 'Bat',
    sourceNote: 'Find Familiar (PHB)',
    size: 'Tiny',
    creatureType: 'Beast',
    alignment: 'Unaligned',
    ac: 12,
    hpMax: 1,
    hpCurrent: 1,
    hitDiceCount: 1,
    speed: '5 ft., fly 30 ft.',
    abilities: abs(2, 15, 8, 2, 12, 4),
    skills: '',
    senses: 'Blindsight 60 ft.',
    languages: '—',
    traits: [
      { id: '', name: 'Echolocation', description: "The bat can't use its Blindsight while Deafened." },
      { id: '', name: 'Keen Hearing', description: 'The bat has Advantage on Wisdom (Perception) checks that rely on hearing.' },
    ],
    attacks: [
      { id: '', name: 'Bite', attackBonus: 0, damage: '1', reachOrRange: '5 ft.', damageType: 'Piercing' },
    ],
    extraNotes: 'Challenge — | Proficiency +2',
  },
  cat: {
    id: '',
    name: 'Cat',
    sourceNote: 'Find Familiar (PHB)',
    size: 'Tiny',
    creatureType: 'Beast',
    alignment: 'Unaligned',
    ac: 12,
    hpMax: 1,
    hpCurrent: 1,
    hitDiceCount: 1,
    speed: '40 ft., climb 30 ft.',
    abilities: abs(3, 15, 10, 3, 12, 7),
    skills: 'Perception +3, Stealth +4',
    senses: 'Darkvision 60 ft.',
    languages: '—',
    traits: [
      { id: '', name: 'Keen Smell', description: 'The cat has Advantage on Wisdom (Perception) checks that rely on smell.' },
    ],
    attacks: [
      { id: '', name: 'Claws', attackBonus: 0, damage: '1', reachOrRange: '5 ft.', damageType: 'Slashing' },
    ],
    extraNotes: 'Challenge — | Proficiency +2',
  },
  owl: {
    id: '',
    name: 'Owl',
    sourceNote: 'Find Familiar (PHB)',
    size: 'Tiny',
    creatureType: 'Beast',
    alignment: 'Unaligned',
    ac: 11,
    hpMax: 1,
    hpCurrent: 1,
    hitDiceCount: 1,
    speed: '5 ft., fly 60 ft.',
    abilities: abs(3, 13, 8, 2, 12, 7),
    skills: 'Perception +3, Stealth +3',
    senses: 'Darkvision 120 ft.',
    languages: '—',
    traits: [
      { id: '', name: 'Flyby', description: "The owl doesn't provoke Opportunity Attacks when it flies out of an enemy's reach." },
      {
        id: '',
        name: 'Keen Hearing and Sight',
        description: 'The owl has Advantage on Wisdom (Perception) checks that rely on hearing or sight.',
      },
    ],
    attacks: [
      { id: '', name: 'Talons', attackBonus: 2, damage: '1', reachOrRange: '5 ft.', damageType: 'Slashing' },
    ],
    extraNotes: 'Challenge — | Proficiency +2',
  },
  raven: {
    id: '',
    name: 'Raven',
    sourceNote: 'Find Familiar (PHB)',
    size: 'Tiny',
    creatureType: 'Beast',
    alignment: 'Unaligned',
    ac: 12,
    hpMax: 1,
    hpCurrent: 1,
    hitDiceCount: 1,
    speed: '10 ft., fly 50 ft.',
    abilities: abs(2, 14, 8, 2, 12, 6),
    skills: 'Perception +3',
    senses: '—',
    languages: "Understands Common but can't speak",
    traits: [
      { id: '', name: 'Mimicry', description: 'The raven can mimic simple sounds, such as a whisper or chitter.' },
    ],
    attacks: [
      { id: '', name: 'Beak', attackBonus: 2, damage: '1', reachOrRange: '5 ft.', damageType: 'Piercing' },
    ],
    extraNotes: 'Challenge — | Proficiency +2',
  },
  wolf: {
    id: '',
    name: 'Wolf',
    sourceNote: 'Beast / Ranger companion candidate (PHB)',
    size: 'Medium',
    creatureType: 'Beast',
    alignment: 'Unaligned',
    ac: 13,
    hpMax: 11,
    hpCurrent: 11,
    hitDiceCount: 2,
    speed: '40 ft.',
    abilities: abs(12, 15, 12, 3, 12, 6),
    skills: 'Perception +3, Stealth +4',
    senses: 'Darkvision 60 ft.',
    languages: '—',
    traits: [
      { id: '', name: 'Pack Tactics', description: 'The wolf has Advantage on attack rolls against a creature if at least one ally is within 5 feet of the target.' },
    ],
    attacks: [
      {
        id: '',
        name: 'Bite',
        attackBonus: 4,
        damage: '2d4 + 2',
        reachOrRange: '5 ft.',
        damageType: 'Piercing',
        notes: 'DC 11 Str save or Prone if target is Large or smaller',
      },
    ],
    extraNotes: 'Challenge 1/4 | Proficiency +2',
  },
  imp: {
    id: '',
    name: 'Imp',
    sourceNote: 'Pact of the Chain — Find Familiar special form (PHB)',
    size: 'Small',
    creatureType: 'Fiend',
    alignment: 'Lawful Evil',
    ac: 13,
    hpMax: 21,
    hpCurrent: 21,
    hitDiceCount: 6,
    speed: '20 ft., fly 60 ft.',
    abilities: abs(6, 17, 13, 11, 12, 14),
    skills: 'Stealth +5',
    senses: 'Darkvision 120 ft.',
    languages: 'Common, Infernal',
    traits: [
      { id: '', name: 'Devil\'s Sight', description: 'Magical Darkness does not impede the imp\'s Darkvision.' },
      { id: '', name: 'Magic Resistance', description: 'The imp has Advantage on saving throws against spells and other magical effects.' },
    ],
    attacks: [
      {
        id: '',
        name: 'Sting',
        attackBonus: 5,
        damage: '1d4 + 3',
        reachOrRange: '5 ft.',
        damageType: 'Piercing',
        notes: 'Plus 3d6 Poison damage, DC 13 Con half poison',
      },
    ],
    extraNotes: 'Challenge 1 | Proficiency +3',
  },
  pseudodragon: {
    id: '',
    name: 'Pseudodragon',
    sourceNote: 'Pact of the Chain — Find Familiar special form (PHB)',
    size: 'Small',
    creatureType: 'Dragon',
    alignment: 'Neutral Good',
    ac: 13,
    hpMax: 7,
    hpCurrent: 7,
    hitDiceCount: 2,
    speed: '15 ft., fly 60 ft.',
    abilities: abs(6, 15, 13, 10, 12, 10),
    skills: 'Perception +3, Stealth +4',
    senses: 'Blindsight 10 ft., Darkvision 60 ft.',
    languages: 'Understands Common and Draconic but can\'t speak',
    traits: [
      { id: '', name: 'Limited Telepathy', description: 'Telepathically communicate simple ideas with a creature within 100 ft. that understands a language.' },
      { id: '', name: 'Magic Resistance', description: 'Advantage on saves vs spells and magical effects.' },
    ],
    attacks: [
      {
        id: '',
        name: 'Bite',
        attackBonus: 4,
        damage: '1d4 + 2',
        reachOrRange: '5 ft.',
        damageType: 'Piercing',
      },
      {
        id: '',
        name: 'Sting',
        attackBonus: 4,
        damage: '1d4 + 2',
        reachOrRange: '5 ft.',
        damageType: 'Piercing',
        notes: 'DC 11 Con or Poisoned 1 hour; fails by 5+ Unconscious 1 hour',
      },
    ],
    extraNotes: 'Challenge 1/4 | Proficiency +2',
  },
};

export const COMPANION_TEMPLATES: CompanionTemplateMeta[] = [
  { templateId: 'bat', label: 'Bat', blurb: 'Tiny familiar — blindsight' },
  { templateId: 'cat', label: 'Cat', blurb: 'Tiny familiar' },
  { templateId: 'owl', label: 'Owl', blurb: 'Tiny familiar — Flyby' },
  { templateId: 'raven', label: 'Raven', blurb: 'Tiny familiar — mimicry' },
  { templateId: 'wolf', label: 'Wolf', blurb: 'Medium beast — Pack Tactics' },
  { templateId: 'imp', label: 'Imp', blurb: 'Chain familiar — fiend' },
  { templateId: 'pseudodragon', label: 'Pseudodragon', blurb: 'Chain familiar — dragon' },
];

export function blankCompanion(): CharacterCompanion {
  return {
    id: nid(),
    name: 'New companion',
    sourceNote: '',
    size: 'Medium',
    creatureType: 'Beast',
    alignment: 'Unaligned',
    ac: 10,
    hpMax: 10,
    hpCurrent: 10,
    /** One die by default so CON changes adjust HP (clear the field on the sheet if you want fixed HP). */
    hitDiceCount: 1,
    speed: '30 ft.',
    abilities: abs(10, 10, 10, 10, 10, 10),
    skills: '',
    senses: '',
    languages: '—',
    traits: [],
    attacks: [],
    extraNotes: '',
  };
}
