import { insightLibrary } from '@/lib/pillar-insight-library';
import { bodyAssetKey, equilibriumDisplay, pointOnAxis, readPillarPeriod, weekdayOf } from '@/lib/pillar-balance';
import { adjustAdvice, eligibleInsights, selectInsight, type InsightFacts } from '@/lib/pillar-insights';
import { weekDateKeys, type HabitLog, type ProgressHabit } from '@/lib/progress-view';

function assertEqual<T>(actual: T, expected: T, label = '') {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${label} Esperado ${right}, obtido ${left}`);
  }
}

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(label);
  }
}

const habits: ProgressHabit[] = [
  { id: 'c', label: 'Praticar atividade física', pillar: 'corpo', catalogHabitId: 'corpo-atividade' },
  { id: 'm', label: 'Ler', pillar: 'mente', catalogHabitId: 'mente-leitura' },
  { id: 'e', label: 'Meditar ou refletir', pillar: 'espirito', catalogHabitId: 'espirito-meditacao' },
];

function log(dateKey: string, habitId: string, completed: boolean): HabitLog {
  return { dateKey, habitId, completed };
}

function days(keys: string[], habitId: string, completed: boolean) {
  return keys.map((key) => log(key, habitId, completed));
}

assertEqual(equilibriumDisplay([68, 52, 37]), 52, 'média 68/52/37');
assertEqual(equilibriumDisplay([0, 0, 0]), 0, 'média zero');
assertEqual(equilibriumDisplay([25, 25, 25]), 25, 'média 25');
assertEqual(equilibriumDisplay([50, 50, 50]), 50, 'média 50');
assertEqual(equilibriumDisplay([75, 75, 75]), 75, 'média 75');
assertEqual(equilibriumDisplay([100, 100, 100]), 100, 'média 100');
assertEqual(equilibriumDisplay([33.5, 33.5, 0.4]), 22, 'média precisa antes do arredondamento');
assertEqual(equilibriumDisplay([null, 80, 80]), null, 'pilar ausente');
assertEqual(equilibriumDisplay([0, null, 10]), null, 'não troca ausência por zero');
assertEqual(equilibriumDisplay([140, -20, 50]), 50, 'limites 0 e 100');

const center = { x: 100, y: 100 };
const vertex = { x: 100, y: 0 };
assertEqual(pointOnAxis(center, vertex, 0), { x: 100, y: 100 }, 'triângulo 0');
assertEqual(pointOnAxis(center, vertex, 25), { x: 100, y: 75 }, 'triângulo 25');
assertEqual(pointOnAxis(center, vertex, 50), { x: 100, y: 50 }, 'triângulo 50');
assertEqual(pointOnAxis(center, vertex, 75), { x: 100, y: 25 }, 'triângulo 75');
assertEqual(pointOnAxis(center, vertex, 100), { x: 100, y: 0 }, 'triângulo 100');
assertEqual(pointOnAxis(center, vertex, null), { x: 100, y: 100 }, 'triângulo sem dado');

assertEqual(bodyAssetKey('womantime'), 'womantime', 'WomanTime');
assertEqual(bodyAssetKey('metime'), 'mantime', 'ManTime');
assertEqual(bodyAssetKey(null), 'mantime', 'padrão masculino');

const today = '2026-10-14';
assertEqual(weekdayOf(today), 3, 'quarta');
assertEqual(weekDateKeys(today)[0], '2026-10-12', 'semana começa na segunda');

const currentDays = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'];
const logs: HabitLog[] = [
  ...days(currentDays, 'c', true),
  ...days(['2026-10-11', '2026-10-12'], 'm', true),
  ...days(['2026-10-13', '2026-10-14'], 'm', false),
  ...days(currentDays, 'e', false),
  log('2026-10-01', 'c', false),
  log('2026-10-01', 'm', true),
  log('2026-10-01', 'e', true),
  ...days(['2026-01-01', '2026-01-02', '2026-01-03'], 'm', true),
  ...days(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'], 'c', false),
  log('2026-10-10', 'c', true),
];

const week = readPillarPeriod({ today, period: 'semana', logs, habits });
assertEqual(week.current, { corpo: 100, mente: 33.33, espirito: 0 }, 'semana');
assertEqual(week.display, 44, 'equilíbrio da semana');
assertEqual(week.previous?.corpo, 0, 'semana anterior equivalente ignora dia futuro');

const month = readPillarPeriod({ today, period: 'mes', logs, habits });
assertEqual(month.current.corpo, 50, 'mês corpo');
assertEqual(month.current.mente, 60, 'mês mente');
assertEqual(month.current.espirito, 20, 'mês espírito');
assertEqual(month.display, 43, 'equilíbrio do mês');
assert(month.display !== week.display, 'mês não copia a semana');

const year = readPillarPeriod({ today, period: 'ano', logs, habits });
assert(year.current.mente !== week.current.mente, 'ano difere da semana');
assert(year.display !== week.display, 'equilíbrio do ano usa o próprio período');

const empty = readPillarPeriod({ today, period: 'semana', logs: [], habits: [] });
assertEqual(empty.current, { corpo: null, mente: null, espirito: null }, 'sem registros');
assertEqual(empty.display, null, 'sem média inventada');
assertEqual(empty.recordedDays, 0, 'sem dias');

const zeros = readPillarPeriod({
  today,
  period: 'semana',
  logs: [...days(currentDays, 'c', false), ...days(currentDays, 'm', false), ...days(currentDays, 'e', false)],
  habits,
});
assertEqual(zeros.current, { corpo: 0, mente: 0, espirito: 0 }, 'zeros reais');
assertEqual(zeros.display, 0, 'média zero real');

const withToday = readPillarPeriod({
  today,
  period: 'semana',
  logs,
  habits,
  todayHabits: [
    { id: 'c', label: 'Praticar atividade física', pillar: 'corpo', catalogHabitId: 'corpo-atividade', done: true },
    { id: 'm', label: 'Ler', pillar: 'mente', catalogHabitId: 'mente-leitura', done: true },
    { id: 'e', label: 'Meditar ou refletir', pillar: 'espirito', catalogHabitId: 'espirito-meditacao', done: true },
  ],
});
assertEqual(withToday.current.espirito, 33.33, 'hábito de hoje substitui o registro do dia');

const categories = new Set(insightLibrary.map((item) => item.category));
assert(insightLibrary.length >= 120, `biblioteca com ${insightLibrary.length} mensagens`);
assertEqual(categories.size, 17, 'categorias');
assertEqual(new Set(insightLibrary.map((item) => item.id)).size, insightLibrary.length, 'ids únicos');
assert(insightLibrary.every((item) => item.insight.length > 20 && item.action.length > 8 && item.periods.length > 0), 'mensagens completas');

function facts(partial: Partial<InsightFacts> & Pick<InsightFacts, 'current'>): InsightFacts {
  return {
    period: 'semana',
    previous: null,
    partial: true,
    recordedDays: 4,
    habits: { corpo: 1, mente: 1, espirito: 1 },
    ...partial,
  };
}

const missing = facts({ current: { corpo: null, mente: null, espirito: null }, recordedDays: 0, habits: { corpo: 0, mente: 0, espirito: 0 } });
const missingPick = selectInsight(missing, null);
assertEqual(missingPick.message.category, 'dados-insuficientes', 'sem dados');
assert(!/você falhou|fracasso/i.test(missingPick.message.insight), 'sem culpa');

const start = facts({ current: { corpo: 0, mente: 0, espirito: 0 }, recordedDays: 2 });
assertEqual(selectInsight(start, null).message.category, 'inicio', 'início');

const gapFacts = facts({ current: { corpo: 80, mente: 40, espirito: 38 } });
const gapPick = selectInsight(gapFacts, null);
assertEqual(gapPick.message.category, 'desequilibrio', 'desequilíbrio');
assert(/Corpo/.test(gapPick.message.insight) && /Espírito/.test(gapPick.message.insight), 'cita os pilares reais');
assert(!eligibleInsights(gapFacts).some((item) => item.category === 'equilibrados'), 'não chama equilíbrio');
const again = selectInsight(gapFacts, gapPick.slot);
assertEqual(again.message.id, gapPick.message.id, 'não troca sem mudança');
assertEqual(again.changed, false, 'memória estável');
const moved = selectInsight(facts({ current: { corpo: 80, mente: 52, espirito: 50 } }), gapPick.slot);
assert(moved.message.id !== gapPick.message.id, 'muda quando o dado muda');

const balanced = facts({ current: { corpo: 70, mente: 68, espirito: 72 } });
assertEqual(selectInsight(balanced, null).message.category, 'equilibrados', 'equilíbrio');

const high = facts({ current: { corpo: 100, mente: 100, espirito: 100 } });
assertEqual(selectInsight(high, null).message.category, 'conquistas', 'marco');

const recovery = facts({
  current: { corpo: 50, mente: 50, espirito: 50 },
  previous: { corpo: 30, mente: 30, espirito: 30 },
});
assertEqual(selectInsight(recovery, null).message.category, 'recuperacao', 'recuperação');

const two = facts({
  current: { corpo: 50, mente: 50, espirito: 35 },
  previous: { corpo: 40, mente: 40, espirito: 40 },
});
assertEqual(selectInsight(two, null).message.id, 'dois-03', 'dois pilares à frente');

const daily = facts({ period: 'dia', current: { corpo: 40, mente: 80, espirito: 70 }, recordedDays: 1, partial: false });
const dailyPick = selectInsight(daily, null);
assertEqual(dailyPick.message.category, 'orientacao-diaria', 'arquitetura do dia');
assert(!eligibleInsights(daily).some((item) => item.periods.length === 1 && item.periods[0] === 'semana'), 'dia não usa reflexão semanal exclusiva');

const body = adjustAdvice('corpo', []);
assertEqual(body, 'Comece com um cuidado simples do corpo.', 'orientação inicial');
const move = adjustAdvice('corpo', [{ pillar: 'corpo', label: 'Praticar atividade física', catalogHabitId: 'corpo-atividade', doneToday: false }]);
assertEqual(move, 'Retome um hábito de movimento.', 'hábito real');
assert(!move.includes('Construa mais hábitos'), 'não pede hábito genérico');
const done = adjustAdvice('mente', [{ pillar: 'mente', label: 'Ler', catalogHabitId: 'mente-leitura', doneToday: true }]);
assertEqual(done, 'O essencial de hoje neste pilar já foi feito.', 'hoje concluído');

console.log(`pilares-ok ${insightLibrary.length}`);
