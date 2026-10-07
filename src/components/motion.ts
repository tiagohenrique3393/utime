import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(query.matches);
      const onChange = () => {
        if (active) {
          setReduced(query.matches);
        }
      };
      query.addEventListener('change', onChange);
      return () => {
        active = false;
        query.removeEventListener('change', onChange);
      };
    }

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active) {
        setReduced(value);
      }
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) {
          setReduced(value);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

export function useSettledNumbers(values: readonly number[], reduced: boolean) {
  const [shown, setShown] = useState<number[]>(() => [...values]);
  const shownRef = useRef(shown);
  const targetRef = useRef(values);
  const ready = useRef(false);
  targetRef.current = values;
  const key = values.join(',');

  useEffect(() => {
    const target = [...targetRef.current];
    if (!ready.current || reduced || typeof requestAnimationFrame !== 'function') {
      ready.current = true;
      shownRef.current = target;
      setShown(target);
      return;
    }

    const from = shownRef.current.length === target.length ? [...shownRef.current] : [...target];
    const start = Date.now();
    let frame = 0;

    const step = () => {
      const progress = Math.min(1, (Date.now() - start) / 460);
      const ease = 1 - (1 - progress) ** 2;
      const next = target.map((value, index) => from[index] + (value - from[index]) * ease);
      shownRef.current = next;
      setShown(next);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, reduced]);

  return shown;
}
