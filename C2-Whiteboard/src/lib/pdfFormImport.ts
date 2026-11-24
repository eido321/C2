import {setSlotTotal} from '@/lib/slotRows';
import {PDFCheckBox, PDFTextField, type PDFDocument} from 'pdf-lib';
import type {Whiteboard} from '@/types';
import {listItemText, withListItemChecked, withListItemText} from './listContent';
import {sanitizeFieldName} from './pdfFieldName';

// The embedded board retains layout, hidden blocks and values without form controls.
// Apply only fields present in this PDF so older exports retain their original data.
export function applyPdfFields(pdf: PDFDocument, board: Whiteboard): Whiteboard {
  const fields = new Map(
    pdf
      .getForm()
      .getFields()
      .map((field) => [field.getName(), field]),
  );
  for (const block of board.blocks) {
    const field = (key: string) => fields.get(sanitizeFieldName(block.id + '.' + key));
    function text(key: string): string | undefined {
      const f = field(key);
      return f instanceof PDFTextField ? (f.getText() ?? '') : undefined;
    }
    function checked(key: string) {
      const f = field(key);
      return f instanceof PDFCheckBox ? f.isChecked() : undefined;
    }
    function integer(key: string, original: number) {
      const value = text(key);
      if (value === undefined) return original;
      if (!/^-?\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) {
        throw new Error('Expected a whole number in PDF field ' + key + '.');
      }
      return Number(value);
    }
    function strings<T extends object>(target: T, keys: (keyof T & string)[], prefix = '') {
      for (const key of keys) {
        const value = text(prefix + key);
        if (value !== undefined && (value || target[key] !== undefined))
          Object.assign(target, {[key]: value});
      }
    }
    switch (block.type) {
      case 'heading':
        strings(block.content, ['text', 'subtitle']);
        break;
      case 'text':
        strings(block.content, ['text']);
        break;
      case 'statBlock':
        strings(block.content, ['label', 'value', 'hint']);
        break;
      case 'spellSlots':
        block.content.rows=block.content.rows.map((row,i)=>{
          const value=text('total'+i);
          return setSlotTotal({...row,used:row.used.map((v,k)=>checked('used'+i+'_'+k)??v)},i,value===''?0:integer('total'+i,row.total));
        });
        break;
      case 'abilityScore': strings(block.content,['ability','modifier','saveDc','attackBonus']); break;
      case 'abilityScores':
        for (const ability of block.content.abilities) ability.score = integer(ability.key, ability.score);
        break;
      case 'list': {
        const content = block.content;
        strings(content, ['title']);
        content.items = content.items.map((item, i) => {
          const prefix = content.checklist ? '' : content.ordered ? i + 1 + '. ' : '• ';
          const raw = text('item.' + i + '.text');
          const value = raw?.startsWith(prefix) ? raw.slice(prefix.length) : raw;
          let next =
            value === undefined || value === listItemText(item) ? item : withListItemText(item, value);
          const mark = checked('item.' + i + '.checked');
          if (mark !== undefined && (mark || typeof item !== 'string'))
            next = withListItemChecked(next, mark);
          return next;
        });
        break;
      }
      case 'spellList':
        strings(block.content, ['title', 'ability', 'saveDc', 'attackBonus']);
        for (const group of block.content.groups) {
          const key = 'group.' + group.id;
          group.slotsTotal = Math.max(0, integer(key + '.total', group.slotsTotal));
          group.slotsExpended = Math.min(
            group.slotsTotal,
            Math.max(0, integer(key + '.expended', group.slotsExpended)),
          );
          for (const spell of group.spells) {
            const prefix = 'spell.' + spell.id + '.';
            strings(spell, ['name'], prefix);
            const description = text(prefix + 'description');
            if (description !== undefined && description !== (spell.description ?? spell.notes ?? '')) {
              spell.description = description;
              if (!description) spell.notes = '';
            }
            spell.prepared = checked(prefix + 'prepared') ?? spell.prepared;
          }
        }
        break;
    }
  }
  return board;
}



