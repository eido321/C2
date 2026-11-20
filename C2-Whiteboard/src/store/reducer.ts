import type {Block, BlockStyle, Group, Viewport, Whiteboard} from '@/types';
import {uid} from '@/lib/utils';
import {getUnits, moveUnit, normalizeOrder, reorderUnits} from '@/lib/layers';

export interface WhiteboardState {
  board: Whiteboard;
  selectedIds: string[];
}

export type WhiteboardAction =
  | {type: 'LOAD_BOARD'; board: Whiteboard}
  | {type: 'PASTE'; blocks: Block[]; groups: Group[]}
  | {type: 'MOVE'; ids: string[]; dx: number; dy: number}
  | {type: 'DRAG'; id: string; x: number; y: number}
  | {type: 'RENAME'; name: string}
  | {type: 'ADD_BLOCK'; block: Block; select?: boolean}
  | {type: 'UPDATE_BLOCK'; id: string; patch: Partial<Omit<Block, 'content' | 'style' | 'type'>>}
  | {type: 'UPDATE_BLOCKS'; ids: string[]; patch: Partial<Omit<Block, 'content' | 'style' | 'type'>>}
  | {type: 'UPDATE_CONTENT'; id: string; content: Record<string, unknown>}
  | {type: 'UPDATE_STYLE'; id: string; style: Partial<BlockStyle>}
  | {type: 'DELETE_BLOCK'; id: string}
  | {type: 'DELETE_BLOCKS'; ids: string[]}
  | {type: 'DUPLICATE_BLOCK'; id: string}
  | {type: 'BRING_FORWARD'; id: string}
  | {type: 'SEND_BACKWARD'; id: string}
  | {type: 'BRING_TO_FRONT'; id: string}
  | {type: 'SEND_TO_BACK'; id: string}
  | {type: 'REORDER_UNITS'; orderedKeys: string[]}
  | {type: 'REORDER_GROUP_CHILDREN'; groupId: string; orderedChildIds: string[]}
  | {type: 'GROUP_BLOCKS'; ids: string[]}
  | {type: 'UNGROUP'; groupId: string}
  | {type: 'RENAME_GROUP'; groupId: string; name: string}
  | {type: 'TOGGLE_GROUP_COLLAPSED'; groupId: string}
  | {type: 'SELECT'; id: string | null}
  | {type: 'SELECT_MANY'; ids: string[]}
  | {type: 'TOGGLE_SELECT'; id: string}
  | {type: 'SET_VIEWPORT'; viewport: Viewport};

function touch(board: Whiteboard, patch: Partial<Whiteboard>): Whiteboard {
  return {...board, ...patch, updatedAt: Date.now()};
}

function pruneGroups(groups: Group[], removedIds: Set<string>): Group[] {
  return groups
    .map((g) => ({...g, childIds: g.childIds.filter((id) => !removedIds.has(id))}))
    .filter((g) => g.childIds.length > 0);
}

export function whiteboardReducer(state: WhiteboardState, action: WhiteboardAction): WhiteboardState {
  const {board} = state;

  switch (action.type) {
    case 'LOAD_BOARD':
      return {board: action.board, selectedIds: []};

    case 'PASTE': {
      const ids = new Map(action.blocks.map(b => [b.id, uid()]));
      const groups = action.groups.map(g => ({...g, id: uid('g'), childIds: g.childIds.flatMap(id => ids.has(id) ? [ids.get(id)!] : [])})).filter(g => g.childIds.length);
      const groupFor = new Map(groups.flatMap(g => g.childIds.map(id => [id, g.id] as const)));
      const blocks = action.blocks.map(b => {
        const id = ids.get(b.id)!;
        return {...b, id, groupId: groupFor.get(id) ?? null, x:b.x+24, y:b.y+24};
      });
      return {board:touch(board,{blocks:[...board.blocks,...blocks],groups:[...board.groups,...groups]}), selectedIds:blocks.map(b=>b.id)};
    }
    case 'DRAG':
    case 'MOVE': {
      const anchor = action.type === 'DRAG' ? board.blocks.find(b => b.id === action.id) : undefined;
      const dx = action.type === 'MOVE' ? action.dx : action.x - (anchor?.x ?? action.x);
      const dy = action.type === 'MOVE' ? action.dy : action.y - (anchor?.y ?? action.y);
      const ids = new Set(action.type === 'MOVE' ? action.ids : state.selectedIds);
      return {...state, board:touch(board,{blocks:board.blocks.map(b => ids.has(b.id) && !b.locked && !b.hidden ? {...b,x:b.x+dx,y:b.y+dy} : b)})};
    }
    case 'RENAME':
      return {...state, board: touch(board, {name: action.name})};

    case 'ADD_BLOCK':
      return {
        board: touch(board, {blocks: [...board.blocks, action.block]}),
        selectedIds: action.select === false ? state.selectedIds : [action.block.id],
      };

    case 'UPDATE_BLOCK':
      return {
        ...state,
        board: touch(board, {
          blocks: board.blocks.map((b) => (b.id === action.id ? ({...b, ...action.patch} as Block) : b)),
        }),
      };

    case 'UPDATE_BLOCKS': {
      const ids = new Set(action.ids);
      return {
        ...state,
        board: touch(board, {
          blocks: board.blocks.map((b) => (ids.has(b.id) ? ({...b, ...action.patch} as Block) : b)),
        }),
      };
    }

    case 'UPDATE_CONTENT':
      return {
        ...state,
        board: touch(board, {
          blocks: board.blocks.map((b) =>
            b.id === action.id ? ({...b, content: {...b.content, ...action.content}} as Block) : b,
          ),
        }),
      };

    case 'UPDATE_STYLE':
      return {
        ...state,
        board: touch(board, {
          blocks: board.blocks.map((b) =>
            b.id === action.id ? ({...b, style: {...b.style, ...action.style}} as Block) : b,
          ),
        }),
      };

    case 'DELETE_BLOCK':
    case 'DELETE_BLOCKS': {
      const removed = new Set(action.type === 'DELETE_BLOCK' ? [action.id] : action.ids);
      return {
        board: touch(board, {
          blocks: board.blocks.filter((b) => !removed.has(b.id)),
          groups: pruneGroups(board.groups, removed),
        }),
        selectedIds: state.selectedIds.filter((id) => !removed.has(id)),
      };
    }

    case 'DUPLICATE_BLOCK': {
      const source = board.blocks.find((b) => b.id === action.id);
      if (!source) return state;
      const copy = {
        ...structuredClone(source),
        id: uid(),
        x: source.x + 24,
        y: source.y + 24,
        groupId: null,
      } as Block;
      return {board: touch(board, {blocks: [...board.blocks, copy]}), selectedIds: [copy.id]};
    }

    case 'BRING_FORWARD':
      return {...state, board: touch(board, {blocks: moveUnit(board.blocks, action.id, 'forward')})};

    case 'SEND_BACKWARD':
      return {...state, board: touch(board, {blocks: moveUnit(board.blocks, action.id, 'backward')})};

    case 'BRING_TO_FRONT':
      return {...state, board: touch(board, {blocks: moveUnit(board.blocks, action.id, 'front')})};

    case 'SEND_TO_BACK':
      return {...state, board: touch(board, {blocks: moveUnit(board.blocks, action.id, 'back')})};

    case 'REORDER_UNITS':
      return {...state, board: touch(board, {blocks: reorderUnits(board.blocks, action.orderedKeys)})};

    case 'REORDER_GROUP_CHILDREN': {
      const group = board.groups.find((g) => g.id === action.groupId);
      if (!group) return state;
      const valid = new Set(group.childIds);
      const nextChildIds = action.orderedChildIds.filter((id) => valid.has(id));
      for (const id of group.childIds) {
        if (!nextChildIds.includes(id)) nextChildIds.push(id);
      }
      const nextGroups = board.groups.map((g) =>
        g.id === action.groupId ? {...g, childIds: nextChildIds} : g,
      );
      return {...state, board: touch(board, {blocks: normalizeOrder(board.blocks, nextGroups), groups: nextGroups})};
    }

    case 'GROUP_BLOCKS': {
      const memberIds = new Set(action.ids);
      if (memberIds.size < 2) return state;

      const groupId = uid('g');
      // childIds ordered backmost-first to match blocks array convention.
      const childIds = board.blocks.filter((b) => memberIds.has(b.id)).map((b) => b.id);
      if (childIds.length < 2) return state;

      const cleanedGroups = pruneGroups(board.groups, memberIds);
      const nextGroup: Group = {id: groupId, name: `Group ${cleanedGroups.length + 1}`, childIds};
      const nextGroups = [...cleanedGroups, nextGroup];

      const taggedBlocks = board.blocks.map((b) =>
        memberIds.has(b.id) ? ({...b, groupId} as Block) : b,
      );

      return {
        board: touch(board, {blocks: normalizeOrder(taggedBlocks, nextGroups), groups: nextGroups}),
        selectedIds: childIds,
      };
    }

    case 'UNGROUP': {
      const group = board.groups.find((g) => g.id === action.groupId);
      if (!group) return state;
      const childSet = new Set(group.childIds);
      return {
        board: touch(board, {
          blocks: board.blocks.map((b) => (childSet.has(b.id) ? ({...b, groupId: null} as Block) : b)),
          groups: board.groups.filter((g) => g.id !== action.groupId),
        }),
        selectedIds: group.childIds,
      };
    }

    case 'RENAME_GROUP':
      return {
        ...state,
        board: touch(board, {
          groups: board.groups.map((g) => (g.id === action.groupId ? {...g, name: action.name} : g)),
        }),
      };

    case 'TOGGLE_GROUP_COLLAPSED':
      return {
        ...state,
        board: {
          ...board,
          groups: board.groups.map((g) =>
            g.id === action.groupId ? {...g, collapsed: !g.collapsed} : g,
          ),
        },
      };

    case 'SELECT':
      return {...state, selectedIds: action.id ? [action.id] : []};

    case 'SELECT_MANY':
      return {...state, selectedIds: action.ids};

    case 'TOGGLE_SELECT': {
      const has = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: has
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };
    }

    case 'SET_VIEWPORT':
      return {...state, board: {...board, viewport: action.viewport}};

    default:
      return state;
  }
}

export {getUnits};

