import {slotCapacity,setSlotTotal} from '@/lib/slotRows';
import {castingFields} from '@/lib/castingFields';
import {useRef, useState} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Copy,
  CheckSquare,
  GripVertical,
  Group as GroupIcon,
  List as ListIcon,
  ListOrdered,
  MousePointerClick,
  PanelRightClose,
  Plus,
  SendToBack,
  BringToFront,
  Trash2,
  X,
} from 'lucide-react';
import type {Block, ListContent, ListItem, TextAlign} from '@/types';
import {BLOCK_LABELS} from '@/lib/blockDefaults';
import {
  listItemChecked,
  listItemText,
  makeListItem,
  withListItemChecked,
  withListItemText,
} from '@/lib/listContent';
import {cn} from '@/lib/utils';
import {useWhiteboard} from '@/store/WhiteboardContext';
import type {WhiteboardAction} from '@/store/reducer';
import {SpellListEditor} from './SpellListEditor';

function CollapseButton({onCollapse}: {onCollapse?: () => void}) {
  if (!onCollapse) return null;
  return (
    <button className="icon-btn" title="Collapse panel" onClick={onCollapse}>
      <PanelRightClose size={16} />
    </button>
  );
}

function NumberField({label, value, onChange}: {label: string; value: number; onChange: (v: number) => void}) {
  return (
    <label className="flex-1">
      <span className="field-label">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="field-input"
      />
    </label>
  );
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="border-b border-slate-100 px-4 py-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const ALIGNS: {value: TextAlign; icon: typeof AlignLeft}[] = [
  {value: 'left', icon: AlignLeft},
  {value: 'center', icon: AlignCenter},
  {value: 'right', icon: AlignRight},
];

type ListMode = 'bullets' | 'numbered' | 'checklist';

function ListEditor({content, set}: {content: ListContent; set: (patch: Partial<ListContent>) => void}) {
  const items = content.items.length ? content.items : [makeListItem('', content.checklist)];
  const dragged = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const setItems = (next: ListItem[]) => set({items: next});
  const patchItemText = (index: number, text: string) =>
    setItems(items.map((item, i) => (i === index ? withListItemText(item, text) : item)));
  const patchItemChecked = (index: number, checked: boolean) =>
    setItems(items.map((item, i) => (i === index ? withListItemChecked(item, checked) : item)));
  const addItem = () => setItems([...items, makeListItem('', content.checklist)]);
  const removeItem = (index: number) =>
    setItems(items.length === 1 ? [makeListItem('', content.checklist)] : items.filter((_, i) => i !== index));
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const reorderItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  const mode: ListMode = content.checklist ? 'checklist' : content.ordered ? 'numbered' : 'bullets';
  const setMode = (nextMode: ListMode) => {
    set({
      ordered: nextMode === 'numbered',
      checklist: nextMode === 'checklist',
    });
  };

  const modes: {value: ListMode; label: string; icon: typeof ListIcon}[] = [
    {value: 'bullets', label: 'Bullets', icon: ListIcon},
    {value: 'numbered', label: 'Numbers', icon: ListOrdered},
    {value: 'checklist', label: 'Checks', icon: CheckSquare},
  ];

  return (
    <>
      <label>
        <span className="field-label">Title</span>
        <input
          value={content.title ?? ''}
          onChange={(e) => set({title: e.target.value})}
          placeholder="Inventory, Features, Notes..."
          className="field-input"
        />
      </label>

      <div>
        <span className="field-label">List style</span>
        <div className="grid grid-cols-3 gap-1">
          {modes.map(({value, label, icon: Icon}) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                mode === value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="field-label mb-0">Items</span>
          <button type="button" onClick={addItem} className="panel-btn px-2 py-1 text-xs">
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged.current !== null) reorderItem(dragged.current, index);
                dragged.current = null;
                setDropIndex(null);
              }}
              className={cn(
                'rounded-lg border border-slate-200 bg-slate-50 p-2 transition-shadow',
                dropIndex === index && 'ring-2 ring-inset ring-accent/50',
              )}
            >
              <div className="flex items-start gap-1.5">
                <span
                  draggable
                  onDragStart={() => {
                    dragged.current = index;
                  }}
                  onDragEnd={() => {
                    dragged.current = null;
                    setDropIndex(null);
                  }}
                  title="Drag to reorder"
                  className="mt-2 shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                >
                  <GripVertical size={15} />
                </span>
                {content.checklist ? (
                  <input
                    type="checkbox"
                    checked={listItemChecked(item)}
                    onChange={(e) => patchItemChecked(index, e.target.checked)}
                    className="mt-2 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    title="Checked"
                  />
                ) : (
                  <span className="mt-2 min-w-5 shrink-0 text-right text-xs font-semibold text-slate-400">
                    {content.ordered ? `${index + 1}.` : '•'}
                  </span>
                )}
                <textarea
                  value={listItemText(item)}
                  onChange={(e) => patchItemText(index, e.target.value)}
                  rows={2}
                  placeholder="List item"
                  className="min-w-0 flex-1 resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-accent/60"
                />
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 disabled:opacity-30"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ChevronUpIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 disabled:opacity-30"
                    title="Move down"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ChevronDownIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-7 w-7 hover:bg-red-50 hover:text-red-600"
                    title="Remove item"
                    onClick={() => removeItem(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          On the canvas: Enter adds an item, Shift+Enter adds a line break, Backspace removes an empty item, and Tab indents.
        </p>
      </div>
    </>
  );
}

function ContentEditor({block, dispatch}: {block: Block; dispatch: React.Dispatch<WhiteboardAction>}) {
  const setContent = (content: Record<string, unknown>) => dispatch({type: 'UPDATE_CONTENT', id: block.id, content});

  switch (block.type) {
    case 'text':
      return (
        <label>
          <span className="field-label">Text</span>
          <textarea
            aria-label="Text" value={block.content.text}
            onChange={(e) => setContent({text: e.target.value})}
            rows={5}
            className="field-input resize-none"
          />
        </label>
      );
    case 'heading':
      return (
        <>
          <label>
            <span className="field-label">Title</span>
            <input value={block.content.text} onChange={(e) => setContent({text: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Subtitle</span>
            <input
              value={block.content.subtitle ?? ''}
              onChange={(e) => setContent({subtitle: e.target.value})}
              className="field-input"
            />
          </label>
        </>
      );
    case 'spellSlots': return <div className="grid grid-cols-3 gap-2">{block.content.rows.map((r,i)=><label key={i}>
      <span className="field-label">Level {i+1} total</span><input className="field-input" type="number" min={0} max={slotCapacity[i]} value={r.total||''}
        onChange={e=>setContent({rows:block.content.rows.map((row,k)=>k===i?setSlotTotal(row,i,Number(e.target.value)):row)})}/>
    </label>)}</div>;
    case 'abilityScore': return <>{castingFields.map(([key,label])=><label key={key}><span className='field-label'>{label}</span><input className='field-input' value={block.content[key]} onChange={e=>setContent({[key]:e.target.value})}/></label>)}</>;
    case 'abilityScores':
      return (
        <div className="grid grid-cols-3 gap-2">
          {block.content.abilities.map((a, i) => (
            <label key={a.key}>
              <span className="field-label">{a.label}</span>
              <input
                type="number"
                value={a.score}
                onChange={(e) =>
                  setContent({
                    abilities: block.content.abilities.map((x, j) =>
                      j === i ? {...x, score: Number(e.target.value) || 0} : x,
                    ),
                  })
                }
                className="field-input"
              />
            </label>
          ))}
        </div>
      );
    case 'statBlock':
      return (
        <>
          <label>
            <span className="field-label">Label</span>
            <input value={block.content.label} onChange={(e) => setContent({label: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Value</span>
            <input value={block.content.value} onChange={(e) => setContent({value: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Hint</span>
            <input
              value={block.content.hint ?? ''}
              onChange={(e) => setContent({hint: e.target.value})}
              className="field-input"
            />
          </label>
        </>
      );
    case 'image':
      return (
        <>
          <label>
            <span className="field-label">Image URL</span>
            <input value={block.content.src} onChange={(e) => setContent({src: e.target.value})} className="field-input" />
          </label>
          <label>
            <span className="field-label">Alt text</span>
            <input
              value={block.content.alt ?? ''}
              onChange={(e) => setContent({alt: e.target.value})}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Fit</span>
            <select
              value={block.content.fit}
              onChange={(e) => setContent({fit: e.target.value})}
              className="field-input"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
        </>
      );
    case 'divider':
      return (
        <label className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Ornament</span>
          <input
            type="checkbox"
            checked={block.content.ornament}
            onChange={(e) => setContent({ornament: e.target.checked})}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>
      );
    case 'list':
      return (
        <ListEditor
          content={block.content}
          set={(patch) => setContent(patch as Record<string, unknown>)}
        />
      );
    case 'spellList':
      return (
        <SpellListEditor
          key={block.id}
          content={block.content}
          set={(patch) => setContent(patch as Record<string, unknown>)}
        />
      );
  }
}

export function PropertiesPanel({
  onCollapse,
  width,
  resizeHandle,
}: {
  onCollapse?: () => void;
  width: number;
  resizeHandle?: React.ReactNode;
}) {
  const {selectedBlock, selectedBlocks, state, dispatch} = useWhiteboard();

  if (selectedBlocks.length > 1) {
    const ids = selectedBlocks.map((b) => b.id);
    const canGroup = ids.length >= 2;
    const groupsInSelection = state.board.groups.filter((g) =>
      g.childIds.every((id) => ids.includes(id)),
    );
    return (
      <aside
        className="relative flex shrink-0 flex-col border-l border-slate-200 bg-white"
        style={{width}}
      >
        {resizeHandle}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selection</p>
            <p className="font-display text-sm font-bold text-slate-800">{selectedBlocks.length} blocks</p>
          </div>
          <CollapseButton onCollapse={onCollapse} />
        </div>
        <div className="space-y-2 p-4">
          <button
            className="panel-btn w-full justify-center border border-slate-200"
            disabled={!canGroup}
            onClick={() => dispatch({type: 'GROUP_BLOCKS', ids})}
          >
            <GroupIcon size={16} /> Group selection
          </button>
          {groupsInSelection.length > 0 ? (
            <button
              className="panel-btn w-full justify-center border border-slate-200"
              onClick={() => groupsInSelection.forEach((g) => dispatch({type: 'UNGROUP', groupId: g.id}))}
            >
              Ungroup
            </button>
          ) : null}
          <button
            className="panel-btn w-full justify-center border border-slate-200 hover:bg-red-50 hover:text-red-600"
            onClick={() => dispatch({type: 'DELETE_BLOCKS', ids})}
          >
            <Trash2 size={16} /> Delete selection
          </button>
          <p className="pt-1 text-center text-xs text-slate-400">
            Manage stacking and grouping in the Layers panel.
          </p>
        </div>
      </aside>
    );
  }

  if (!selectedBlock) {
    return (
      <aside
        className="relative flex shrink-0 flex-col items-center justify-center border-l border-slate-200 bg-white p-6 text-center"
        style={{width}}
      >
        {resizeHandle}
        {onCollapse ? (
          <div className="absolute right-2 top-2">
            <CollapseButton onCollapse={onCollapse} />
          </div>
        ) : null}
        <MousePointerClick className="mb-3 text-slate-300" size={32} />
        <p className="text-sm font-medium text-slate-500">No block selected</p>
        <p className="mt-1 text-xs text-slate-400">Select a block to edit its content, size, and style.</p>
      </aside>
    );
  }

  const block = selectedBlock;
  const style = block.style ?? {};
  const setStyle = (patch: Record<string, unknown>) => dispatch({type: 'UPDATE_STYLE', id: block.id, style: patch});
  const patchBlock = (patch: Partial<Block>) =>
    dispatch({type: 'UPDATE_BLOCK', id: block.id, patch: patch as never});

  const fontSize = style.fontSize ?? (block.type === 'heading' ? 34 : block.type === 'spellList' ? 14 : 15);
  const hasFontSize = block.type !== 'image' && (block.type !== 'divider' || block.content.ornament);
  const hasAlign = block.type === 'text' || block.type === 'heading' || block.type === 'statBlock';
  const isContainer =
    block.type === 'text' ||
    block.type === 'statBlock' ||
    block.type === 'image' ||
    block.type === 'list' ||
    block.type === 'abilityScores' ||
    block.type === 'spellList';

  return (
    <aside
      className="no-scrollbar relative flex shrink-0 flex-col overflow-auto border-l border-slate-200 bg-white"
      style={{width}}
    >
      {resizeHandle}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Selected</p>
          <p className="font-display text-sm font-bold text-slate-800">{BLOCK_LABELS[block.type]}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="icon-btn" title="Duplicate (Ctrl+D)" onClick={() => dispatch({type: 'DUPLICATE_BLOCK', id: block.id})}>
            <Copy size={16} />
          </button>
          <button className="icon-btn" title="Bring forward" onClick={() => dispatch({type: 'BRING_FORWARD', id: block.id})}>
            <BringToFront size={16} />
          </button>
          <button className="icon-btn" title="Send backward" onClick={() => dispatch({type: 'SEND_BACKWARD', id: block.id})}>
            <SendToBack size={16} />
          </button>
          <button
            className="icon-btn hover:bg-red-50 hover:text-red-600"
            title="Delete (Del)"
            onClick={() => dispatch({type: 'DELETE_BLOCK', id: block.id})}
          >
            <Trash2 size={16} />
          </button>
          <CollapseButton onCollapse={onCollapse} />
        </div>
      </div>

      <Section title="Content">
        <ContentEditor block={block} dispatch={dispatch} />
      </Section>

      {hasFontSize || hasAlign ? (
        <Section title="Typography">
          {hasFontSize ? (
            <label>
              <span className="field-label">Font size ({fontSize}px)</span>
              <input
                type="range"
                min={10}
                max={64}
                value={fontSize}
                onChange={(e) => setStyle({fontSize: Number(e.target.value)})}
                className="w-full accent-[var(--color-accent)]"
              />
            </label>
          ) : null}
          {hasFontSize && <label><span className="field-label">Font color</span>
            <input type="color" value={style.color ?? '#2a2118'} onChange={e=>setStyle({color:e.target.value})} className="h-9 w-full cursor-pointer rounded border border-slate-200"/>
          </label>}
          {hasAlign ? (
            <div>
              <span className="field-label">Alignment</span>
              <div className="flex gap-1">
                {ALIGNS.map(({value, icon: Icon}) => (
                  <button
                    key={value}
                    aria-label={`Align ${value}`}
                    onClick={() => setStyle({align: value})}
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-lg border py-2 transition-colors',
                      (style.align ?? 'left') === value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {isContainer ? (
        <Section title="Container">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Show border</span>
            <input
              type="checkbox"
              checked={style.showBorder ?? true}
              onChange={(e) => setStyle({showBorder: e.target.checked})}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="field-label">Background</span>
              <input
                type="color"
                value={style.background ?? '#f4ecd8'}
                onChange={(e) => setStyle({background: e.target.value})}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
              />
            </label>
            <label className="flex-1">
              <span className="field-label">Border</span>
              <input
                type="color"
                value={style.borderColor ?? '#b08d57'}
                onChange={(e) => setStyle({borderColor: e.target.value})}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
              />
            </label>
          </div>
        </Section>
      ) : null}

      <Section title="Position & Size">
        <div className="flex gap-3">
          <NumberField label="X" value={block.x} onChange={(v) => patchBlock({x: v})} />
          <NumberField label="Y" value={block.y} onChange={(v) => patchBlock({y: v})} />
        </div>
        <div className="flex gap-3">
          <NumberField label="Width" value={block.width} onChange={(v) => patchBlock({width: Math.max(40, v)})} />
          <NumberField label="Height" value={block.height} onChange={(v) => patchBlock({height: Math.max(40, v)})} />
        </div>
        <NumberField label="Rotation" value={block.rotation ?? 0} onChange={(v) => patchBlock({rotation: v})} />
      </Section>
    </aside>
  );
}









