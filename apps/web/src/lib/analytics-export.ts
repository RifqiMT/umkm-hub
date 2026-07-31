/** Client-side download helpers for Analytics tables (CSV) and charts (PNG). */

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text: string;
  if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Record<string, unknown>>,
): void {
  const safeName = filename.toLowerCase().endsWith('.csv')
    ? filename
    : `${filename}.csv`;
  const blob = new Blob([rowsToCsv(headers, rows)], {
    type: 'text/csv;charset=utf-8',
  });
  downloadBlob(blob, safeName);
}

export function slugExportName(raw: string, fallback = 'analytics'): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** Soft ceiling so browsers do not reject oversized canvases. */
const MAX_CANVAS_EDGE_PX = 8192;

/** Prefer at least this CSS-width × scale so small panels still print sharp. */
const MIN_EXPORT_WIDTH_PX = 3200;

/**
 * Highest practical pixel ratio for chart PNG exports.
 * Uses 2× device DPR (min 6, max 8) so retina displays stay crisp in print.
 */
export function maxChartPngPixelRatio(
  devicePixelRatio = typeof window !== 'undefined'
    ? window.devicePixelRatio || 1
    : 1,
): number {
  return Math.min(8, Math.max(6, Math.ceil(devicePixelRatio * 2)));
}

function resolveExportScale(
  cssWidth: number,
  requestedRatio: number,
): number {
  const width = Math.max(1, cssWidth);
  const forMinWidth = MIN_EXPORT_WIDTH_PX / width;
  const scale = Math.max(requestedRatio, forMinWidth);
  const maxByEdge = MAX_CANVAS_EDGE_PX / width;
  return Math.max(1, Math.min(scale, maxByEdge));
}

/**
 * Maximum-quality PNG of an analytics chart node.
 * Prefers Recharts SVG→canvas (vector-sharp), then html-to-image.
 * Output is lossless PNG at a high pixel ratio (capped for browser limits).
 */
export async function downloadChartPng(
  element: HTMLElement,
  filename: string,
  options?: { pixelRatio?: number; backgroundColor?: string },
): Promise<void> {
  const pixelRatio = options?.pixelRatio ?? maxChartPngPixelRatio();
  const backgroundColor = options?.backgroundColor ?? '#ffffff';
  const safeName = filename.toLowerCase().endsWith('.png')
    ? filename
    : `${filename}.png`;

  // Vector path first — sharpest for Recharts graphs.
  try {
    await downloadRechartsSvgPng(
      element,
      safeName,
      pixelRatio,
      backgroundColor,
    );
    return;
  } catch {
    // Fall through when SVG is not ready / missing.
  }

  const { toPng } = await import('html-to-image');
  const rect = element.getBoundingClientRect();
  const scale = resolveExportScale(rect.width || 1, pixelRatio);
  const dataUrl = await toPng(element, {
    pixelRatio: scale,
    cacheBust: true,
    backgroundColor,
    skipAutoScale: true,
    // Skip UI chrome if nested somehow
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return (
        !node.classList.contains('umkm-analytics-fs-btn') &&
        !node.classList.contains('umkm-analytics-export-btn')
      );
    },
  });
  const res = await fetch(dataUrl);
  downloadBlob(await res.blob(), safeName);
}

async function downloadRechartsSvgPng(
  container: HTMLElement,
  filename: string,
  requestedRatio: number,
  backgroundColor: string,
): Promise<void> {
  const svg = container.querySelector('svg.recharts-surface');
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error('Chart is not ready to export yet.');
  }

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const scale = resolveExportScale(width, requestedRatio);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  // Explicit shape rendering helps crisp axes/bars when rasterized.
  clone.setAttribute('shape-rendering', 'geometricPrecision');

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob(
    ['<?xml version="1.0" encoding="UTF-8"?>', svgString],
    { type: 'image/svg+xml;charset=utf-8' },
  );
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d', {
      alpha: true,
      colorSpace: 'srgb',
    } as CanvasRenderingContext2DSettings);
    if (!ctx) throw new Error('Could not create canvas for PNG export.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0, width, height);

    // PNG is lossless — omit quality arg so browsers keep full fidelity.
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
        'image/png',
      );
    });
    downloadBlob(blob, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize chart SVG'));
    img.src = src;
  });
}
