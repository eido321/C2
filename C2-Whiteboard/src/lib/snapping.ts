export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SnapAxis = 'x' | 'y';

/**
 * A single alignment guide line, expressed in canvas coordinates.
 * For axis 'x' the line is vertical (constant x = `position`, running from
 * `start` to `end` on the y axis); for axis 'y' it is horizontal.
 */
export interface AlignmentGuide {
  axis: SnapAxis;
  position: number;
  start: number;
  end: number;
}

export interface SnapResult {
  /** Snapped x (unchanged when no x snap was found). */
  x: number;
  /** Snapped y (unchanged when no y snap was found). */
  y: number;
  width: number;
  height: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: AlignmentGuide[];
}

export interface ResizeSnapEdges {
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
}

type EdgeKind = 'start' | 'center' | 'end';

const EDGE_KINDS: readonly EdgeKind[] = ['start', 'center', 'end'];

function edgesFor(rect: Rect, axis: SnapAxis): Record<EdgeKind, number> {
  if (axis === 'x') {
    return {start: rect.x, center: rect.x + rect.width / 2, end: rect.x + rect.width};
  }
  return {start: rect.y, center: rect.y + rect.height / 2, end: rect.y + rect.height};
}

interface AxisSnap {
  /** Amount to add to the dragged rect's position on this axis. */
  offset: number;
  /** Snapped line position in canvas coordinates. */
  position: number;
  distance: number;
}

/**
 * Finds the closest alignment between the dragged rect's edges (left/center/right
 * or top/middle/bottom) and any target rect's edges on the given axis. Covers both
 * same-edge alignment (left↔left, center↔center, ...) and adjacency (left↔right,
 * right↔left, ...) since every edge pair is compared.
 */
function computeAxisSnap(
  dragged: Rect,
  targets: readonly Rect[],
  axis: SnapAxis,
  threshold: number,
): AxisSnap | null {
  const draggedEdges = edgesFor(dragged, axis);
  let best: AxisSnap | null = null;

  for (const target of targets) {
    const targetEdges = edgesFor(target, axis);
    for (const dk of EDGE_KINDS) {
      for (const tk of EDGE_KINDS) {
        const distance = Math.abs(draggedEdges[dk] - targetEdges[tk]);
        if (distance > threshold) continue;
        if (best && distance >= best.distance) continue;
        best = {offset: targetEdges[tk] - draggedEdges[dk], position: targetEdges[tk], distance};
      }
    }
  }

  return best;
}

function buildGuide(
  axis: SnapAxis,
  position: number,
  snapped: Rect,
  targets: readonly Rect[],
): AlignmentGuide {
  const lows: number[] = [];
  const highs: number[] = [];

  const pushSpan = (rect: Rect) => {
    if (axis === 'x') {
      lows.push(rect.y);
      highs.push(rect.y + rect.height);
    } else {
      lows.push(rect.x);
      highs.push(rect.x + rect.width);
    }
  };

  pushSpan(snapped);
  for (const target of targets) {
    const e = edgesFor(target, axis);
    if (
      Math.abs(e.start - position) < 0.5 ||
      Math.abs(e.center - position) < 0.5 ||
      Math.abs(e.end - position) < 0.5
    ) {
      pushSpan(target);
    }
  }

  return {axis, position, start: Math.min(...lows), end: Math.max(...highs)};
}

/**
 * Given a dragged rect and candidate rects (all in canvas units), returns the
 * position adjusted to snap onto the nearest alignment/adjacency line per axis,
 * plus the guide lines to draw. `threshold` is also in canvas units — callers
 * should pass screenPixels / zoom so the feel is consistent at any zoom.
 */
export function computeSnap(
  dragged: Rect,
  targets: readonly Rect[],
  threshold: number,
): SnapResult {
  const xSnap = computeAxisSnap(dragged, targets, 'x', threshold);
  const ySnap = computeAxisSnap(dragged, targets, 'y', threshold);

  const x = dragged.x + (xSnap?.offset ?? 0);
  const y = dragged.y + (ySnap?.offset ?? 0);
  const snapped: Rect = {x, y, width: dragged.width, height: dragged.height};

  const guides: AlignmentGuide[] = [];
  if (xSnap) guides.push(buildGuide('x', xSnap.position, snapped, targets));
  if (ySnap) guides.push(buildGuide('y', ySnap.position, snapped, targets));

  return {x, y, width: dragged.width, height: dragged.height, snappedX: xSnap !== null, snappedY: ySnap !== null, guides};
}

function axisTargetLines(targets: readonly Rect[], axis: SnapAxis): number[] {
  return targets.flatMap((target) => {
    const edges = edgesFor(target, axis);
    return [edges.start, edges.center, edges.end];
  });
}

function closestLine(value: number, lines: readonly number[], threshold: number): {position: number; distance: number} | null {
  let best: {position: number; distance: number} | null = null;
  for (const position of lines) {
    const distance = Math.abs(value - position);
    if (distance > threshold) continue;
    if (best && distance >= best.distance) continue;
    best = {position, distance};
  }
  return best;
}

/**
 * Snaps only the actively resized edges. The opposite edge stays anchored so a
 * west/north resize behaves like Figma: the moved edge finds nearby alignment
 * lines while the fixed edge remains in place.
 */
export function computeResizeSnap(
  rect: Rect,
  targets: readonly Rect[],
  threshold: number,
  active: ResizeSnapEdges,
  minSize: number,
): SnapResult {
  let {x, y, width, height} = rect;
  const guides: AlignmentGuide[] = [];

  const verticalLines = axisTargetLines(targets, 'x');
  const horizontalLines = axisTargetLines(targets, 'y');

  const left = active.left ? closestLine(x, verticalLines, threshold) : null;
  const right = active.right ? closestLine(x + width, verticalLines, threshold) : null;
  const top = active.top ? closestLine(y, horizontalLines, threshold) : null;
  const bottom = active.bottom ? closestLine(y + height, horizontalLines, threshold) : null;

  const xSnap = [left, right].filter((snap): snap is {position: number; distance: number} => Boolean(snap)).sort((a, b) => a.distance - b.distance)[0];
  const ySnap = [top, bottom].filter((snap): snap is {position: number; distance: number} => Boolean(snap)).sort((a, b) => a.distance - b.distance)[0];

  if (xSnap) {
    if (left && xSnap === left) {
      const anchoredRight = x + width;
      x = Math.min(xSnap.position, anchoredRight - minSize);
      width = anchoredRight - x;
    } else {
      width = Math.max(minSize, xSnap.position - x);
    }
  }

  if (ySnap) {
    if (top && ySnap === top) {
      const anchoredBottom = y + height;
      y = Math.min(ySnap.position, anchoredBottom - minSize);
      height = anchoredBottom - y;
    } else {
      height = Math.max(minSize, ySnap.position - y);
    }
  }

  const snapped: Rect = {x, y, width, height};
  if (xSnap) guides.push(buildGuide('x', xSnap.position, snapped, targets));
  if (ySnap) guides.push(buildGuide('y', ySnap.position, snapped, targets));

  return {x, y, width, height, snappedX: Boolean(xSnap), snappedY: Boolean(ySnap), guides};
}
