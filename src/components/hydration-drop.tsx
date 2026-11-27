import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/** Gota translúcida azul com nível de líquido proporcional ao progresso (0–100). */
export function HydrationDrop({ progress, size = 44 }: { progress: number; size?: number }) {
  const fill = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.native, { width: size, height: size }]}>
        <View style={[styles.nativeFill, { height: `${fill}%` }]} />
      </View>
    );
  }
  const id = `drop-fill-${Math.round(fill)}-${size}`;
  const waterY = 14 - (fill / 100) * 12;
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement(
      'defs',
      null,
      createElement(
        'clipPath',
        { id },
        createElement('path', {
          d: 'M12 2.2C12 2.2 4.8 10.2 4.8 15.2a7.2 7.2 0 0 0 14.4 0C19.2 10.2 12 2.2 12 2.2z',
        }),
      ),
      createElement(
        'linearGradient',
        { id: `${id}-g`, x1: '0', y1: '0', x2: '0', y2: '1' },
        createElement('stop', { offset: '0%', stopColor: '#B7E4FF', stopOpacity: '0.95' }),
        createElement('stop', { offset: '100%', stopColor: '#3B8FD9', stopOpacity: '0.92' }),
      ),
    ),
    createElement('path', {
      d: 'M12 2.2C12 2.2 4.8 10.2 4.8 15.2a7.2 7.2 0 0 0 14.4 0C19.2 10.2 12 2.2 12 2.2z',
      fill: 'rgba(110, 182, 242, 0.18)',
      stroke: '#7EC4F5',
      strokeWidth: 1.2,
      strokeLinejoin: 'round',
    }),
    createElement('rect', {
      x: 4,
      y: waterY,
      width: 16,
      height: 18,
      fill: `url(#${id}-g)`,
      clipPath: `url(#${id})`,
      opacity: fill > 0 ? 1 : 0,
    }),
    createElement('path', {
      d: 'M9.2 8.8c1.2-1.6 2.4-2.4 2.8-2.6',
      fill: 'none',
      stroke: 'rgba(255,255,255,0.55)',
      strokeWidth: 1.1,
      strokeLinecap: 'round',
    }),
  );
}

const styles = StyleSheet.create({
  native: {
    borderRadius: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(110, 182, 242, 0.18)',
    borderWidth: 1,
    borderColor: '#7EC4F5',
    justifyContent: 'flex-end',
  },
  nativeFill: {
    width: '100%',
    backgroundColor: '#3B8FD9',
  },
});
