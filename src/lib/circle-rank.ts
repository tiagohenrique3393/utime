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

export function visibleRanking(entries: CircleEntry[], limit: number, userId: string) {
  const ordered = [...entries].sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
  const page = ordered.slice(0, Math.max(0, limit));
  const mine = ordered.find((entry) => entry.userId === userId);
  if (mine && !page.some((entry) => entry.userId === mine.userId)) {
    return [...page, mine];
  }
  return page;
}
