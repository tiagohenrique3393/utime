import type { HabitPeriod } from '@/lib/habit-catalog';

const periods: readonly HabitPeriod[] = ['manha', 'tarde', 'noite'];

export type DragBand = {
  period: HabitPeriod;
  id?: string;
  top: number;
  bottom: number;
};

export function dropIndexFromCenters(pointerY: number, centers: readonly number[]) {
  let index = 0;
  for (const center of centers) {
    if (pointerY > center) {
      index += 1;
    }
  }
  return index;
}

export function locateHabitDrop(pointerY: number, draggedId: string, headers: readonly DragBand[], rows: readonly DragBand[]) {
  for (const period of periods) {
    const header = headers.find((item) => item.period === period);
    const periodRows = rows.filter((row) => row.period === period && row.id !== draggedId);
    if (!header && periodRows.length === 0) {
      continue;
    }
    const top = header?.top ?? periodRows[0].top;
    const lastRow = periodRows[periodRows.length - 1];
    const bottom = lastRow ? lastRow.bottom : header?.bottom ?? top;
    if (pointerY < top || pointerY > bottom + 12) {
      continue;
    }
    const centers = periodRows.map((row) => (row.top + row.bottom) / 2);
    return { period, index: dropIndexFromCenters(pointerY, centers) };
  }
  return null;
}
