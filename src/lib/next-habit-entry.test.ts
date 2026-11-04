import { acknowledgeNextHabit, armIdleReminder, idleReminderPending, NEXT_HABIT_IDLE_MS, nextHabitEntryGeneration, noteHumanActivity, resetNextHabitEntry, shouldShowNextHabit } from '@/lib/next-habit-entry';
import { nextHabitCopy } from '@/lib/next-habit-copy';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const start = nextHabitEntryGeneration();
assertEqual(shouldShowNextHabit('ana'), true, 'primeira abertura');
acknowledgeNextHabit('ana');
assertEqual(shouldShowNextHabit('ana'), false, 'navegação interna não reabre');
assertEqual(shouldShowNextHabit('bia'), true, 'outra conta na mesma abertura');
resetNextHabitEntry();
assertEqual(nextHabitEntryGeneration() > start, true, 'logout abre nova geração');
assertEqual(shouldShowNextHabit('ana'), true, 'novo login mostra de novo');

const jiu = nextHabitCopy('Jiu-jitsu', 60);
assertEqual(jiu.question, 'JÁ FEZ ESSE HÁBITO HOJE?', 'pergunta única');
assertEqual(jiu.detail, 'Faça o seu treino e mantenha a constância no tatame.', 'texto do tatame');
const read = nextHabitCopy('Leitura', null);
assertEqual(read.question, 'JÁ FEZ ESSE HÁBITO HOJE?', 'pergunta de leitura');
assertEqual(read.detail, 'Estimule o foco e o aprendizado.', 'frase de leitura');
assertEqual(nextHabitCopy('Meditar 10 minutos', null).detail, 'Conecte-se, respire e mantenha o equilíbrio.', 'frase de meditação');
assertEqual(nextHabitCopy('Escovar os dentes', null).detail, 'Cuide da sua saúde e bem-estar.', 'frase de cuidado');
assertEqual(nextHabitCopy('Um nome bem longo para o hábito de foco profundo', 45).headline, 'UM NOME BEM LONGO PARA O HÁBITO DE FOCO PROFUNDO', 'nome longo');

acknowledgeNextHabit('ana', 1_000);
assertEqual(armIdleReminder('ana', 1_000 + 4 * 60 * 1000), false, 'antes de cinco minutos');
assertEqual(armIdleReminder('ana', 1_000 + NEXT_HABIT_IDLE_MS), true, 'cinco minutos');
assertEqual(idleReminderPending('ana'), true, 'inatividade pendente');
noteHumanActivity('ana', 9_000);
assertEqual(idleReminderPending('ana'), true, 'toque não cancela lembrete já devido');
assertEqual(armIdleReminder('ana', 9_000 + NEXT_HABIT_IDLE_MS), false, 'não duplica a mesma inatividade');
acknowledgeNextHabit('ana', 20_000);
assertEqual(shouldShowNextHabit('ana'), false, 'fechar não conta como nova entrada');
assertEqual(idleReminderPending('ana'), false, 'fechar reinicia a contagem');
assertEqual(armIdleReminder('ana', 20_000 + NEXT_HABIT_IDLE_MS), true, 'novo ciclo de cinco minutos');
noteHumanActivity('bia', 0);
assertEqual(armIdleReminder('bia', NEXT_HABIT_IDLE_MS), false, 'entrada ainda não consumida não arma inatividade');

console.log('next-habit-entry-ok');
