import type {Block, Group, Whiteboard} from '@/types';
import {WHITEBOARD_SCHEMA_VERSION} from '@/types';
import {normalizeOrder} from './layers';

/**
 * Brings a (possibly older / partial) whiteboard up to the current schema:
 * ensures a groups array exists, prunes dangling group references, keeps group
 * children contiguous, and stamps the schema version. Missing block fields
 * (name/hidden/locked/groupId) are optional and simply default to undefined.
 */
export function normalizeBoard(input: Whiteboard): Whiteboard {
  const blocks: Block[] = Array.isArray(input.blocks) ? input.blocks : [];
  const rawGroups: Group[] = Array.isArray(input.groups) ? input.groups : [];

  const blockIds = new Set(blocks.map((b) => b.id));

  const groups: Group[] = rawGroups
    .filter((g): g is Group => Boolean(g) && typeof g.id === 'string')
    .map((g) => ({
      id: g.id,
      name: typeof g.name === 'string' ? g.name : 'Group',
      collapsed: Boolean(g.collapsed),
      childIds: (Array.isArray(g.childIds) ? g.childIds : []).filter((id) => blockIds.has(id)),
    }))
    .filter((g) => g.childIds.length > 0);

  const validGroupIds = new Set(groups.map((g) => g.id));

  const cleanedBlocks: Block[] = blocks.map((b) =>
    b.groupId && !validGroupIds.has(b.groupId) ? {...b, groupId: null} : b,
  );

  return {
    id: typeof input.id === 'string' ? input.id : `wb_${Date.now()}`,
    name: typeof input.name === 'string' ? input.name : 'Untitled Whiteboard',
    blocks: normalizeOrder(cleanedBlocks, groups),
    groups,
    viewport: input.viewport ?? {pan: {x: 0, y: 0}, zoom: 1},
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : Date.now(),
    version: WHITEBOARD_SCHEMA_VERSION,
  };
}
