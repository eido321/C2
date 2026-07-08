import {useCallback, useEffect, useRef, useState} from 'react';
import {clamp} from '@/lib/utils';

export interface PanelWidthConfig {
  /** Stable localStorage key suffix, e.g. 'left' or 'right'. */
  key: string;
  defaultWidth: number;
  min: number;
  max: number;
}

const STORAGE_PREFIX = 'c2_panel_width_';

/** Reads a persisted width, falling back to the default when missing or out of range. */
export function loadPanelWidth(cfg: PanelWidthConfig): number {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + cfg.key);
    if (raw === null) return cfg.defaultWidth;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < cfg.min || value > cfg.max) return cfg.defaultWidth;
    return value;
  } catch {
    return cfg.defaultWidth;
  }
}

function savePanelWidth(key: string, width: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(Math.round(width)));
  } catch {
    // Best-effort persistence; ignore quota/security errors.
  }
}

export interface ResizablePanel {
  width: number;
  isResizing: boolean;
  /** Begin a drag from the resize handle. */
  startResize: (e: React.PointerEvent) => void;
  /** Restore the default width (used for double-click). */
  reset: () => void;
}

/**
 * Manages a persisted, drag-resizable panel width.
 * `side` is the panel's position, which determines whether dragging right grows or shrinks it.
 */
export function usePanelWidth(cfg: PanelWidthConfig, side: 'left' | 'right'): ResizablePanel {
  const [width, setWidth] = useState(() => loadPanelWidth(cfg));
  const [isResizing, setIsResizing] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    savePanelWidth(cfg.key, width);
  }, [cfg.key, width]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      setIsResizing(true);

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const raw = side === 'left' ? startWidth + delta : startWidth - delta;
        const next = clamp(raw, cfg.min, cfg.max);
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => setWidth(next));
      };
      const onUp = () => {
        setIsResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, side, cfg.min, cfg.max],
  );

  const reset = useCallback(() => setWidth(cfg.defaultWidth), [cfg.defaultWidth]);

  return {width, isResizing, startResize, reset};
}

export const LEFT_PANEL: PanelWidthConfig = {key: 'left', defaultWidth: 256, min: 200, max: 520};
export const RIGHT_PANEL: PanelWidthConfig = {key: 'right', defaultWidth: 288, min: 240, max: 560};
