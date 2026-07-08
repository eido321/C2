import type {BlockBase, BlockContentMap, BlockType, SpellColumn} from '@/types';

export interface BlockViewProps<T extends BlockType> {
  block: BlockBase<T>;
  editing: boolean;
  update: (content: Partial<BlockContentMap[T]>) => void;
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

/** Human label for a spell level: 0 → "Cantrips", 1 → "1st Level", … */
export function spellLevelLabel(level: number): string {
  if (level <= 0) return 'Cantrips';
  return `${ORDINAL[level - 1] ?? `${level}th`} Level`;
}

export const SPELL_COLUMN_LABELS: Record<SpellColumn, string> = {
  school: 'School',
  castingTime: 'Casting Time',
  range: 'Range',
  components: 'Components',
  duration: 'Duration',
  concentration: 'Concentration',
  ritual: 'Ritual',
  attackSave: 'Attack / Save',
  damageEffect: 'Damage / Effect',
  source: 'Source / Page',
};

/** Compact "V S M" string from a components object; empty when none set. */
export function componentsLabel(c?: {v: boolean; s: boolean; m: boolean}): string {
  if (!c) return '';
  return [c.v && 'V', c.s && 'S', c.m && 'M'].filter(Boolean).join(' ');
}
