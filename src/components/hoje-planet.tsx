import { createElement, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

export function HojePlanet() {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') {
    return null;
  }

  const phone = width < 760;
  const size = phone
    ? Math.round(Math.min(Math.max(width * 2.2, 760), 1040))
    : Math.round(Math.min(Math.max(width * 1.55, 980), 1320));
  const crest = phone ? height * 0.76 : height * 0.68;
  const top = Math.round(crest - size * 0.32);
  const left = Math.round((width - size) / 2);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top,
        left,
      }}>
      {node(
        'svg',
        {
          viewBox: '0 0 1000 1000',
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
            node('stop', { offset: '0%', stopColor: '#F7F1E6', stopOpacity: '0.85' }),
            node('stop', { offset: '28%', stopColor: '#E8C99B', stopOpacity: '0.42' }),
            node('stop', { offset: '58%', stopColor: '#C4A574', stopOpacity: '0.12' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-body', cx: '50%', cy: '42%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#100e0c', stopOpacity: '0' }),
            node('stop', { offset: '72%', stopColor: '#100e0c', stopOpacity: '0.04' }),
            node('stop', { offset: '88%', stopColor: '#2a241c', stopOpacity: '0.22' }),
            node('stop', { offset: '96%', stopColor: '#6d5e4c', stopOpacity: '0.42' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-limb', cx: '500', cy: '330', r: '120', gradientUnits: 'userSpaceOnUse' },
            node('stop', { offset: '0%', stopColor: '#F4EFE6', stopOpacity: '0.7' }),
            node('stop', { offset: '22%', stopColor: '#E8C99B', stopOpacity: '0.28' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'filter',
            { id: 'hoje-dawn-blur', x: '-80%', y: '-80%', width: '260%', height: '260%' },
            node('feGaussianBlur', { stdDeviation: '18' }),
          ),
          node(
            'filter',
            { id: 'hoje-limb-blur', x: '-20%', y: '-20%', width: '140%', height: '140%' },
            node('feGaussianBlur', { stdDeviation: '1.6' }),
          ),
          node(
            'mask',
            { id: 'hoje-occult' },
            node('rect', { width: '1000', height: '1000', fill: '#ffffff' }),
            node('circle', { cx: '500', cy: '620', r: '292', fill: '#000000' }),
          ),
        ),
        node(
          'g',
          { mask: 'url(#hoje-occult)' },
          node('circle', {
            cx: 500,
            cy: 330,
            r: 30,
            fill: 'url(#hoje-dawn)',
            filter: 'url(#hoje-dawn-blur)',
          }),
        ),
        node('circle', { cx: 500, cy: 620, r: 300, fill: 'url(#hoje-body)' }),
        node('path', {
          d: 'M206 620 A 294 294 0 0 0 794 620',
          stroke: 'url(#hoje-limb)',
          strokeWidth: 2.4,
          filter: 'url(#hoje-limb-blur)',
        }),
      )}
    </View>
  );
}
