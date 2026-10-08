import { StyleSheet, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { ui } from '@/constants/theme';
import { getProgressColor, type ProgressBand } from '@/lib/progress-color';

const tones = {
  red: {
    line: '#E15A4C',
    core: '#F4D2CC',
    glow: 'rgba(225, 90, 76, 0.7)',
    lineShadow: '0 0 4px rgba(225, 90, 76, 0.55)',
    light: '0 0 2px 0.5px rgba(244, 210, 204, 0.95), 0 0 6px 1px rgba(225, 90, 76, 0.65)',
  },
  gold: {
    line: '#E4C36A',
    core: '#F8F0D2',
    glow: 'rgba(228, 195, 106, 0.7)',
    lineShadow: '0 0 4px rgba(228, 195, 106, 0.5)',
    light: '0 0 2px 0.5px rgba(248, 240, 210, 0.95), 0 0 6px 1px rgba(228, 195, 106, 0.65)',
  },
  green: {
    line: '#5FCB68',
    core: '#DDF6DF',
    glow: 'rgba(95, 203, 104, 0.72)',
    lineShadow: '0 0 4px rgba(95, 203, 104, 0.55)',
    light: '0 0 2px 0.5px rgba(221, 246, 223, 0.95), 0 0 6px 1px rgba(95, 203, 104, 0.65)',
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
  const band: ProgressBand = getProgressColor(percent);
  if (band === 'green') {
    return tones.green;
  }
  if (band === 'yellow') {
    return tones.gold;
  }
  return tones.red;
}

export function DayProgress({ percent }: { percent: number }) {
  const reduced = useReducedMotion();
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const [value = 0] = useSettledNumbers([safe], reduced);
  const lit = value >= 0.5;
  const tone = toneFor(safe);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}
      style={styles.rail}>
      {lit ? (
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: tone.line, boxShadow: tone.lineShadow }]} />
      ) : null}
      {lit ? (
        <View pointerEvents="none" style={[styles.anchor, { left: `${value}%` }]}>
          <View style={[styles.core, { backgroundColor: tone.core, boxShadow: tone.light }]} />
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
  },
});
