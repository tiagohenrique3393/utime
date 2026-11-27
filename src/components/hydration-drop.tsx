import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/** Gota translúcida azul com nível de líquido proporcional ao progresso (0–100). */
export function HydrationDrop({ progress, size = 56 }: { progress: number; size?: number }) {
  const fill = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.native, { width: size, height: size * 1.15 }]}>
        <View style={[styles.nativeFill, { height: `${fill}%` }]} />
        <View style={styles.nativeShine} />
      </View>
    );
  }
  const id = `drop-${Math.round(fill)}-${Math.round(size)}`;
  const waterTop = 22 - (fill / 100) * 18;
  return createElement(
    'svg',
    { width: size, height: size * 1.15, viewBox: '0 0 40 46', 'aria-hidden': true },
    createElement(
      'defs',
      null,
      createElement(
        'clipPath',
        { id: `${id}-clip` },
        createElement('path', {
          d: 'M20 2.2C20 2.2 6.2 16.4 6.2 27.2a13.8 13.8 0 0 0 27.6 0C33.8 16.4 20 2.2 20 2.2z',
        }),
      ),
      createElement(
        'linearGradient',
        { id: `${id}-water`, x1: '0', y1: '0', x2: '0', y2: '1' },
        createElement('stop', { offset: '0%', stopColor: '#D8F2FF', stopOpacity: '0.98' }),
        createElement('stop', { offset: '42%', stopColor: '#6EB6F2', stopOpacity: '0.95' }),
        createElement('stop', { offset: '100%', stopColor: '#1E6FB8', stopOpacity: '0.98' }),
      ),
      createElement(
        'linearGradient',
        { id: `${id}-glass`, x1: '0', y1: '0', x2: '1', y2: '1' },
        createElement('stop', { offset: '0%', stopColor: 'rgba(180,220,255,0.35)' }),
        createElement('stop', { offset: '55%', stopColor: 'rgba(80,150,220,0.12)' }),
        createElement('stop', { offset: '100%', stopColor: 'rgba(30,90,160,0.22)' }),
      ),
      createElement(
        'radialGradient',
        { id: `${id}-glow`, cx: '50%', cy: '68%', r: '48%' },
        createElement('stop', { offset: '0%', stopColor: '#9AD4FF', stopOpacity: '0.55' }),
        createElement('stop', { offset: '100%', stopColor: '#1E6FB8', stopOpacity: '0' }),
      ),
    ),
    createElement('ellipse', {
      cx: 20,
      cy: 40,
      rx: 11,
      ry: 3.2,
      fill: 'rgba(40,120,190,0.28)',
    }),
    createElement('path', {
      d: 'M20 2.2C20 2.2 6.2 16.4 6.2 27.2a13.8 13.8 0 0 0 27.6 0C33.8 16.4 20 2.2 20 2.2z',
      fill: `url(#${id}-glass)`,
      stroke: '#9AD4FF',
      strokeWidth: 1.35,
      strokeLinejoin: 'round',
    }),
    fill > 0
      ? createElement('rect', {
          x: 5,
          y: waterTop,
          width: 30,
          height: 28,
          fill: `url(#${id}-water)`,
          clipPath: `url(#${id}-clip)`,
        })
      : null,
    fill > 8
      ? createElement('path', {
          d: `M8 ${waterTop + 1.2} Q14 ${waterTop - 1.4} 20 ${waterTop + 0.6} T32 ${waterTop + 1}`,
          fill: 'none',
          stroke: 'rgba(255,255,255,0.55)',
          strokeWidth: 1.1,
          strokeLinecap: 'round',
          clipPath: `url(#${id}-clip)`,
        })
      : null,
    createElement('circle', {
      cx: 14,
      cy: 18,
      r: 2.2,
      fill: 'rgba(255,255,255,0.42)',
      clipPath: `url(#${id}-clip)`,
    }),
    createElement('circle', {
      cx: 24,
      cy: 26,
      r: 1.3,
      fill: 'rgba(255,255,255,0.3)',
      clipPath: `url(#${id}-clip)`,
    }),
    createElement('path', {
      d: 'M13.4 10.2c2.2-2.8 4.4-4.2 5.2-4.5',
      fill: 'none',
      stroke: 'rgba(255,255,255,0.72)',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
    }),
    createElement('ellipse', {
      cx: 20,
      cy: 30,
      rx: 8,
      ry: 7,
      fill: `url(#${id}-glow)`,
      clipPath: `url(#${id}-clip)`,
      opacity: fill > 0 ? 0.85 : 0,
    }),
  );
}

const styles = StyleSheet.create({
  native: {
    borderRadius: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(110, 182, 242, 0.16)',
    borderWidth: 1.5,
    borderColor: '#9AD4FF',
    justifyContent: 'flex-end',
  },
  nativeFill: {
    width: '100%',
    backgroundColor: '#3B8FD9',
  },
  nativeShine: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 8,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
