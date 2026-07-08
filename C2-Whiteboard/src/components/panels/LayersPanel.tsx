import {useRef, useState} from 'react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Group as GroupIcon,
  Layers as LayersIcon,
  Lock,
  Trash2,
  Unlock,
  Ungroup as UngroupIcon,
} from 'lucide-react';
import type {Block, Group} from '@/types';
import {BLOCK_ICONS, deriveBlockName} from '@/lib/blockDefaults';
import {getUnits, type LayerUnit} from '@/lib/layers';
import {cn} from '@/lib/utils';
import {useWhiteboard} from '@/store/WhiteboardContext';
import type {WhiteboardAction} from '@/store/reducer';

type DragItem = {type: 'unit'; key: string} | {type: 'child'; id: string; groupId: string};

function RowActionButton({
  title,
  onClick,
  danger,
  active,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700',
        active && 'text-accent',
        danger && 'hover:bg-red-50 hover:text-red-600',
      )}
    >
      {children}
    </button>
  );
}

function ZOrderButtons({id, dispatch}: {id: string; dispatch: React.Dispatch<WhiteboardAction>}) {
  return (
    <>
      <RowActionButton title="Bring to front" onClick={() => dispatch({type: 'BRING_TO_FRONT', id})}>
        <ArrowUpToLine size={13} />
      </RowActionButton>
      <RowActionButton title="Bring forward" onClick={() => dispatch({type: 'BRING_FORWARD', id})}>
        <ChevronUp size={13} />
      </RowActionButton>
      <RowActionButton title="Send backward" onClick={() => dispatch({type: 'SEND_BACKWARD', id})}>
        <ChevronDown size={13} />
      </RowActionButton>
      <RowActionButton title="Send to back" onClick={() => dispatch({type: 'SEND_TO_BACK', id})}>
        <ArrowDownToLine size={13} />
      </RowActionButton>
    </>
  );
}

export function LayersPanel() {
  const {state, dispatch} = useWhiteboard();
  const {board, selectedIds} = state;
  const selected = new Set(selectedIds);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragItem = useRef<DragItem | null>(null);
  const lastClicked = useRef<string | null>(null);

  const blockById = new Map(board.blocks.map((b) => [b.id, b]));
  const groupById = new Map(board.groups.map((g) => [g.id, g]));

  const units = getUnits(board.blocks);
  const displayUnits = [...units].reverse();

  // Flat list of block ids in visual order (frontmost first) for shift-range selection.
  const visualBlockOrder: string[] = [];
  for (const unit of displayUnits) {
    const ids = [...unit.ids].reverse();
    if (unit.kind === 'group') {
      const group = groupById.get(unit.key);
      if (group && group.collapsed) continue;
    }
    visualBlockOrder.push(...ids);
  }

  const canGroup = selectedIds.filter((id) => blockById.has(id)).length >= 2;
  const groupsInSelection = board.groups.filter(
    (g) => g.childIds.length > 0 && g.childIds.every((id) => selected.has(id)),
  );

  const beginRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };

  const commitRename = (id: string, isGroup: boolean) => {
    const value = renameValue.trim();
    if (isGroup) {
      dispatch({type: 'RENAME_GROUP', groupId: id, name: value || 'Group'});
    } else {
      dispatch({type: 'UPDATE_BLOCK', id, patch: {name: value || undefined}});
    }
    setRenamingId(null);
  };

  const selectBlockRow = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClicked.current) {
      const a = visualBlockOrder.indexOf(lastClicked.current);
      const b = visualBlockOrder.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [start, end] = a < b ? [a, b] : [b, a];
        dispatch({type: 'SELECT_MANY', ids: visualBlockOrder.slice(start, end + 1)});
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      dispatch({type: 'TOGGLE_SELECT', id});
      lastClicked.current = id;
      return;
    }
    dispatch({type: 'SELECT', id});
    lastClicked.current = id;
  };

  const selectGroupRow = (group: Group, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedIds);
      const allSelected = group.childIds.every((id) => next.has(id));
      for (const id of group.childIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      dispatch({type: 'SELECT_MANY', ids: [...next]});
      return;
    }
    dispatch({type: 'SELECT_MANY', ids: group.childIds});
  };

  const reorderTopLevel = (draggedKey: string, targetKey: string) => {
    if (draggedKey === targetKey) return;
    const keys = displayUnits.map((u) => u.key).filter((k) => k !== draggedKey);
    const ti = keys.indexOf(targetKey);
    if (ti < 0) return;
    keys.splice(ti, 0, draggedKey);
    dispatch({type: 'REORDER_UNITS', orderedKeys: [...keys].reverse()});
  };

  const reorderChild = (groupId: string, draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const group = groupById.get(groupId);
    if (!group) return;
    const display = [...group.childIds].reverse().filter((id) => id !== draggedId);
    const ti = display.indexOf(targetId);
    if (ti < 0) return;
    display.splice(ti, 0, draggedId);
    dispatch({type: 'REORDER_GROUP_CHILDREN', groupId, orderedChildIds: [...display].reverse()});
  };

  const onDrop = (target: DragItem) => {
    const item = dragItem.current;
    dragItem.current = null;
    setDragOverKey(null);
    if (!item) return;
    if (item.type === 'unit' && target.type === 'unit') {
      reorderTopLevel(item.key, target.key);
    } else if (item.type === 'child' && target.type === 'child' && item.groupId === target.groupId) {
      reorderChild(item.groupId, item.id, target.id);
    }
  };

  const renderBlockRow = (block: Block, depth: number, dragKey: DragItem, dropKey: DragItem, dragKeyId: string) => {
    const isSelected = selected.has(block.id);
    const Icon = BLOCK_ICONS[block.type];
    const hidden = block.hidden ?? false;
    const locked = block.locked ?? false;
    const renaming = renamingId === block.id;
    return (
      <div
        key={block.id}
        draggable={!renaming}
        onDragStart={() => (dragItem.current = dragKey)}
        onDragEnd={() => {
          dragItem.current = null;
          setDragOverKey(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverKey(dragKeyId);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(dropKey);
        }}
        onClick={(e) => selectBlockRow(block.id, e)}
        className={cn(
          'group/row flex items-center gap-1.5 rounded-lg py-1 pr-1.5 transition-colors',
          isSelected ? 'bg-accent/10 ring-1 ring-inset ring-accent/40' : 'hover:bg-slate-100',
          dragOverKey === dragKeyId && 'ring-2 ring-inset ring-accent/60',
          hidden && 'opacity-50',
        )}
        style={{paddingLeft: depth * 16 + 6}}
      >
        <span className={cn('shrink-0', isSelected ? 'text-accent' : 'text-slate-400')}>
          <Icon size={14} />
        </span>
        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => commitRename(block.id, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename(block.id, false);
              if (e.key === 'Escape') setRenamingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded border border-accent/50 bg-white px-1 py-0.5 text-xs outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              beginRename(block.id, block.name ?? '');
            }}
            className={cn(
              'min-w-0 flex-1 truncate text-xs',
              isSelected ? 'font-semibold text-slate-800' : 'text-slate-600',
            )}
            title={deriveBlockName(block)}
          >
            {deriveBlockName(block)}
          </span>
        )}
        <div className="hidden shrink-0 items-center group-hover/row:flex">
          <ZOrderButtons id={block.id} dispatch={dispatch} />
        </div>
        <RowActionButton
          title={locked ? 'Unlock' : 'Lock'}
          active={locked}
          onClick={() => dispatch({type: 'UPDATE_BLOCK', id: block.id, patch: {locked: !locked}})}
        >
          {locked ? <Lock size={13} /> : <Unlock size={13} className="opacity-0 group-hover/row:opacity-100" />}
        </RowActionButton>
        <RowActionButton
          title={hidden ? 'Show' : 'Hide'}
          active={hidden}
          onClick={() => dispatch({type: 'UPDATE_BLOCK', id: block.id, patch: {hidden: !hidden}})}
        >
          {hidden ? <EyeOff size={13} /> : <Eye size={13} className="opacity-0 group-hover/row:opacity-100" />}
        </RowActionButton>
        <div className="hidden shrink-0 group-hover/row:block">
          <RowActionButton title="Delete" danger onClick={() => dispatch({type: 'DELETE_BLOCK', id: block.id})}>
            <Trash2 size={13} />
          </RowActionButton>
        </div>
      </div>
    );
  };

  const renderGroupRow = (unit: LayerUnit) => {
    const group = groupById.get(unit.key);
    if (!group) return null;
    const childBlocks = group.childIds.map((id) => blockById.get(id)).filter((b): b is Block => Boolean(b));
    const allSelected = childBlocks.length > 0 && childBlocks.every((b) => selected.has(b.id));
    const anyHidden = childBlocks.some((b) => b.hidden);
    const anyLocked = childBlocks.some((b) => b.locked);
    const renaming = renamingId === group.id;
    const dragKeyId = `unit:${group.id}`;

    return (
      <div key={group.id}>
        <div
          draggable={!renaming}
          onDragStart={() => (dragItem.current = {type: 'unit', key: group.id})}
          onDragEnd={() => {
            dragItem.current = null;
            setDragOverKey(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverKey(dragKeyId);
          }}
          onDrop={(e) => {
            e.preventDefault();
            onDrop({type: 'unit', key: group.id});
          }}
          onClick={(e) => selectGroupRow(group, e)}
          className={cn(
            'group/row flex items-center gap-1 rounded-lg py-1 pl-1.5 pr-1.5 transition-colors',
            allSelected ? 'bg-accent/10 ring-1 ring-inset ring-accent/40' : 'hover:bg-slate-100',
            dragOverKey === dragKeyId && 'ring-2 ring-inset ring-accent/60',
          )}
        >
          <button
            title={group.collapsed ? 'Expand' : 'Collapse'}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({type: 'TOGGLE_GROUP_COLLAPSED', groupId: group.id});
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-700"
          >
            {group.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <span className={cn('shrink-0', allSelected ? 'text-accent' : 'text-slate-500')}>
            {group.collapsed ? <Folder size={14} /> : <FolderOpen size={14} />}
          </span>
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(group.id, true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(group.id, true);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded border border-accent/50 bg-white px-1 py-0.5 text-xs outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                beginRename(group.id, group.name);
              }}
              className={cn(
                'min-w-0 flex-1 truncate text-xs font-semibold',
                allSelected ? 'text-slate-800' : 'text-slate-700',
              )}
              title={group.name}
            >
              {group.name}
              <span className="ml-1 font-normal text-slate-400">({childBlocks.length})</span>
            </span>
          )}
          <div className="hidden shrink-0 items-center group-hover/row:flex">
            <ZOrderButtons id={group.childIds[0]} dispatch={dispatch} />
          </div>
          <RowActionButton
            title={anyLocked ? 'Unlock group' : 'Lock group'}
            active={anyLocked}
            onClick={() => dispatch({type: 'UPDATE_BLOCKS', ids: group.childIds, patch: {locked: !anyLocked}})}
          >
            {anyLocked ? <Lock size={13} /> : <Unlock size={13} className="opacity-0 group-hover/row:opacity-100" />}
          </RowActionButton>
          <RowActionButton
            title={anyHidden ? 'Show group' : 'Hide group'}
            active={anyHidden}
            onClick={() => dispatch({type: 'UPDATE_BLOCKS', ids: group.childIds, patch: {hidden: !anyHidden}})}
          >
            {anyHidden ? <EyeOff size={13} /> : <Eye size={13} className="opacity-0 group-hover/row:opacity-100" />}
          </RowActionButton>
          <div className="hidden shrink-0 group-hover/row:block">
            <RowActionButton title="Ungroup" onClick={() => dispatch({type: 'UNGROUP', groupId: group.id})}>
              <UngroupIcon size={13} />
            </RowActionButton>
          </div>
        </div>
        {!group.collapsed
          ? [...childBlocks].reverse().map((child) =>
              renderBlockRow(
                child,
                1,
                {type: 'child', id: child.id, groupId: group.id},
                {type: 'child', id: child.id, groupId: group.id},
                `child:${child.id}`,
              ),
            )
          : null}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <div className="flex items-center gap-1.5 text-slate-400">
          <LayersIcon size={13} />
          <span className="text-[11px] font-bold uppercase tracking-wide">{board.blocks.length} layers</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="icon-btn h-7 w-7 disabled:opacity-30"
            title="Group selection"
            disabled={!canGroup}
            onClick={() => dispatch({type: 'GROUP_BLOCKS', ids: selectedIds.filter((id) => blockById.has(id))})}
          >
            <GroupIcon size={15} />
          </button>
          <button
            className="icon-btn h-7 w-7 disabled:opacity-30"
            title="Ungroup selection"
            disabled={groupsInSelection.length === 0}
            onClick={() => groupsInSelection.forEach((g) => dispatch({type: 'UNGROUP', groupId: g.id}))}
          >
            <UngroupIcon size={15} />
          </button>
        </div>
      </div>

      {board.blocks.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-400">
          No layers yet. Add blocks from the palette above.
        </p>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-auto px-2 pb-2">
          {displayUnits.map((unit) => {
            if (unit.kind === 'group') return renderGroupRow(unit);
            const block = blockById.get(unit.key);
            if (!block) return null;
            const dragKeyId = `unit:${block.id}`;
            return renderBlockRow(
              block,
              0,
              {type: 'unit', key: block.id},
              {type: 'unit', key: block.id},
              dragKeyId,
            );
          })}
        </div>
      )}
    </div>
  );
}
