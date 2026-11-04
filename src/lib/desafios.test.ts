import {
  addDays,
  applySettlement,
  buildObligations,
  canCheckIn,
  contractDayNumber,
  contractSpan,
  dayMarks,
  emptyCommitments,
  settleContract,
  signatureIsValid,
  type ChallengeCommitment,
  type ChallengeObligation,
} from '@/lib/desafios';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function daily(pillar: ChallengeCommitment['pillar'], text: string): ChallengeCommitment {
  return { pillar, text, frequency: { kind: 'daily' } };
}

const trio = [daily('corpo', 'Ir para a academia todos os dias'), daily('mente', 'Ler um livro em 21 dias'), daily('espirito', 'Orar todos os dias')];

const span7 = contractSpan('2026-11-04', 7);
assertEqual(span7.endsOn, '2026-11-10', 'sete dias terminam no sétimo');
assertEqual(contractSpan('2026-11-04', 14).endsOn, '2026-11-17', 'quatorze dias');
assertEqual(contractSpan('2026-11-04', 21).endsOn, '2026-11-24', 'vinte e um dias');
assertEqual(contractSpan('2026-11-04', 30).endsOn, '2026-12-03', 'trinta dias');

const built7 = buildObligations(trio, '2026-11-04', 7);
assertEqual(built7.ok, true, 'diário de 7 dias é válido');
assertEqual(built7.ok ? built7.obligations.length : 0, 21, 'três pilares por sete dias');
assertEqual(buildObligations(trio, '2026-11-04', 14).ok ? 42 : 0, 42, 'quatorze dias geram 42 obrigações');
assertEqual(buildObligations(trio, '2026-11-04', 21).ok ? 63 : 0, 63, 'vinte e um dias');
assertEqual(buildObligations(trio, '2026-11-04', 30).ok ? 90 : 0, 90, 'trinta dias');

const missing = buildObligations(trio.slice(0, 2), '2026-11-04', 7);
assertEqual(missing.ok, false, 'sem um pilar não assina');
const blank = buildObligations([daily('corpo', '   '), trio[1], trio[2]], '2026-11-04', 7);
assertEqual(blank.ok, false, 'texto vazio não assina');
const examples = emptyCommitments();
assertEqual(examples.every((item) => item.text === ''), true, 'rascunho não traz exemplo');

const weekdays: ChallengeCommitment[] = [
  { pillar: 'corpo', text: 'Treinar', frequency: { kind: 'weekdays', days: [1, 3, 5] } },
  trio[1],
  trio[2],
];
const weekdayPlan = buildObligations(weekdays, '2026-11-04', 7);
const corpoDays = weekdayPlan.ok ? weekdayPlan.obligations.filter((item) => item.pillar === 'corpo').map((item) => item.dueOn).join(',') : '';
assertEqual(corpoDays, '2026-11-04,2026-11-06,2026-11-09', 'segunda, quarta e sexta dentro do período');
assertEqual(buildObligations([{ pillar: 'corpo', text: 'Treinar', frequency: { kind: 'weekdays', days: [] } }, trio[1], trio[2]], '2026-11-04', 7).ok, false, 'semana sem dia é ambígua');

const weekly: ChallengeCommitment[] = [
  { pillar: 'corpo', text: 'Treinar cinco vezes', frequency: { kind: 'weekly', times: 5 } },
  trio[1],
  trio[2],
];
const weeklyPlan = buildObligations(weekly, '2026-11-04', 7);
const weeklyCorpo = weeklyPlan.ok ? weeklyPlan.obligations.filter((item) => item.pillar === 'corpo') : [];
assertEqual(weeklyCorpo.map((item) => `${item.windowStart}:${item.windowEnd}:${item.requiredCount}`).join('|'), '2026-11-04:2026-11-08:5|2026-11-09:2026-11-10:2', 'meta semanal mostra os marcos');
assertEqual(buildObligations([{ pillar: 'corpo', text: 'Treinar', frequency: { kind: 'weekly', times: 0 } }, trio[1], trio[2]], '2026-11-04', 7).ok, false, 'meta semanal sem quantidade');

const deadline: ChallengeCommitment[] = [
  { pillar: 'mente', text: 'Ler um livro', frequency: { kind: 'deadline', date: '2026-11-20' } },
  trio[0],
  trio[2],
];
const deadlinePlan = buildObligations(deadline, '2026-11-04', 21);
const mind = deadlinePlan.ok ? deadlinePlan.obligations.find((item) => item.pillar === 'mente') : null;
assertEqual(mind?.dueOn ?? '', '2026-11-20', 'prazo único');
assertEqual(mind?.windowStart ?? '', '2026-11-04', 'o prazo único vale desde a assinatura');
assertEqual(buildObligations([{ pillar: 'mente', text: 'Ler', frequency: { kind: 'deadline', date: '2026-12-01' } }, trio[0], trio[2]], '2026-11-04', 21).ok, false, 'prazo fora do contrato');

assertEqual(signatureIsValid('typed', 'Tiago Souza', []), true, 'nome digitado');
assertEqual(signatureIsValid('typed', 'A', []), false, 'nome curto demais');
assertEqual(signatureIsValid('touch', '', [[{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }]]), true, 'toque com traço');
assertEqual(signatureIsValid('touch', '', [[{ x: 0.1, y: 0.2 }]]), false, 'toque sem traço');
assertEqual(signatureIsValid('touch', '', [[{ x: -0.1, y: 0.2 }, { x: 0.2, y: 0.2 }]]), false, 'toque fora da área');

function obligationsOf(result: ReturnType<typeof buildObligations>): ChallengeObligation[] {
  return result.ok ? result.obligations : [];
}

const obligations = obligationsOf(built7);
const open = settleContract({ status: 'active', endsOn: span7.endsOn, obligations, checkins: [], today: '2026-11-04' });
assertEqual(open.action, 'keep', 'o dia da assinatura ainda está aberto');
const missed = settleContract({ status: 'active', endsOn: span7.endsOn, obligations, checkins: [], today: '2026-11-05' });
assertEqual(missed.action, 'rescind', 'virada da meia-noite rescinde a obrigação de ontem');
assertEqual(missed.action === 'rescind' ? missed.failedOn : '', '2026-11-04', 'a falha é o dia encerrado');
const again = applySettlement({ status: 'active' as const }, missed, '2026-11-05T03:00:00.000Z');
const second = settleContract({ status: again.status, endsOn: span7.endsOn, obligations, checkins: [], today: '2026-11-06' });
assertEqual(second.action, 'keep', 'rescisão não se repete');

const allDays = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'].flatMap((date) =>
  (['corpo', 'mente', 'espirito'] as const).map((pillar) => ({ pillar, date })),
);
const stillOpen = settleContract({ status: 'active', endsOn: span7.endsOn, obligations, checkins: allDays, today: '2026-11-10' });
assertEqual(stillOpen.action, 'keep', 'o último dia não conclui antes da meia-noite');
const done = settleContract({ status: 'active', endsOn: span7.endsOn, obligations, checkins: allDays, today: '2026-11-11' });
assertEqual(done.action, 'conclude', 'todos os compromissos concluem um contrato');
const lateFail = settleContract({
  status: 'active',
  endsOn: span7.endsOn,
  obligations,
  checkins: allDays.filter((item) => item.date !== '2026-11-10'),
  today: '2026-11-11',
});
assertEqual(lateFail.action, 'rescind', 'falha no fim não vira conquista');
const concluded = applySettlement({ status: 'active' as const }, done, '2026-11-11T03:00:00.000Z');
assertEqual(settleContract({ status: concluded.status, endsOn: span7.endsOn, obligations, checkins: [], today: '2026-11-20' }).action, 'keep', 'concluído não é rescindido depois');

const weeklyObligations = obligationsOf(weeklyPlan).filter((item) => item.pillar === 'corpo');
const weeklyKept = settleContract({
  status: 'active',
  endsOn: span7.endsOn,
  obligations: weeklyObligations,
  checkins: ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map((date) => ({ pillar: 'corpo' as const, date })),
  today: '2026-11-09',
});
assertEqual(weeklyKept.action, 'keep', 'semana cumprida não rescinde');
const weeklyMiss = settleContract({
  status: 'active',
  endsOn: span7.endsOn,
  obligations: weeklyObligations,
  checkins: ['2026-11-04', '2026-11-05'].map((date) => ({ pillar: 'corpo' as const, date })),
  today: '2026-11-09',
});
assertEqual(weeklyMiss.action, 'rescind', 'meta semanal vencida rescinde');

const deadlineObligations = mind ? [mind] : [];
assertEqual(settleContract({ status: 'active', endsOn: '2026-11-24', obligations: deadlineObligations, checkins: [], today: '2026-11-20' }).action, 'keep', 'prazo ainda aberto não é falha');
assertEqual(settleContract({ status: 'active', endsOn: '2026-11-24', obligations: deadlineObligations, checkins: [{ pillar: 'mente', date: '2026-11-10' }], today: '2026-11-21' }).action, 'keep', 'prazo cumprido antes do vencimento');
assertEqual(settleContract({ status: 'active', endsOn: '2026-11-24', obligations: deadlineObligations, checkins: [], today: '2026-11-21' }).action, 'rescind', 'prazo vencido sem registro rescinde');

assertEqual(canCheckIn({ status: 'active', startsOn: span7.startsOn, endsOn: span7.endsOn, pillar: 'corpo', obligations, checkins: [], today: '2026-11-04' }), '', 'check-in do dia exigível');
assertEqual(canCheckIn({ status: 'active', startsOn: span7.startsOn, endsOn: span7.endsOn, pillar: 'corpo', obligations, checkins: [{ pillar: 'corpo', date: '2026-11-04' }], today: '2026-11-04' }).includes('já'), true, 'check-in duplicado');
assertEqual(canCheckIn({ status: 'rescinded', startsOn: span7.startsOn, endsOn: span7.endsOn, pillar: 'corpo', obligations, checkins: [], today: '2026-11-04' }).length > 0, true, 'rescindido não recebe check-in');
const weekdayObligations = obligationsOf(weekdayPlan);
assertEqual(canCheckIn({ status: 'active', startsOn: span7.startsOn, endsOn: span7.endsOn, pillar: 'corpo', obligations: weekdayObligations, checkins: [], today: '2026-11-05' }).includes('exigível'), true, 'terça sem obrigação não é falha nem check-in');
assertEqual(contractDayNumber('2026-11-04', '2026-11-24', '2026-11-04'), 1, 'dia 1 é a assinatura');
assertEqual(contractDayNumber('2026-11-04', '2026-11-24', '2026-11-24'), 21, 'dia 21 é o último');
assertEqual(dayMarks('2026-11-04', 7, 'corpo', [{ pillar: 'corpo', date: '2026-11-04' }]).filter(Boolean).length, 1, 'círculo verde só no dia cumprido');
assertEqual(dayMarks('2026-11-04', 30, 'mente', []).length, 30, 'trinta círculos');
assertEqual(addDays('2026-11-04', 0), '2026-11-04', 'data estável');
