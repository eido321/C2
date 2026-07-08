import type {Block, Group} from '@/types';

/**
 * A top-level z-order unit: either a single ungrouped block or a whole group
 * (a contiguous run of blocks that share a groupId).
 */
export interface LayerUnit {
  kind: 'block' | 'group';
  /** groupId for groups, blockId for single blocks. */
  key: string;
  /** Member block ids in z-order (backmost first). */
  ids: string[];
}

/**
 * Splits the blocks array (backmost first) into top-level units. Consecutive
 * blocks sharing a groupId collapse into a single group unit.
 */
export function getUnits(blocks: Block[]): LayerUnit[] {
  const units: LayerUnit[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    const gid = block.groupId ?? null;
    if (gid) {
      const ids: string[] = [];
      while (i < blocks.length && (blocks[i].groupId ?? null) === gid) {
        ids.push(blocks[i].id);
        i += 1;
      }
      units.push({kind: 'group', key: gid, ids});
    } else {
      units.push({kind: 'block', key: block.id, ids: [block.id]});
      i += 1;
    }
  }
  return units;
}

function flattenUnits(units: LayerUnit[], byId: Map<string, Block>): Block[] {
  const next: Block[] = [];
  for (const unit of units) {
    for (const id of unit.ids) {
      const block = byId.get(id);
      if (block) next.push(block);
    }
  }
  return next;
}

function unitIndexForBlock(units: LayerUnit[], blockId: string): number {
  return units.findIndex((u) => u.ids.includes(blockId));
}

type MoveMode = 'forward' | 'backward' | 'front' | 'back';

/**
 * Moves the unit that contains `blockId` in z-order, treating groups as an
 * atomic unit so their children stay contiguous.
 */
export function moveUnit(blocks: Block[], blockId: string, mode: MoveMode): Block[] {
  const units = getUnits(blocks);
  const from = unitIndexForBlock(units, blockId);
  if (from < 0) return blocks;

  let to = from;
  if (mode === 'forward') to = Math.min(units.length - 1, from + 1);
  else if (mode === 'backward') to = Math.max(0, from - 1);
  else if (mode === 'front') to = units.length - 1;
  else if (mode === 'back') to = 0;

  if (to === from) return blocks;

  const reordered = [...units];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  const byId = new Map(blocks.map((b) => [b.id, b]));
  return flattenUnits(reordered, byId);
}

/**
 * Reorders top-level units to match `orderedKeys` (frontmost-first order is the
 * responsibility of the caller — pass backmost-first to match the blocks array).
 */
export function reorderUnits(blocks: Block[], orderedKeys: string[]): Block[] {
  const units = getUnits(blocks);
  const byKey = new Map(units.map((u) => [u.key, u]));
  const seen = new Set<string>();
  const next: LayerUnit[] = [];
  for (const key of orderedKeys) {
    const unit = byKey.get(key);
    if (unit && !seen.has(key)) {
      next.push(unit);
      seen.add(key);
    }
  }
  for (const unit of units) {
    if (!seen.has(unit.key)) next.push(unit);
  }
  const byId = new Map(blocks.map((b) => [b.id, b]));
  return flattenUnits(next, byId);
}

/**
 * Rebuilds the blocks array so every group's children are contiguous, placed at
 * the frontmost position any of their members currently occupy, in childIds order.
 */
export function normalizeOrder(blocks: Block[], groups: Group[]): Block[] {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const placed = new Set<string>();
  const next: Block[] = [];

  for (const block of blocks) {
    if (placed.has(block.id)) continue;
    const gid = block.groupId ?? null;
    const group = gid ? groupById.get(gid) : undefined;
    if (group) {
      for (const id of group.childIds) {
        const child = byId.get(id);
        if (child && !placed.has(id)) {
          next.push(child);
          placed.add(id);
        }
      }
    } else {
      next.push(block);
      placed.add(block.id);
    }
  }
  return next;
}
