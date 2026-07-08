import type {Whiteboard} from '@/types';
import {normalizeBoard} from './board';

const STORAGE_KEY = 'c2_whiteboard_v1';

export function loadWhiteboard(): Whiteboard | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Whiteboard;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return normalizeBoard(parsed);
  } catch {
    return null;
  }
}

export function saveWhiteboard(board: Whiteboard): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // Ignore quota / serialization errors — persistence is best-effort.
  }
}

export function clearWhiteboard(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
