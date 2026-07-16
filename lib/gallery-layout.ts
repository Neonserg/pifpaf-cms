export type JustifiableItem = { width: number | null; height: number | null };

export type JustifiedPosition<T> = { item: T; left: number; top: number; width: number; height: number };

/** Justified-rows layout (rows aligned by height, no cropping) — same algorithm as the prototype. */
export function computeJustified<T extends JustifiableItem>(
  items: T[],
  containerWidth: number,
  rowHeight: number,
  gap = 4
): { positions: JustifiedPosition<T>[]; totalHeight: number } {
  const positioned: JustifiedPosition<T>[] = [];
  let row: T[] = [];
  let rowWidth = 0;
  let top = 0;

  function flush(isLast: boolean) {
    if (!row.length || containerWidth <= 0) {
      row = [];
      rowWidth = 0;
      return;
    }
    const targetW = containerWidth - gap * (row.length - 1);
    const scale = isLast ? Math.min(1.15, targetW / rowWidth) : targetW / rowWidth;
    const h = rowHeight * scale;
    let left = 0;
    for (const it of row) {
      const w = ((it.width ?? 4) / (it.height ?? 3)) * h;
      positioned.push({ item: it, left, top, width: w, height: h });
      left += w + gap;
    }
    top += h + gap;
    row = [];
    rowWidth = 0;
  }

  for (const it of items) {
    const w = ((it.width ?? 4) / (it.height ?? 3)) * rowHeight;
    row.push(it);
    rowWidth += w + (row.length > 1 ? gap : 0);
    if (rowWidth >= containerWidth) flush(false);
  }
  flush(true);

  return { positions: positioned, totalHeight: top };
}
