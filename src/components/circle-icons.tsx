import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { circlePalette } from '@/components/circle-palette';

type MarkName = 'crown' | 'trophy' | 'star' | 'search' | 'info' | 'plus' | 'share' | 'chevron' | 'chevronLeft' | 'check' | 'group';

const stroke = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function webMark(name: MarkName, size: number, color: string) {
  const common = { ...stroke, stroke: color, strokeWidth: 1.6 };
  let body = null;
  if (name === 'crown') {
    body = [
      createElement('path', {
        key: 'peaks',
        d: 'M2.6 16.6 6.1 8.4 9.3 12.8 12 3.4 14.7 12.8 17.9 8.4 21.4 16.6Z',
        fill: color,
        stroke: color,
        strokeLinejoin: 'round',
        strokeWidth: 0.6,
      }),
      createElement('path', { key: 'base', d: 'M3.2 17.6h17.6v2.5H3.2Z', fill: color }),
      createElement('circle', { key: 'l', cx: 6.1, cy: 7.6, r: 1.15, fill: color }),
      createElement('circle', { key: 'c', cx: 12, cy: 3.1, r: 1.25, fill: color }),
      createElement('circle', { key: 'r', cx: 17.9, cy: 7.6, r: 1.15, fill: color }),
    ];
  } else if (name === 'star') {
    body = createElement('path', {
      d: 'm12 3.2 2.4 5.2 5.7.6-4.3 3.8 1.3 5.6L12 15.6 7 18.4l1.2-5.6L3.9 9l5.7-.6L12 3.2Z',
      fill: color,
      stroke: color,
      strokeWidth: 0.6,
      strokeLinejoin: 'round',
    });
  } else if (name === 'trophy') {
    const cup = { ...common, strokeWidth: 1.7 };
    body = [
      createElement('path', { key: 'cup', d: 'M7 3.5h10v6.2a5 5 0 0 1-10 0V3.5Z', ...cup }),
      createElement('path', { key: 'left', d: 'M7 5.4H5a2.3 2.3 0 0 0 0 4.6H7', ...cup }),
      createElement('path', { key: 'right', d: 'M17 5.4h2a2.3 2.3 0 0 1 0 4.6H17', ...cup }),
      createElement('path', { key: 'stem', d: 'M12 14.7v3.1', ...cup }),
      createElement('path', { key: 'base', d: 'M8.2 20.2h7.6', ...cup }),
    ];
  } else if (name === 'search') {
    body = [
      createElement('circle', { key: 'lens', cx: 10.5, cy: 10.5, r: 5.2, ...common }),
      createElement('path', { key: 'handle', d: 'm14.4 14.4 5 5', ...common }),
    ];
  } else if (name === 'info') {
    body = [
      createElement('circle', { key: 'ring', cx: 12, cy: 12, r: 8, ...common }),
      createElement('path', { key: 'stem', d: 'M12 10.8v5.2', ...common, strokeWidth: 1.8 }),
      createElement('circle', { key: 'dot', cx: 12, cy: 7.6, r: 1, fill: color, stroke: 'none' }),
    ];
  } else if (name === 'plus') {
    body = createElement('path', { d: 'M12 6v12M6 12h12', ...common, strokeWidth: 1.7 });
  } else if (name === 'share') {
    body = [
      createElement('circle', { key: 'a', cx: 6.5, cy: 12, r: 2.1, ...common }),
      createElement('circle', { key: 'b', cx: 17.2, cy: 6.4, r: 2.1, ...common }),
      createElement('circle', { key: 'c', cx: 17.2, cy: 17.6, r: 2.1, ...common }),
      createElement('path', { key: 'lines', d: 'm8.3 11 7-3.6M8.3 13.1l7 3.5', ...common }),
    ];
  } else if (name === 'check') {
    body = createElement('path', { d: 'm5 12.5 4.2 4.2L19 7.5', ...common, strokeWidth: 1.8 });
  } else if (name === 'chevronLeft') {
    body = createElement('path', { d: 'm14.5 5-7 7 7 7', ...common, strokeWidth: 1.7 });
  } else if (name === 'group') {
    body = [
      createElement('circle', { key: 'l', cx: 6.4, cy: 9.2, r: 1.7, ...common, strokeWidth: 1.4 }),
      createElement('path', { key: 'lb', d: 'M3.6 16.2c.4-2 1.4-3 2.8-3s2.4 1 2.8 3', ...common, strokeWidth: 1.4 }),
      createElement('circle', { key: 'c', cx: 12, cy: 7.6, r: 2, ...common, strokeWidth: 1.4 }),
      createElement('path', { key: 'cb', d: 'M8.6 16.4c.5-2.5 1.8-3.7 3.4-3.7s2.9 1.2 3.4 3.7', ...common, strokeWidth: 1.4 }),
      createElement('circle', { key: 'r', cx: 17.6, cy: 9.2, r: 1.7, ...common, strokeWidth: 1.4 }),
      createElement('path', { key: 'rb', d: 'M14.8 16.2c.4-2 1.4-3 2.8-3s2.4 1 2.8 3', ...common, strokeWidth: 1.4 }),
    ];
  } else {
    body = createElement('path', { d: 'm9.5 5 7 7-7 7', ...common, strokeWidth: 1.7 });
  }
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    body,
  );
}

function nativeMark(name: MarkName, size: number, color: string) {
  if (name === 'search') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={[styles.lens, { borderColor: color, width: size * 0.62, height: size * 0.62, borderRadius: size }]} />
        <View style={[styles.handle, { backgroundColor: color, width: size * 0.34 }]} />
      </View>
    );
  }
  if (name === 'plus') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.plusBar, { backgroundColor: color, width: size * 0.62, height: 1.5 }]} />
        <View style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: color, height: size * 0.62, width: 1.5 }]} />
      </View>
    );
  }
  if (name === 'star' || name === 'crown' || name === 'trophy') {
    return <View style={[styles.gem, { borderColor: color, width: size * 0.72, height: size * 0.72 }]} />;
  }
  return <View style={[styles.tick, { borderColor: color, width: size * 0.45, height: size * 0.45 }]} />;
}

export function CircleMark({ name, size = 16, color = circlePalette.champagne }: { name: MarkName; size?: number; color?: string }) {
  if (Platform.OS === 'web') {
    return webMark(name, size, color);
  }
  return nativeMark(name, size, color);
}

const styles = StyleSheet.create({
  lens: {
    position: 'absolute',
    top: 1,
    left: 1,
    borderWidth: 1.5,
  },
  handle: {
    position: 'absolute',
    height: 1.5,
    right: 0,
    bottom: 2,
    transform: [{ rotate: '45deg' }],
  },
  plusBar: {
    position: 'absolute',
  },
  plusBarVertical: {
    transform: [{ rotate: '90deg' }],
  },
  gem: {
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  tick: {
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
});
