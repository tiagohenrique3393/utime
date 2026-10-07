import { StyleSheet, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { ui } from '@/constants/theme';

const CORE = '#F8F3EA';

const tones = {
  red: {
    line: '#7C403C',
    glow: 'rgba(124, 64, 60, 0.55)',
    lineShadow: '0 0 3px rgba(124, 64, 60, 0.28)',
    light: '0 0 2px 0.5px rgba(248, 243, 234, 0.9), 0 0 5px 1px rgba(124, 64, 60, 0.4)',
  },
  gold: {
    line: '#C6AE86',
    glow: 'rgba(198, 174, 134, 0.45)',
    lineShadow: '0 0 3px rgba(198, 174, 134, 0.28)',
    light: '0 0 2px 0.5px rgba(248, 243, 234, 0.9), 0 0 5px 1px rgba(198, 174, 134, 0.4)',
  },
  green: {
    line: '#3E6848',
    glow: 'rgba(62, 104, 72, 0.5)',
    lineShadow: '0 0 3px rgba(62, 104, 72, 0.28)',
    light: '0 0 2px 0.5px rgba(248, 243, 234, 0.9), 0 0 5px 1px rgba(62, 104, 72, 0.4)',
  },
} as const;

export function progressTone(percent: number) {
  if (percent < 1) {
    return null;
  }
  const tone = toneFor(percent);
  return { line: tone.line, glow: tone.glow };
}

function toneFor(percent: number) {
  if (percent >= 70) {
    return tones.green;
  }
  if (percent >= 50) {
    return tones.gold;
  }
  return tones.red;
}

export function DayProgress({ percent }: { percent: number }) {
  const reduced = useReducedMotion();
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const [value = 0] = useSettledNumbers([safe], reduced);
  const lit = value >= 0.5;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}
      style={styles.rail}>
      {lit ? <View style={[styles.fill, { width: `${value}%` }]} /> : null}
      {lit ? (
        <View pointerEvents="none" style={[styles.anchor, { left: `${value}%` }]}>
          <View style={styles.core} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: 2,
    borderRadius: 1,
    backgroundColor: ui.track,
    overflow: 'visible',
  },
  fill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#E4D2B0',
    boxShadow: '0 0 4px rgba(228, 210, 176, 0.28)',
  },
  anchor: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 2,
  },
  core: {
    position: 'absolute',
    width: 3,
    height: 3,
    left: -1.5,
    top: -0.5,
    borderRadius: 2,
    backgroundColor: CORE,
    boxShadow: '0 0 2px 0.5px rgba(248, 243, 234, 0.9), 0 0 6px 2px rgba(228, 210, 176, 0.32)',
  },
});
