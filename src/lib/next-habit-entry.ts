/**
 * Uma abertura do documento mostra o lembrete uma vez.
 * Fechar a aba ou o navegador recarrega este módulo e conta como nova entrada.
 * Navegar entre telas não recarrega o módulo, então o lembrete não reaparece.
 * Ficar em segundo plano também não reabre o modal.
 * O logout avança a geração para a próxima autenticação, na mesma aba, voltar a exibir.
 * Não há trava diária em localStorage.
 * Limitação: se o navegador restaurar a página sem recarregar o JavaScript, a mesma abertura continua valendo.
 */

let generation = 1;
const consumed = new Map<string, number>();

export function nextHabitEntryGeneration() {
  return generation;
}

export function shouldShowNextHabit(userId: string) {
  return consumed.get(userId) !== generation;
}

export function acknowledgeNextHabit(userId: string) {
  consumed.set(userId, generation);
}

export function resetNextHabitEntry() {
  generation += 1;
  consumed.clear();
}
