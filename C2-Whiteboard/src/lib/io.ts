import type {Block, Group, Whiteboard} from '@/types';
import {normalizeBoard} from './board';

export function exportWhiteboard(board: Whiteboard): void {
  const payload = JSON.stringify(board, null, 2);
  const blob = new Blob([payload], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const safeName = board.name.trim().replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '-') || 'whiteboard';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isBlock(value: unknown): value is Block {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.type === 'string' &&
    typeof b.x === 'number' &&
    typeof b.y === 'number' &&
    typeof b.width === 'number' &&
    typeof b.height === 'number' &&
    typeof b.content === 'object' &&
    b.content !== null
  );
}

export function parseWhiteboard(raw: string): Whiteboard {
  const parsed = JSON.parse(raw) as Partial<Whiteboard>;
  if (!parsed || !Array.isArray(parsed.blocks)) {
    throw new Error('Invalid whiteboard file: missing blocks.');
  }
  const blocks = parsed.blocks.filter(isBlock);
  const groups = Array.isArray(parsed.groups) ? (parsed.groups as Group[]) : [];
  return normalizeBoard({
    id: typeof parsed.id === 'string' ? parsed.id : `wb_${Date.now()}`,
    name: typeof parsed.name === 'string' ? parsed.name : 'Imported Whiteboard',
    blocks,
    groups,
    viewport: parsed.viewport ?? {pan: {x: 0, y: 0}, zoom: 1},
    updatedAt: Date.now(),
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
