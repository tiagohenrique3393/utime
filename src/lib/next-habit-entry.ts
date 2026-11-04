/**
 * O lembrete abre em cada entrada real: login, nova abertura ou recarregamento.
 * Também abre após cinco minutos sem interação humana, com a página visível.
 * Fechar ou concluir reinicia esses cinco minutos.
 * Uma inatividade já devida não abre vários lembretes e não é cancelada por
 * toques feitos enquanto outro modal ainda impede a exibição.
 * Não há trava diária em localStorage.
 */

export const NEXT_HABIT_IDLE_MS = 5 * 60 * 1000;

let generation = 1;
const consumed = new Map<string, number>();
const lastHuman = new Map<string, number>();
const idlePending = new Map<string, boolean>();

export function nextHabitEntryGeneration() {
  return generation;
}

export function shouldShowNextHabit(userId: string) {
  return consumed.get(userId) !== generation;
}

export function noteHumanActivity(userId: string, now = Date.now()) {
  if (!userId || idlePending.get(userId)) {
    return;
  }
  lastHuman.set(userId, now);
}

export function armIdleReminder(userId: string, now = Date.now(), idleMs = NEXT_HABIT_IDLE_MS) {
  if (!userId || shouldShowNextHabit(userId) || idlePending.get(userId)) {
    return false;
  }
  const last = lastHuman.get(userId);
  if (last == null || now - last < idleMs) {
    return false;
  }
  idlePending.set(userId, true);
  return true;
}

export function idleReminderPending(userId: string) {
  return idlePending.get(userId) === true;
}

export function acknowledgeNextHabit(userId: string, now = Date.now()) {
  consumed.set(userId, generation);
  lastHuman.set(userId, now);
  idlePending.set(userId, false);
}

export function resetNextHabitEntry() {
  generation += 1;
  consumed.clear();
  lastHuman.clear();
  idlePending.clear();
}
