import {Dices, Heading, ImageIcon, List, Minus, ScrollText, Shield, Type, type LucideIcon} from 'lucide-react';
import type {Block, BlockType, SpellLevelGroup} from '@/types';
import {uid} from './utils';

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: 'Text',
  heading: 'Heading',
  abilityScores: 'Ability Scores',
  statBlock: 'Stat',
  image: 'Image',
  divider: 'Divider',
  list: 'List',
  spellList: 'Spell List',
};

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  text: Type,
  heading: Heading,
  abilityScores: Dices,
  statBlock: Shield,
  image: ImageIcon,
  divider: Minus,
  list: List,
  spellList: ScrollText,
};

function truncate(value: string, max = 28): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Human-friendly layer label: the block's custom name if set, else a derived one. */
export function deriveBlockName(block: Block): string {
  if (block.name && block.name.trim()) return block.name.trim();
  switch (block.type) {
    case 'heading':
      return block.content.text ? `Heading: ${truncate(block.content.text)}` : 'Heading';
    case 'text':
      return block.content.text ? `Text: ${truncate(block.content.text)}` : 'Text';
    case 'statBlock':
      return block.content.label ? `Stat: ${truncate(block.content.label)}` : 'Stat';
    case 'list':
      return block.content.title ? `List: ${truncate(block.content.title)}` : 'List';
    case 'spellList':
      return block.content.title ? `Spells: ${truncate(block.content.title)}` : 'Spell List';
    case 'image':
      return block.content.alt ? `Image: ${truncate(block.content.alt)}` : 'Image';
    case 'abilityScores':
      return 'Ability Scores';
    case 'divider':
      return 'Divider';
  }
}

/** Convenience factory so templates and defaults build spell groups consistently. */
export function makeSpellGroup(
  level: number,
  slotsTotal: number,
  spells: {
    name: string;
    prepared?: boolean;
    expanded?: boolean;
    school?: string;
    castingTime?: string;
    range?: string;
    components?: {v: boolean; s: boolean; m: boolean};
    material?: string;
    duration?: string;
    concentration?: boolean;
    ritual?: boolean;
    attackSave?: string;
    damageEffect?: string;
    source?: string;
    description?: string;
    notes?: string;
  }[] = [],
): SpellLevelGroup {
  return {
    id: uid('sg'),
    level,
    slotsTotal,
    slotsExpended: 0,
    spells: spells.map((s) => ({
      id: uid('sp'),
      prepared: s.prepared ?? true,
      name: s.name,
      expanded: s.expanded ?? false,
      school: s.school,
      castingTime: s.castingTime ?? '1 action',
      range: s.range,
      components: s.components ?? {v: true, s: true, m: false},
      material: s.material,
      duration: s.duration,
      concentration: s.concentration ?? false,
      ritual: s.ritual ?? false,
      attackSave: s.attackSave,
      damageEffect: s.damageEffect,
      source: s.source,
      description: s.description,
      notes: s.notes,
    })),
  };
}

const DEFAULT_ABILITIES = [
  {key: 'str', label: 'STR', score: 10},
  {key: 'dex', label: 'DEX', score: 10},
  {key: 'con', label: 'CON', score: 10},
  {key: 'int', label: 'INT', score: 10},
  {key: 'wis', label: 'WIS', score: 10},
  {key: 'cha', label: 'CHA', score: 10},
];

export function createBlock(type: BlockType, x: number, y: number): Block {
  const id = uid();
  const base = {id, x, y, rotation: 0};

  switch (type) {
    case 'text':
      return {
        ...base,
        type,
        width: 260,
        height: 120,
        style: {fontSize: 15, align: 'left', showBorder: false},
        content: {text: 'Type your notes here. Describe your character, backstory, or anything else.'},
      };
    case 'heading':
      return {
        ...base,
        type,
        width: 360,
        height: 96,
        style: {fontSize: 34, align: 'left'},
        content: {text: 'Character Name', subtitle: 'Level 1 · Race · Class'},
      };
    case 'abilityScores':
      return {
        ...base,
        type,
        width: 480,
        height: 150,
        style: {showBorder: true},
        content: {abilities: DEFAULT_ABILITIES.map((a) => ({...a}))},
      };
    case 'statBlock':
      return {
        ...base,
        type,
        width: 150,
        height: 130,
        style: {showBorder: true, align: 'center'},
        content: {label: 'Armor Class', value: '15', hint: 'AC'},
      };
    case 'image':
      return {
        ...base,
        type,
        width: 220,
        height: 220,
        style: {showBorder: true},
        content: {src: '', alt: 'Portrait', fit: 'cover'},
      };
    case 'divider':
      return {
        ...base,
        type,
        width: 360,
        height: 40,
        content: {ornament: true},
      };
    case 'list':
      return {
        ...base,
        type,
        width: 320,
        height: 220,
        style: {fontSize: 15, showBorder: true},
        content: {
          title: 'Inventory & Gear',
          ordered: false,
          items: ['Backpack', 'Rations (5 days)', 'Torch or lantern', '50 ft. rope', 'Coin pouch'],
        },
      };
    case 'spellList':
      return {
        ...base,
        type,
        width: 500,
        height: 360,
        style: {fontSize: 14, showBorder: true},
        content: {
          title: 'Spells',
          showHeader: true,
          ability: 'INT',
          saveDc: '13',
          attackBonus: '+5',
          columns: ['school', 'castingTime', 'range', 'components', 'duration', 'attackSave', 'damageEffect', 'source'],
          groups: [
            makeSpellGroup(0, 0, [
              {
                name: 'Fire Bolt',
                expanded: true,
                school: 'Evocation',
                castingTime: '1 action',
                range: '120 ft',
                duration: 'Instant',
                attackSave: 'Ranged spell attack',
                damageEffect: '1d10 fire',
                source: 'PHB',
                description: 'Hurl a mote of fire at a creature or object.',
              },
              {
                name: 'Mage Hand',
                school: 'Conjuration',
                castingTime: '1 action',
                range: '30 ft',
                duration: '1 minute',
                components: {v: true, s: true, m: false},
                damageEffect: 'Spectral hand',
                source: 'PHB',
              },
            ]),
            makeSpellGroup(1, 2, [
              {
                name: 'Magic Missile',
                school: 'Evocation',
                castingTime: '1 action',
                range: '120 ft',
                duration: 'Instant',
                damageEffect: '3 darts · 1d4+1 force each',
                source: 'PHB',
                description: 'Darts automatically hit creatures you can see.',
              },
              {
                name: 'Shield',
                school: 'Abjuration',
                castingTime: '1 reaction',
                range: 'Self',
                duration: '1 round',
                components: {v: true, s: true, m: false},
                damageEffect: '+5 AC; no Magic Missile damage',
                source: 'PHB',
              },
            ]),
          ],
        },
      };
  }
}
