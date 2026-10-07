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

  const size = Math.round(Math.min(Math.max(width * 0.82, 460), 980));
  const phone = width < 760;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top: phone ? -size * 0.16 : -size * 0.08,
        right: phone ? -size * 0.34 : -size * 0.06,
      }}>
      {node(
        'svg',
        {
          viewBox: '0 0 800 800',
          width: '100%',
          height: '100%',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block', background: 'none' },
        },
        node(
          'defs',
          null,
          node(
            'radialGradient',
            { id: 'hoje-dawn', cx: '50%', cy: '50%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#F4EFE6', stopOpacity: '0.55' }),
            node('stop', { offset: '28%', stopColor: '#E8C99B', stopOpacity: '0.16' }),
            node('stop', { offset: '62%', stopColor: '#E8C99B', stopOpacity: '0.04' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-sphere', cx: '46%', cy: '42%', r: '52%' },
            node('stop', { offset: '0%', stopColor: '#1A1612', stopOpacity: '1' }),
            node('stop', { offset: '58%', stopColor: '#0C0B09', stopOpacity: '1' }),
            node('stop', { offset: '84%', stopColor: '#070605', stopOpacity: '0.96' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-shade', cx: '68%', cy: '62%', r: '55%' },
            node('stop', { offset: '0%', stopColor: '#000000', stopOpacity: '0' }),
            node('stop', { offset: '70%', stopColor: '#000000', stopOpacity: '0.35' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0.72' }),
          ),
          node(
            'filter',
            { id: 'hoje-dawn-blur', x: '-60%', y: '-60%', width: '220%', height: '220%' },
            node('feGaussianBlur', { stdDeviation: '16' }),
          ),
        ),
        node('circle', { cx: 188, cy: 198, r: 96, fill: 'url(#hoje-dawn)', filter: 'url(#hoje-dawn-blur)' }),
        node('circle', { cx: 430, cy: 390, r: 286, fill: 'url(#hoje-sphere)' }),
        node('circle', { cx: 430, cy: 390, r: 286, fill: 'url(#hoje-shade)' }),
      )}
    </View>
  );
}
