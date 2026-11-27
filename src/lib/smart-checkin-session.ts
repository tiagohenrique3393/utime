/**
 * Uma geração por abertura/reabertura real do app.
 * Troca de aba NÃO cria nova geração.
 */

let generation = 1;
const consumed = new Map<string, number>();
let wasHidden = false;

export function smartCheckinGeneration() {
  return generation;
}

export function noteSmartCheckinSurface(visible: boolean) {
  if (!visible) {
    wasHidden = true;
    return;
  }
  if (wasHidden) {
    generation += 1;
    wasHidden = false;
  }
}

export function shouldRunSmartCheckin(userId: string) {
  return Boolean(userId) && consumed.get(userId) !== generation;
}

export function acknowledgeSmartCheckinWave(userId: string) {
  if (!userId) {
    return;
  }
  consumed.set(userId, generation);
}

export function resetSmartCheckinSession() {
  generation += 1;
  consumed.clear();
  wasHidden = false;
}
