import { createElement, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

export function HojePlanet() {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') {
    return null;
  }

  const pad = width >= 840 ? 32 : 22;
  const column = Math.min(Math.max(width - pad * 2, 0), 460);
  const origin = Math.max(0, (width - column) / 2);
  const planetWidth = Math.round(column * 0.92);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: origin + column * 0.22,
        width: planetWidth,
        height: 300,
      }}>
      {node(
        'svg',
        {
          viewBox: '0 0 360 320',
          width: '100%',
          height: '100%',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block', overflow: 'visible', background: 'none' },
        },
        node(
          'defs',
          null,
          node(
            'radialGradient',
            { id: 'hoje-body', cx: '58%', cy: '42%', r: '58%' },
            node('stop', { offset: '0%', stopColor: '#2A241C', stopOpacity: '0.72' }),
            node('stop', { offset: '42%', stopColor: '#14110E', stopOpacity: '0.5' }),
            node('stop', { offset: '78%', stopColor: '#000000', stopOpacity: '0.12' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-sun', cx: '50%', cy: '58%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#F8F3EA', stopOpacity: '0.7' }),
            node('stop', { offset: '14%', stopColor: '#E8C99B', stopOpacity: '0.32' }),
            node('stop', { offset: '40%', stopColor: '#E8C99B', stopOpacity: '0.07' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'linearGradient',
            { id: 'hoje-beam', x1: '0', y1: '1', x2: '0', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0.22' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-veil', cx: '70%', cy: '30%', r: '68%' },
            node('stop', { offset: '0%', stopColor: '#FFFFFF', stopOpacity: '1' }),
            node('stop', { offset: '48%', stopColor: '#FFFFFF', stopOpacity: '0.35' }),
            node('stop', { offset: '100%', stopColor: '#FFFFFF', stopOpacity: '0' }),
          ),
          node('mask', { id: 'hoje-veil-mask' }, node('rect', { width: '360', height: '320', fill: 'url(#hoje-veil)' })),
          node('filter', { id: 'hoje-soft', x: '-40%', y: '-40%', width: '180%', height: '180%' }, node('feGaussianBlur', { stdDeviation: '1.5' })),
        ),
        node(
          'g',
          { mask: 'url(#hoje-veil-mask)' },
          node('circle', { cx: 214, cy: 168, r: 132, fill: 'url(#hoje-body)' }),
          node('circle', { cx: 214, cy: 168, r: 128, stroke: 'rgba(232, 201, 155, 0.07)', strokeWidth: 1 }),
          node('path', {
            d: 'M120 150 Q214 118 308 156',
            stroke: 'rgba(232, 201, 155, 0.045)',
            strokeWidth: 1,
          }),
          node('path', {
            d: 'M132 188 Q214 156 300 196',
            stroke: 'rgba(243, 239, 232, 0.035)',
            strokeWidth: 1,
          }),
          node('path', {
            d: 'M150 214 Q220 190 286 222',
            stroke: 'rgba(232, 201, 155, 0.03)',
            strokeWidth: 1,
          }),
          node('ellipse', {
            cx: 188,
            cy: 52,
            rx: 34,
            ry: 9,
            fill: 'url(#hoje-sun)',
            filter: 'url(#hoje-soft)',
          }),
          node('path', {
            d: 'M188 50 V18',
            stroke: 'url(#hoje-beam)',
            strokeWidth: 1,
          }),
        ),
      )}
    </View>
  );
}
