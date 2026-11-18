import type {Whiteboard} from '@/types';

export async function library<T>(action: string, fields: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/library', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action, ...fields}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The library could not complete this request.');
  return result;
}

export interface CloudSheet { id: string; revision: number }
export function saveSheet(sheet: CloudSheet, board: Whiteboard) {
  return library<{revision: number}>('save', {...sheet, board});
}
