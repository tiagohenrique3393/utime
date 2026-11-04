import { useEffect } from 'react';

let depth = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function modalGateOpen() {
  return depth > 0;
}

export function subscribeModalGate(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useModalGate(open: boolean) {
  useEffect(() => {
    if (!open) {
      return;
    }
    depth += 1;
    emit();
    return () => {
      depth = Math.max(0, depth - 1);
      emit();
    };
  }, [open]);
}
