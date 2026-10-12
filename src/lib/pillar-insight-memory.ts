import type { InsightSlot } from '@/lib/pillar-insights';

export type InsightMemory = {
  slots: Record<string, InsightSlot>;
};

const emptyMemory: InsightMemory = { slots: {} };

function storageKey(userId: string) {
  return `youtime.pillar-insights.${userId}`;
}

function parseMemory(raw: string | null): InsightMemory {
  if (!raw) {
    return { slots: {} };
  }
  try {
    const parsed = JSON.parse(raw) as InsightMemory;
    if (!parsed || typeof parsed !== 'object' || !parsed.slots || typeof parsed.slots !== 'object') {
      return { slots: {} };
    }
    const slots: Record<string, InsightSlot> = {};
    for (const [key, slot] of Object.entries(parsed.slots)) {
      if (!slot || typeof slot.signature !== 'string' || typeof slot.messageId !== 'string' || !Array.isArray(slot.seen)) {
        continue;
      }
      slots[key] = {
        signature: slot.signature,
        messageId: slot.messageId,
        seen: slot.seen.filter((item) => typeof item === 'string').slice(-80),
      };
    }
    return { slots };
  } catch {
    return { slots: {} };
  }
}

export function readInsightMemorySync(userId: string | null) {
  if (!userId || typeof localStorage === 'undefined') {
    return emptyMemory;
  }
  try {
    return parseMemory(localStorage.getItem(storageKey(userId)));
  } catch {
    return emptyMemory;
  }
}

export async function loadInsightMemory(userId: string | null) {
  if (!userId) {
    return emptyMemory;
  }
  const local = readInsightMemorySync(userId);
  if (Object.keys(local.slots).length > 0) {
    return local;
  }
  try {
    const storage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await storage.getItem(storageKey(userId));
    return parseMemory(raw);
  } catch {
    return local;
  }
}

export async function writeInsightMemory(userId: string | null, memory: InsightMemory) {
  if (!userId) {
    return;
  }
  const keys = Object.keys(memory.slots);
  const slots = keys.length <= 24 ? memory.slots : Object.fromEntries(keys.slice(-24).map((key) => [key, memory.slots[key]]));
  const payload = JSON.stringify({ slots });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey(userId), payload);
    }
  } catch {
    // Memória local indisponível: a seleção segue válida nesta sessão.
  }
  try {
    const storage = (await import('@react-native-async-storage/async-storage')).default;
    await storage.setItem(storageKey(userId), payload);
  } catch {
    // No nativo sem armazenamento, o histórico fica só na sessão.
  }
}
