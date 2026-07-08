import type {ListItem} from '@/types';

export const MAX_LIST_INDENT = 3;

function clampIndent(indent: number): number {
  return Math.max(0, Math.min(MAX_LIST_INDENT, indent));
}

export function listItemText(item: ListItem): string {
  return typeof item === 'string' ? item : item.text;
}

export function listItemChecked(item: ListItem): boolean {
  return typeof item === 'string' ? false : item.checked ?? false;
}

export function listItemIndent(item: ListItem): number {
  return typeof item === 'string' ? 0 : clampIndent(item.indent ?? 0);
}

export function withListItemText(item: ListItem, text: string): ListItem {
  return typeof item === 'string' ? text : {...item, text};
}

export function withListItemChecked(item: ListItem, checked: boolean): ListItem {
  return typeof item === 'string' ? {text: item, checked} : {...item, checked};
}

export function withListItemIndent(item: ListItem, indent: number): ListItem {
  const nextIndent = clampIndent(indent);
  if (typeof item === 'string') {
    return nextIndent === 0 ? item : {text: item, indent: nextIndent};
  }
  const {indent: _indent, ...rest} = item;
  return nextIndent === 0 ? rest : {...rest, indent: nextIndent};
}

export function makeListItem(text = '', checklist = false): ListItem {
  return checklist ? {text, checked: false} : text;
}
