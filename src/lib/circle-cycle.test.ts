import type { CircleEntry } from '@/lib/circle-api';
import { podiumSlots } from '@/lib/circle-rank';
import {
  achievementKey,
  achievementTotals,
  competedUntilEnd,
  eventInMembership,
  friendNotice,
  nextFriendRelation,
  periodEnd,
  periodStart,
  preferOfficialBoard,
  scoreInCycles,
  type RankCompletion,
} from '@/lib/circle';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const joined = '2026-10-30T10:00:00.000Z';
const left = '2026-10-30T15:00:00.000Z';
const returned = '2026-10-30T16:00:00.000Z';
assertEqual(eventInMembership('2026-10-30T11:00:00.000Z', joined, left), true, 'evento dentro do ciclo');
assertEqual(eventInMembership('2026-10-30T11:00:00.000Z', returned, null), false, 'evento anterior à volta não volta a pontuar');
assertEqual(eventInMembership(left, joined, left), false, 'instante da saída fica de fora');
assertEqual(eventInMembership(returned, returned, null), true, 'evento novo depois da volta entra');

const finish = '2026-11-02T03:00:00.000Z';
assertEqual(competedUntilEnd(null, finish), true, 'quem permanece concorre ao fechamento');
assertEqual(competedUntilEnd(finish, finish), true, 'saída no instante final ainda concluiu');
assertEqual(competedUntilEnd('2026-11-01T12:00:00.000Z', finish), false, 'quem saiu antes não leva pódio');

assertEqual(nextFriendRelation('none', 'add'), 'sent', 'pedido enviado');
assertEqual(nextFriendRelation('sent', 'add'), 'sent', 'segundo pedido não confirma');
assertEqual(nextFriendRelation('sent', 'accept'), 'sent', 'remetente não aceita o próprio pedido');
assertEqual(nextFriendRelation('received', 'add'), 'friend', 'novo pedido de quem recebeu confirma');
assertEqual(nextFriendRelation('received', 'accept'), 'friend', 'aceite confirma');
assertEqual(nextFriendRelation('received', 'decline'), 'none', 'recusa desfaz o pedido');
assertEqual(nextFriendRelation('friend', 'remove'), 'none', 'desfazer remove os dois lados');
assertEqual(nextFriendRelation('none', 'add') === 'friend', false, 'um lado só não vira amizade');
assertEqual(friendNotice('add', 'none'), 'Solicitação de amizade enviada.', 'aviso de envio');
assertEqual(friendNotice('accept', 'received'), 'Amizade confirmada!', 'aviso de aceite');
assertEqual(friendNotice('remove', 'friend'), 'Amizade desfeita.', 'aviso ao desfazer');

function row(day: string, recordedAt: string): RankCompletion & { recordedAt: string } {
  return { habitId: recordedAt, catalogHabitId: null, relevance: 'alta', occurredOn: day, completed: true, recordedAt };
}

const oldCycle = { joinedAt: joined, leftAt: left };
const newCycle = { joinedAt: returned, leftAt: null };
const weekStart = periodStart('semana', '2026-10-30');
const weekFinish = periodEnd('semana', weekStart);
assertEqual(scoreInCycles([row('2026-10-30', '2026-10-30T11:00:00.000Z')], [newCycle], weekStart, weekFinish), 0, 'volta no mesmo dia não reaproveita o check-in');
assertEqual(scoreInCycles([row('2026-10-30', '2026-10-30T18:00:00.000Z')], [newCycle], weekStart, weekFinish), 20, 'check-in novo depois da volta pontua');
assertEqual(scoreInCycles([row('2026-10-30', '2026-10-30T11:00:00.000Z')], [oldCycle], weekStart, weekFinish), 20, 'ciclo encerrado guarda os pontos daquele ciclo');

const october = [row('2026-10-30', '2026-10-30T12:00:00.000Z')];
const november = [row('2026-11-01', '2026-11-01T12:00:00.000Z')];
const crossing = [...october, ...november];
const open = [{ joinedAt: '2026-10-01T03:00:00.000Z', leftAt: null }];
const bridge = periodStart('semana', '2026-10-26');
assertEqual(bridge, '2026-10-26', 'semana de 26 de outubro');
assertEqual(periodEnd('semana', bridge), '2026-11-02', 'semana termina em 2 de novembro');
assertEqual(scoreInCycles(crossing, open, bridge, periodEnd('semana', bridge)), 40, 'semana atravessando o mês soma a semana inteira');
assertEqual(scoreInCycles(crossing, open, '2026-10-01', '2026-11-01'), 20, 'outubro não recebe novembro');
assertEqual(scoreInCycles(crossing, open, '2026-11-01', '2026-12-01'), 20, 'novembro não recebe outubro');

const yearBridge = periodStart('semana', '2026-12-28');
const yearEvents = [row('2026-12-31', '2026-12-31T12:00:00.000Z'), row('2027-01-01', '2027-01-01T12:00:00.000Z')];
assertEqual(scoreInCycles(yearEvents, open, yearBridge, periodEnd('semana', yearBridge)), 40, 'semana atravessando o ano soma a semana inteira');
assertEqual(scoreInCycles(yearEvents, open, '2026-01-01', '2027-01-01'), 20, 'ano de 2026 não recebe janeiro');
assertEqual(scoreInCycles(yearEvents, open, '2027-01-01', '2028-01-01'), 20, 'ano de 2027 não recebe dezembro');

const sameDay = achievementKey('semana', '2026-10-26', 'ana');
assertEqual(achievementKey('mes', '2026-10-01', 'ana') === sameDay, false, 'semana e mês no mesmo dia são conquistas distintas');
assertEqual(achievementTotals([{ rank: 1, score: 20 }, { rank: 1, score: 20 }]).firsts, 2, 'dois períodos não viram um primeiro lugar só');
assertEqual(achievementTotals([{ rank: 1, score: 0 }]).podiums, 0, 'pódio sem ponto não conta');

const stale = { at: '2026-10-30T12:00:00.000Z', score: 210 };
const older = { at: '2026-10-30T11:00:00.000Z', score: 230 };
const newer = { at: '2026-10-30T12:01:00.000Z', score: 230 };
const duplicate = { at: stale.at, score: 210 };
assertEqual(preferOfficialBoard(stale, older).score, 210, 'evento atrasado não substitui o placar oficial');
assertEqual(preferOfficialBoard(stale, newer).score, 230, 'placar mais novo substitui');
assertEqual(preferOfficialBoard(stale, duplicate), stale, 'evento repetido conserva o placar atual');

const tied: CircleEntry[] = [
  { userId: 'b', name: 'Bruno', handle: '', score: 40, position: 1, podiums: 0, firsts: 0 },
  { userId: 'a', name: 'Ana', handle: '', score: 40, position: 1, podiums: 0, firsts: 0 },
  { userId: 'c', name: 'Caio', handle: '', score: 10, position: 3, podiums: 0, firsts: 0 },
];
const slots = podiumSlots(tied);
assertEqual(slots.first?.position, 1, 'centro do empate continua em primeiro');
assertEqual(slots.second?.position, 1, 'empate não vira segundo lugar');
assertEqual(slots.third?.position, 3, 'o seguinte permanece na posição real');

console.log('circle-cycle-ok');
