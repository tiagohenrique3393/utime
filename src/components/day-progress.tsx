import { StyleSheet, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { ui } from '@/constants/theme';

const CORE = '#F8F3EA';

const tones = {
  red: {
    line: '#C45148',
    lineShadow: '0 0 3px rgba(196, 81, 72, 0.28)',
    light: '0 0 2px 0.5px rgba(248, 243, 234, 0.95), 0 0 5px 1px rgba(196, 81, 72, 0.55), 0 0 10px 3px rgba(196, 81, 72, 0.22)',
  },
  gold: {
    line: '#E4C36A',
    lineShadow: '0 0 3px rgba(228, 195, 106, 0.26)',
    light: '0 0 2px 0.5px rgba(248, 243, 234, 0.95), 0 0 5px 1px rgba(228, 195, 106, 0.5), 0 0 10px 3px rgba(228, 195, 106, 0.2)',
  },
  green: {
    line: '#6AAA62',
    lineShadow: '0 0 3px rgba(106, 170, 98, 0.26)',
    light: '0 0 2px 0.5px rgba(248, 243, 234, 0.95), 0 0 5px 1px rgba(106, 170, 98, 0.5), 0 0 10px 3px rgba(106, 170, 98, 0.2)',
  },
} as const;

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
  const tone = toneFor(value);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}
      style={styles.rail}>
      {lit ? (
        <View
          style={[
            styles.fill,
            { width: `${value}%`, backgroundColor: tone.line, boxShadow: tone.lineShadow },
          ]}
        />
      ) : null}
      {lit ? (
        <View pointerEvents="none" style={[styles.anchor, { left: `${value}%` }]}>
          <View style={[styles.core, { boxShadow: tone.light }]} />
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
    backgroundColor: CORE,
  },
});
