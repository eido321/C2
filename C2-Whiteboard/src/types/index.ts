export type BlockType =
  | 'text'
  | 'heading'
  | 'spellSlots'
  | 'abilityScore'
  | 'abilityScores'
  | 'statBlock'
  | 'image'
  | 'divider'
  | 'list'
  | 'spellList';

export type TextAlign = 'left' | 'center' | 'right';

export interface BlockStyle {
  fontSize?: number;
  align?: TextAlign;
  color?: string;
  background?: string;
  borderColor?: string;
  showBorder?: boolean;
}

export interface AbilityScore {
  key: string;
  label: string;
  score: number;
}

export interface TextContent {
  text: string;
}

export interface HeadingContent {
  text: string;
  subtitle?: string;
}

export interface AbilityScoresContent {
  abilities: AbilityScore[];
}

export interface StatBlockContent {
  label: string;
  value: string;
  hint?: string;
}

export interface ImageContent {
  src: string;
  alt?: string;
  fit: 'cover' | 'contain';
}

export interface DividerContent {
  ornament: boolean;
}

export interface ListItemDetails {
  text: string;
  checked?: boolean;
  indent?: number;
}

export type ListItem = string | ListItemDetails;

export interface ListContent {
  title?: string;
  items: ListItem[];
  ordered: boolean;
  checklist?: boolean;
}

/** Verbal / Somatic / Material spell components. */
export interface SpellComponents {
  v: boolean;
  s: boolean;
  m: boolean;
}

/** Optional per-spell meta columns, toggleable on the block. */
export type SpellColumn =
  | 'school'
  | 'castingTime'
  | 'range'
  | 'components'
  | 'duration'
  | 'concentration'
  | 'ritual'
  | 'attackSave'
  | 'damageEffect'
  | 'source';

export interface SpellEntry {
  id: string;
  prepared: boolean;
  name: string;
  expanded?: boolean;
  school?: string;
  castingTime?: string;
  range?: string;
  components?: SpellComponents;
  material?: string;
  duration?: string;
  concentration?: boolean;
  ritual?: boolean;
  attackSave?: string;
  damageEffect?: string;
  source?: string;
  description?: string;
  notes?: string;
}

/** One spell-level section: cantrips (level 0) or levels 1–9. */
export interface SpellLevelGroup {
  id: string;
  /** 0 = cantrips, 1–9 = spell levels. */
  level: number;
  /** Total slots for the level; ignored for cantrips (level 0). */
  slotsTotal: number;
  /** Slots already expended for the level. */
  slotsExpended: number;
  spells: SpellEntry[];
}

export interface SpellListContent {
  title?: string;
  /** Spellcasting summary header, shown when `showHeader` is true. */
  showHeader: boolean;
  ability?: string;
  saveDc?: string;
  attackBonus?: string;
  /** Which optional per-spell columns are visible. */
  columns: SpellColumn[];
  groups: SpellLevelGroup[];
}

export type BlockContentMap = {
  text: TextContent;
  heading: HeadingContent;
  spellSlots: {rows:import('../lib/slotRows').SlotRow[]};
  abilityScore: {ability:string; modifier:string; saveDc:string; attackBonus:string};
  abilityScores: AbilityScoresContent;
  statBlock: StatBlockContent;
  image: ImageContent;
  divider: DividerContent;
  list: ListContent;
  spellList: SpellListContent;
};

export interface BlockBase<T extends BlockType = BlockType> {
  id: string;
  type: T;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: BlockStyle;
  content: BlockContentMap[T];
  /** Optional custom layer name; falls back to a derived label when empty. */
  name?: string;
  /** When true the block is not rendered on the canvas. */
  hidden?: boolean;
  /** When true the block cannot be moved/resized/selected on the canvas. */
  locked?: boolean;
  /** Id of the group this block belongs to, if any. */
  groupId?: string | null;
}

export type Block = {
  [K in BlockType]: BlockBase<K>;
}[BlockType];

export interface Group {
  id: string;
  name: string;
  /** Child block ids in z-order (backmost first, matching the blocks array). */
  childIds: string[];
  collapsed?: boolean;
}

export interface Viewport {
  pan: {x: number; y: number};
  zoom: number;
}

export const WHITEBOARD_SCHEMA_VERSION = 2;

export interface Whiteboard {
  id: string;
  name: string;
  blocks: Block[];
  groups: Group[];
  viewport: Viewport;
  updatedAt: number;
  version?: number;
}

export interface WhiteboardTemplate {
  id: string;
  name: string;
  description: string;
  accent: string;
  build: () => Block[];
}




