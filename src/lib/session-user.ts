import { useSyncExternalStore } from 'react';

let sessionUserId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSessionUser(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionUserId() {
  return sessionUserId;
}

export function setSessionUserId(userId: string | null) {
  if (sessionUserId === userId) {
    return;
  }
  sessionUserId = userId;
  emit();
}

export function useSessionUserId() {
  return useSyncExternalStore(subscribeSessionUser, getSessionUserId, () => null);
}
