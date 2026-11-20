import {useEffect, useRef, useState} from 'react';
import {Check, Plus, X} from 'lucide-react';
import type {ListItem} from '@/types';
import {
  listItemChecked,
  listItemIndent,
  listItemText,
  makeListItem,
  withListItemChecked,
  withListItemIndent,
  withListItemText,
} from '@/lib/listContent';
import {cn} from '@/lib/utils';
import type {BlockViewProps} from './shared';

export function ListBlock({block, editing, update}: BlockViewProps<'list'>) {
  const {content, style} = block;
  const fontSize = style?.fontSize ?? 15;
  const items = content.items.length ? content.items : [makeListItem('', content.checklist)];
  const rowRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const resizeRow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    rowRefs.current.forEach(resizeRow);
  }, [items]);

  useEffect(() => {
    if (focusIndex === null) return;
    const el = rowRefs.current[focusIndex];
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    setFocusIndex(null);
  }, [focusIndex, items]);

  const setItems = (nextItems: ListItem[]) => update({items: nextItems});
  const setItem = (index: number, value: string) => {
    setItems(items.map((it, i) => (i === index ? withListItemText(it, value) : it)));
  };
  const setChecked = (index: number, checked: boolean) => {
    setItems(items.map((it, i) => (i === index ? withListItemChecked(it, checked) : it)));
  };
  const setIndent = (index: number, indent: number) => {
    setItems(items.map((it, i) => (i === index ? withListItemIndent(it, indent) : it)));
  };
  const addItemAfter = (index: number, text = '') => {
    const next = [...items];
    next.splice(index + 1, 0, makeListItem(text, content.checklist));
    setItems(next);
    setFocusIndex(index + 1);
  };
  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([makeListItem('', content.checklist)]);
      setFocusIndex(0);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
    setFocusIndex(Math.max(0, index - 1));
  };

  const onRowKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const text = listItemText(items[index] ?? '');
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItemAfter(index);
      return;
    }
    if (e.key === 'Backspace' && text.length === 0) {
      e.preventDefault();
      removeItem(index);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const delta = e.shiftKey ? -1 : 1;
      setIndent(index, listItemIndent(items[index] ?? '') + delta);
    }
  };

  const Marker = ({item, index}: {item: ListItem; index: number}) => {
    if (content.checklist) {
      const checked = listItemChecked(item);
      return (
        <button
          type="button"
          onClick={() => editing && setChecked(index, !checked)}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={!editing}
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            checked ? 'border-accent bg-accent text-parchment' : 'border-gold/60 bg-parchment/70 text-transparent',
            editing && 'cursor-pointer hover:border-accent',
          )}
          title={checked ? 'Mark incomplete' : 'Mark complete'}
        >
          <Check size={11} strokeWidth={3} />
        </button>
      );
    }

    return (
      <span className="mt-0.5 min-w-5 shrink-0 text-right font-sans text-[0.8em] font-semibold text-gold">
        {content.ordered ? `${index + 1}.` : '•'}
      </span>
    );
  };

  return (
    <div style={{fontSize}} className="flex h-full w-full flex-col overflow-hidden text-ink">
      {editing ? (
        <input
          value={content.title ?? ''}
          onChange={(e) => update({title: e.target.value})}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="List title"
          className="mb-2 border-b border-gold/40 bg-transparent pb-1 font-display text-[0.933em] font-bold uppercase tracking-wide text-accent outline-none placeholder:text-accent/35"
        />
      ) : content.title ? (
        <div className="mb-2 border-b border-gold/40 pb-1 font-display text-[0.933em] font-bold uppercase tracking-wide text-accent">
          {content.title}
        </div>
      ) : null}

      <div data-canvas-wheel="internal-scroll" className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-auto overscroll-contain pr-1 font-serif text-ink-soft" style={{fontSize}}>
        {items.map((item, i) => (
          <div key={i} className="group/list-row flex items-start gap-2" style={{paddingLeft: listItemIndent(item) * 16}}>
            <Marker item={item} index={i} />
            {editing ? (
              <span className="flex flex-1 items-start gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                <textarea
                  ref={(el) => {
                    rowRefs.current[i] = el;
                    resizeRow(el);
                  }}
                  value={listItemText(item)}
                  onChange={(e) => setItem(i, e.target.value)}
                  onInput={(e) => resizeRow(e.currentTarget)}
                  onKeyDown={onRowKeyDown(i)}
                  rows={1}
                  placeholder="List item"
                  className="min-h-6 flex-1 resize-none overflow-hidden rounded-md border border-transparent bg-white/30 px-1.5 py-0.5 leading-snug outline-none transition-colors placeholder:text-slate-400 focus:border-gold/40 focus:bg-white/55"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="mt-0.5 rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-white/40 hover:text-accent group-hover/list-row:opacity-100 focus:opacity-100"
                  title="Remove item"
                >
                  <X size={13} />
                </button>
              </span>
            ) : (
              <span
                className={cn(
                  'min-w-0 flex-1 whitespace-pre-wrap leading-snug',
                  content.checklist && listItemChecked(item) && 'text-slate-400 line-through decoration-gold/70',
                )}
              >
                {listItemText(item)}
              </span>
            )}
          </div>
        ))}
      </div>

      {editing ? (
        <button
          type="button"
          onClick={() => addItemAfter(items.length - 1, '')}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-2 flex w-fit items-center gap-1 rounded-md px-1.5 py-1 text-[0.8em] font-medium text-accent hover:bg-white/35"
        >
          <Plus size={13} /> Add item
        </button>
      ) : null}
    </div>
  );
}



