import { createElement } from 'react';
import { Platform, View } from 'react-native';

const up = 'M16 1.2 11 8.4h3.2V13h3.6V8.4H21z';
const down = 'M16 74.8 11 67.6h3.2V63h3.6v4.6H21z';

export function DragHand({ reduced }: { reduced: boolean }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return createElement(
    'div',
    {
      className: reduced ? undefined : 'utime-drag-hand',
      'aria-hidden': true,
      style: { width: 32, height: 76, pointerEvents: 'none' },
    },
    createElement(
      'svg',
      { width: 32, height: 76, viewBox: '0 0 32 76', fill: 'none' },
      createElement('path', { d: up, fill: '#E8C99B' }),
      createElement('circle', { cx: 11, cy: 38, r: 7.2, fill: '#F7F4EC', stroke: '#E8C99B', strokeWidth: 1.3 }),
      createElement('rect', { x: 15, y: 34.2, width: 14, height: 6.4, rx: 3.2, fill: '#F7F4EC', stroke: '#E8C99B', strokeWidth: 1.3 }),
      createElement('path', { d: down, fill: '#E8C99B' }),
    ),
  );
}

export function DragHandStyle() {
  if (Platform.OS !== 'web') {
    return null;
  }
  return createElement(
    'style',
    null,
    '@keyframes utime-drag-hand{0%,100%{transform:translateY(-5px)}50%{transform:translateY(6px)}}.utime-drag-hand{animation:utime-drag-hand 1.6s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.utime-drag-hand{animation:none}}',
  );
}

export function DragHandSlot({ reduced }: { reduced: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 78, zIndex: 5, width: 32, height: 76 }}>
      <DragHand reduced={reduced} />
    </View>
  );
}
