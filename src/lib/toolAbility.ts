import type { Ability } from '@/types';

function normalizeToolName(name: string): string {
  return name
    .trim()
    .replaceAll('’', "'")
    .replaceAll('“', '"')
    .replaceAll('”', '"')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const TOOL_ABILITY_BY_NAME: Record<string, Ability> = {
  // PHB 2024 chapter 6 — Tools (pages 413–416 in `docs/rules-from-pdf.json`)
  "alchemist's supplies": 'int',
  "brewer's supplies": 'int',
  "calligrapher's supplies": 'dex',
  "carpenter's tools": 'str',
  "cartographer's tools": 'wis',
  "cobbler's tools": 'dex',
  "cook's utensils": 'wis',
  "glassblower's tools": 'int',
  "jeweler's tools": 'int',
  "leatherworker's tools": 'dex',
  "mason's tools": 'str',
  "painter's supplies": 'wis',
  "potter's tools": 'int',
  "smith's tools": 'str',
  "tinker's tools": 'dex',
  "weaver's tools": 'dex',
  "woodcarver's tools": 'dex',
  'disguise kit': 'cha',
  'forgery kit': 'dex',
  'herbalism kit': 'int',
  "navigator's tools": 'wis',
  "poisoner's kit": 'int',
  "thieves' tools": 'dex',
};

export function getToolAbility(toolName: string): Ability | null {
  const n = normalizeToolName(toolName);

  // These are stored as variants in the sheet picker, but share one PHB ability entry.
  if (n.startsWith('gaming set (')) return 'wis';
  if (n.startsWith('musical instrument (')) return 'cha';

  return TOOL_ABILITY_BY_NAME[n] ?? null;
}

export function formatAbilityShort(a: Ability): string {
  return a.toUpperCase();
}

export function formatToolAbilityTag(toolName: string): string | null {
  const a = getToolAbility(toolName);
  return a ? formatAbilityShort(a) : null;
}

