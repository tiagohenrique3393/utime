import type { CircleEntry } from '@/lib/circle-api';

export function ordinalPlace(position: number) {
  return `${position}º`;
}

export function podiumSlots(entries: CircleEntry[]) {
  const ordered = [...entries].sort((left, right) => left.position - right.position || left.name.localeCompare(right.name) || left.userId.localeCompare(right.userId));
  return {
    first: ordered[0] ?? null,
    second: ordered[1] ?? null,
    third: ordered[2] ?? null,
  };
}

export function showsPodiumTrophy(podiums: number) {
  return podiums > 0;
}

export function podiumColumnWidth(viewport: number) {
  const pad = viewport >= 840 ? 32 : 22;
  return Math.min(460, Math.max(0, viewport - pad * 2));
}

export function podiumCardWidths(viewport: number, count: 1 | 2 | 3) {
  const column = podiumColumnWidth(viewport);
  const gap = 8;
  if (count === 1) {
    const width = Math.min(220, Math.max(148, Math.round(column * 0.72)));
    return { first: Math.min(width, column), side: 0 };
  }
  const usable = Math.max(0, column - gap * (count - 1));
  const firstWeight = 1.18;
  const total = firstWeight + (count - 1);
  const first = Math.min(220, Math.round((usable * firstWeight) / total));
  const sideRoom = Math.max(0, usable - first);
  const side = Math.min(200, Math.floor(sideRoom / (count - 1)));
  return { first: Math.max(first, side), side };
}

export function visibleRanking(entries: CircleEntry[], limit: number, userId: string) {
  const ordered = [...entries].sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
  const page = ordered.slice(0, Math.max(0, limit));
  const mine = ordered.find((entry) => entry.userId === userId);
  if (mine && !page.some((entry) => entry.userId === mine.userId)) {
    return [...page, mine];
  }
  return page;
}
