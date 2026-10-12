import type { CircleEntry } from '@/lib/circle-api';

export function ordinalPlace(position: number) {
  return `${position}º`;
}

export function podiumSlots(entries: CircleEntry[]) {
  return {
    first: entries.find((entry) => entry.position === 1) ?? null,
    second: entries.find((entry) => entry.position === 2) ?? null,
    third: entries.find((entry) => entry.position === 3) ?? null,
  };
}

export function showsPodiumTrophy(podiums: number) {
  return podiums > 0;
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
