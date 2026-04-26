/**
 * Encode a raster image file as a data URL small enough for localStorage-backed saves.
 * Large uploads are downscaled and re-compressed (JPEG/WebP) instead of rejected.
 */

export type CompressImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

const DEFAULT_MAX_OUTPUT = Math.floor(1.75 * 1024 * 1024);
const DEFAULT_MAX_INPUT = 20 * 1024 * 1024;

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function canvasExport(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): string | null {
  try {
    const data = canvas.toDataURL(mime, quality);
    if (!data || data.length < 32) return null;
    const expected = `data:${mime}`;
    if (!data.startsWith(expected)) return null;
    return data;
  } catch {
    return null;
  }
}

function bestExportUnderBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): string | null {
  const qualities = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.48, 0.42, 0.36, 0.32];
  const mimeOrder = ['image/webp', 'image/jpeg'] as const;
  let best: string | null = null;
  for (const mime of mimeOrder) {
    for (const q of qualities) {
      const data = canvasExport(canvas, mime, q);
      if (!data) continue;
      if (data.length <= maxBytes) return data;
      if (!best || data.length < best.length) best = data;
    }
  }
  return best;
}

/**
 * @param maxOutputBytes — cap on resulting data URL length (UTF-16 length in JS ≈ quota cost)
 * @param maxInputBytes — reject larger source files before decode (memory / UX)
 */
export async function compressImageFileToDataUrl(
  file: File,
  options?: { maxOutputBytes?: number; maxInputBytes?: number },
): Promise<CompressImageResult> {
  const maxOutput = options?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
  const maxInput = options?.maxInputBytes ?? DEFAULT_MAX_INPUT;

  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Choose an image file (PNG, JPEG, WebP, …).' };
  }
  if (file.size > maxInput) {
    const mb = Math.round(maxInput / (1024 * 1024));
    return {
      ok: false,
      error: `File too large (max ${mb} MB). Try a smaller original or link the image elsewhere.`,
    };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    return { ok: false, error: 'Could not read that image.' };
  }

  try {
    const iw = bitmap.width;
    const ih = bitmap.height;
    if (iw < 1 || ih < 1) {
      return { ok: false, error: 'Invalid image dimensions.' };
    }

    let maxSide = Math.min(2048, Math.max(iw, ih));
    const minSide = 160;

    while (maxSide >= minSide) {
      const scale = Math.min(1, maxSide / Math.max(iw, ih));
      const tw = Math.max(1, Math.round(iw * scale));
      const th = Math.max(1, Math.round(ih * scale));

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { ok: false, error: 'Could not process image in this browser.' };
      }
      ctx.drawImage(bitmap, 0, 0, tw, th);

      const data = bestExportUnderBudget(canvas, maxOutput);
      if (data && data.length <= maxOutput) {
        return { ok: true, dataUrl: data };
      }

      maxSide = Math.floor(maxSide * 0.82);
    }

    return {
      ok: false,
      error:
        'Could not shrink the image enough for browser storage. Try a smaller or simpler picture.',
    };
  } finally {
    bitmap?.close();
  }
}
