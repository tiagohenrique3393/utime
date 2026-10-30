import type { CircleEntry } from '@/lib/circle-api';
import { ordinalPlace, podiumCardWidths, podiumColumnWidth, podiumSlots, showsPodiumTrophy, visibleRanking } from '@/lib/circle-rank';
import { periods } from '@/lib/tasks';
import { todayKey } from '@/lib/habit-day';
import { suggestedHabits } from '@/lib/suggested-habits';
import {
  achievementTotals,
  competitionRank,
  completionCreatesEvent,
  completionRemovesEvent,
  BONUS_CAP,
  DAY_CAP,
  dayScore,
  formatCirclePoints,
  honorLabel,
  isOfficialTask,
  isPersonalCatalogHabit,
  membershipOverlapsPeriod,
  officialTaskIds,
  periodEnd,
  periodLabel,
  periodStart,
  publicHandleCandidate,
  rankingHabitCounts,
  requirementGaps,
  requirementMessage,
  scoreCompletions,
  shiftPeriod,
  type RankCompletion,
} from '@/lib/circle';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const journeyIds = periods.flatMap((period) => period.tasks.map((task) => task.id)).sort();
assertEqual([...officialTaskIds].sort().join(','), journeyIds.join(','));
assertEqual(officialTaskIds.length, 15);

const saturday = '2026-10-10';
assertEqual(periodStart('semana', saturday), '2026-10-05');
assertEqual(periodEnd('semana', '2026-10-05'), '2026-10-12');
assertEqual(periodLabel('semana', '2026-10-05'), '5 A 11 DE OUTUBRO DE 2026');
assertEqual(periodStart('semana', '2026-10-05'), '2026-10-05');
assertEqual(periodStart('semana', '2026-10-11'), '2026-10-05');
assertEqual(periodStart('semana', '2026-10-12'), '2026-10-12');
assertEqual(shiftPeriod('semana', '2026-10-05', 1), '2026-10-12');
assertEqual(shiftPeriod('semana', '2026-10-05', -1), '2026-09-28');

assertEqual(periodStart('mes', saturday), '2026-10-01');
assertEqual(periodEnd('mes', '2026-10-01'), '2026-11-01');
assertEqual(periodEnd('mes', '2026-12-01'), '2027-01-01');
assertEqual(periodLabel('mes', '2026-10-01'), 'OUTUBRO DE 2026');

assertEqual(periodStart('ano', saturday), '2026-01-01');
assertEqual(periodEnd('ano', '2026-01-01'), '2027-01-01');
assertEqual(periodStart('ano', '2024-02-29'), '2024-01-01');

assertEqual(suggestedHabits.length, 10);
assertEqual(suggestedHabits.filter((habit) => habit.relevance === 'alta').length, 2);
assertEqual(suggestedHabits.filter((habit) => habit.relevance === 'media').length, 4);
assertEqual(suggestedHabits.filter((habit) => habit.relevance === 'baixa').length, 4);
assertEqual(dayScore({ alta: 2, media: 4, baixa: 4 }), 100);
assertEqual(dayScore({ alta: 3, media: 4, baixa: 4 }), 105);
assertEqual(dayScore({ alta: 2, media: 5, baixa: 4 }), 102.5);
assertEqual(dayScore({ alta: 2, media: 4, baixa: 5 }), 101);
assertEqual(dayScore({ alta: 4, media: 6, baixa: 8 }), 110);
assertEqual(dayScore({ alta: 40, media: 40, baixa: 40 }), DAY_CAP);
assertEqual(DAY_CAP, 110);
assertEqual(BONUS_CAP, 10);
assertEqual(todayKey(new Date('2026-10-28T02:30:00.000Z')), '2026-10-27');
assertEqual(todayKey(new Date('2026-10-28T03:00:00.000Z')), '2026-10-28');
assertEqual(dayScore({ alta: 10, media: 0, baixa: 0 }), 50);
assertEqual(dayScore({ alta: 1, media: 4, baixa: 4 }), 80);
assertEqual(dayScore({ alta: 0, media: 0, baixa: 0 }), 0);

const ranked: RankCompletion[] = [
  { habitId: 'a1', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'a1', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'a2', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm1', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm2', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm3', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm4', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b1', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b2', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b3', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b4', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'extra', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-06', completed: true },
  { habitId: 'sug', catalogHabitId: 'corpo-atividade', relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'off', catalogHabitId: null, relevance: null, occurredOn: '2026-10-05', completed: true },
  { habitId: 'old', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-09-30', completed: true },
];
assertEqual(scoreCompletions(ranked, '2026-10-05', '2026-10-12'), 120);
assertEqual(scoreCompletions(ranked, '2026-10-01', '2026-11-01'), 120);
assertEqual(scoreCompletions(ranked, '2026-01-01', '2027-01-01'), 125);
assertEqual(requirementGaps({ alta: 2, media: 4, baixa: 4 }).ready, true);
assertEqual(requirementGaps({ alta: 1, media: 4, baixa: 4 }).ready, false);
assertEqual(requirementGaps({ alta: 2, media: 3, baixa: 4 }).ready, false);
assertEqual(requirementGaps({ alta: 2, media: 4, baixa: 3 }).ready, false);
assertEqual(requirementGaps({ alta: 3, media: 4, baixa: 4 }).ready, true);
assertEqual(requirementGaps({ alta: 10, media: 0, baixa: 0 }).ready, false);
assertEqual(requirementGaps({ alta: 1, media: 4, baixa: 3 }).altaMissing, 1);
assertEqual(requirementGaps({ alta: 1, media: 4, baixa: 3 }).baixaMissing, 1);
assertEqual(requirementMessage({ alta: 1, media: 4, baixa: 4 }), 'Falta 1 hábito de relevância alta.');
assertEqual(
  requirementMessage({ alta: 0, media: 0, baixa: 3 }),
  'Faltam 2 hábitos de relevância alta, 4 hábitos de relevância média e 1 hábito de relevância baixa.',
);
assertEqual(isPersonalCatalogHabit('corpo-atividade'), true);
assertEqual(isPersonalCatalogHabit('manha-agua'), false);
assertEqual(isPersonalCatalogHabit(null), false);
assertEqual(scoreCompletions([
  { habitId: 'j1', catalogHabitId: 'manha-agua', relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
], '2026-10-05', '2026-10-12'), 5);
assertEqual(formatCirclePoints(102.5), '102,5');
assertEqual(formatCirclePoints(100), '100');
assertEqual(isOfficialTask('manha-agua'), true);
assertEqual(isOfficialTask('habito-pessoal'), false);
assertEqual(honorLabel('semana', 1, 'podium'), 'SEMANA NO PÓDIO');
assertEqual(honorLabel('semana', 3, 'podium'), 'SEMANAS NO PÓDIO');
assertEqual(honorLabel('mes', 2, 'first'), 'VEZES EM 1º LUGAR');

assertEqual(competitionRank([40, 40, 10, 10, 0]).join(','), '1,1,3,3,5');
assertEqual(competitionRank([0, 0]).join(','), '1,1');

const weekStart = '2026-10-05T03:00:00.000Z';
const weekFinish = '2026-10-12T03:00:00.000Z';
assertEqual(membershipOverlapsPeriod(weekStart, null, '2026-10-05', '2026-10-12'), true);
assertEqual(membershipOverlapsPeriod('2026-10-07T15:00:00.000Z', '2026-10-08T15:00:00.000Z', '2026-10-05', '2026-10-12'), true);
assertEqual(membershipOverlapsPeriod('2026-10-01T03:00:00.000Z', '2026-10-04T03:00:00.000Z', '2026-10-05', '2026-10-12'), false);
assertEqual(membershipOverlapsPeriod(weekFinish, null, '2026-10-05', '2026-10-12'), false);
assertEqual(membershipOverlapsPeriod('2026-10-11T12:00:00.000Z', null, '2026-10-05', '2026-10-12'), true);

assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10', relevance: 'alta', catalogHabitId: null }), true);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-09', today: '2026-10-10', relevance: 'alta', catalogHabitId: null }), false);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10', relevance: 'alta', catalogHabitId: 'mente-estudo' }), false);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10', relevance: null, catalogHabitId: null }), false);
assertEqual(completionCreatesEvent({ operation: 'update', completed: true, occurredOn: '2026-10-10', previousOccurredOn: '2026-10-09', today: '2026-10-10', relevance: 'media', catalogHabitId: null }), false);
assertEqual(completionCreatesEvent({ operation: 'update', completed: true, occurredOn: '2026-10-10', previousOccurredOn: '2026-10-10', today: '2026-10-10', relevance: 'media', catalogHabitId: null }), true);
assertEqual(completionRemovesEvent(false, false), true);
assertEqual(completionRemovesEvent(false, true), false);
assertEqual(achievementTotals([{ rank: 1, score: 0 }, { rank: 1, score: 20 }, { rank: 1, score: 20 }, { rank: 3, score: 10 }, { rank: 4, score: 10 }]).podiums, 3);
assertEqual(achievementTotals([{ rank: 1, score: 0 }, { rank: 1, score: 20 }, { rank: 1, score: 20 }, { rank: 3, score: 10 }, { rank: 4, score: 10 }]).firsts, 2);

assertEqual(publicHandleCandidate('Tiago Henrique', '11111111-1111-1111-1111-11111111abcd', new Set()), 'tiago-henrique');
assertEqual(publicHandleCandidate('Água', '11111111-1111-1111-1111-11111111abcd', new Set()), 'agua');
assertEqual(publicHandleCandidate('***', '11111111-1111-1111-1111-11111111abcd', new Set()), 'participante');
assertEqual(publicHandleCandidate('Tiago', '11111111-1111-1111-1111-11111111abcd', new Set(['tiago'])), 'tiago-abcd');

assertEqual(todayKey(new Date('2026-10-12T02:59:00.000Z')), '2026-10-11');
assertEqual(todayKey(new Date('2026-10-12T03:00:00.000Z')), '2026-10-12');
assertEqual(periodStart('semana', todayKey(new Date('2026-10-12T02:59:00.000Z'))), '2026-10-05');
assertEqual(periodStart('semana', todayKey(new Date('2026-10-12T03:00:00.000Z'))), '2026-10-12');
assertEqual(periodStart('mes', todayKey(new Date('2026-11-01T02:59:00.000Z'))), '2026-10-01');
assertEqual(periodStart('mes', todayKey(new Date('2026-11-01T03:00:00.000Z'))), '2026-11-01');
assertEqual(periodStart('ano', todayKey(new Date('2027-01-01T02:59:00.000Z'))), '2026-01-01');
assertEqual(periodStart('ano', todayKey(new Date('2027-01-01T03:00:00.000Z'))), '2027-01-01');

function place(position: number, userId = String(position), podiums = 0): CircleEntry {
  return { userId, name: `Pessoa ${position}`, handle: '', score: position, position, podiums, firsts: 0 };
}

const alone = [place(1, 'sozinho', 1)];
assertEqual(podiumSlots(alone).first?.userId, 'sozinho');
assertEqual(podiumSlots(alone).second, null);
assertEqual(podiumSlots(alone).third, null);
assertEqual(ordinalPlace(alone[0].position), '1º');

const many = Array.from({ length: 30 }, (_, index) => place(index + 1, index === 29 ? 'eu' : String(index + 1), index === 0 ? 2 : 0));
assertEqual(podiumSlots(many).first?.position, 1);
assertEqual(podiumSlots(many).second?.position, 2);
assertEqual(podiumSlots(many).third?.position, 3);
assertEqual(podiumSlots(many).first?.userId === 'eu', false);
assertEqual(ordinalPlace(1), '1º');
assertEqual(ordinalPlace(2), '2º');
assertEqual(ordinalPlace(3), '3º');
assertEqual(ordinalPlace(20), '20º');
assertEqual(ordinalPlace(30), '30º');
assertEqual(ordinalPlace(150), '150º');
assertEqual(showsPodiumTrophy(0), false);
assertEqual(showsPodiumTrophy(many[0].podiums), true);
assertEqual(showsPodiumTrophy(many[19].podiums), false);

const firstPage = visibleRanking(many, 20, 'eu');
assertEqual(firstPage.map((entry) => entry.position).join(','), '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,30');
assertEqual(firstPage.filter((entry) => entry.position <= 3).length, 3);
assertEqual(firstPage.filter((entry) => entry.userId === 'eu').length, 1);
const fullPage = visibleRanking(many, 30, 'eu');
assertEqual(fullPage.length, 30);
assertEqual(fullPage.filter((entry) => entry.userId === 'eu').length, 1);
assertEqual(fullPage.find((entry) => entry.userId === 'eu')?.position, 30);

for (const viewport of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
  const column = podiumColumnWidth(viewport);
  if (column > 460) {
    throw new Error(`coluna do ranking em ${viewport}`);
  }
  for (const count of [1, 2, 3] as const) {
    const widths = podiumCardWidths(viewport, count);
    const used = widths.first + widths.side * (count - 1) + 8 * (count - 1);
    if (used > column || widths.first > 220) {
      throw new Error(`pódio em ${viewport} com ${count}: ${used} de ${column}, primeiro ${widths.first}`);
    }
    if (count === 1 && widths.first < 148 && column >= 148) {
      throw new Error(`primeiro sozinho estreito em ${viewport}`);
    }
    if (count > 1 && (widths.first < widths.side || widths.side > 200 || widths.side < 72)) {
      throw new Error(`proporção em ${viewport} com ${count}: primeiro ${widths.first}, lateral ${widths.side}`);
    }
  }
}

const secondPlace = [place(1, 'lider'), place(2, 'eu', 1), place(3, 'terceiro')];
assertEqual(podiumSlots(secondPlace).second?.userId, 'eu');
assertEqual(podiumSlots(secondPlace).first?.userId, 'lider');
assertEqual(visibleRanking(secondPlace, 20, 'eu').filter((entry) => entry.userId === 'eu').length, 1);

function rankedHabits(alta: number, media: number, baixa: number, inactiveAlta = 0) {
  const rows = [];
  for (let index = 0; index < alta; index += 1) {
    rows.push({ id: `a${index}`, active: true, relevance: 'alta' as const, catalogHabitId: null });
  }
  for (let index = 0; index < media; index += 1) {
    rows.push({ id: `m${index}`, active: true, relevance: 'media' as const, catalogHabitId: null });
  }
  for (let index = 0; index < baixa; index += 1) {
    rows.push({ id: `b${index}`, active: true, relevance: 'baixa' as const, catalogHabitId: null });
  }
  for (let index = 0; index < inactiveAlta; index += 1) {
    rows.push({ id: `off${index}`, active: false, relevance: 'alta' as const, catalogHabitId: null });
  }
  return rows;
}

const balanced = rankingHabitCounts(rankedHabits(2, 4, 4));
assertEqual(requirementGaps(balanced).ready, true);
assertEqual(requirementGaps(rankingHabitCounts(rankedHabits(1, 4, 4))).ready, false);
assertEqual(requirementGaps(rankingHabitCounts(rankedHabits(2, 3, 4))).ready, false);
assertEqual(requirementGaps(rankingHabitCounts(rankedHabits(2, 4, 3))).ready, false);
assertEqual(requirementGaps(rankingHabitCounts(rankedHabits(3, 4, 4))).ready, true);
assertEqual(requirementGaps(rankingHabitCounts(rankedHabits(10, 0, 0))).ready, false);
const withInactive = rankingHabitCounts(rankedHabits(1, 4, 4, 1));
assertEqual(withInactive.alta + withInactive.media + withInactive.baixa, 9);
assertEqual(requirementGaps(withInactive).ready, false);
assertEqual(requirementGaps(rankingHabitCounts(rankedHabits(2, 4, 4, 6))).ready, true);
assertEqual(rankingHabitCounts([
  { id: 'dup', active: true, relevance: 'alta', catalogHabitId: null },
  { id: 'dup', active: true, relevance: 'alta', catalogHabitId: null },
  { id: 'water', active: true, relevance: 'baixa', catalogHabitId: 'corpo-hidratacao' },
  { id: 'suggested', active: true, relevance: 'alta', catalogHabitId: 'mente-estudo' },
  { id: 'legacy', active: true, relevance: null, catalogHabitId: null },
]).alta, 1);

const snapshot = [{ habitId: 'a', catalogHabitId: null, relevance: 'alta' as const, occurredOn: '2026-10-05', completed: true }];
assertEqual(scoreCompletions(snapshot, '2026-10-05', '2026-10-06'), 20);
assertEqual(scoreCompletions([{ ...snapshot[0], relevance: 'baixa' }], '2026-10-05', '2026-10-06'), 5);
assertEqual(scoreCompletions(snapshot, '2026-10-05', '2026-10-06'), 20);
assertEqual(scoreCompletions([
  { habitId: 'once', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'once', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
], '2026-10-05', '2026-10-06'), 10);

console.log('circle-ok');
