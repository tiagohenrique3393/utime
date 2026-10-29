import { createElement, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { ExcellenceSpark } from '@/components/excellence-spark';
import { progressBandColor } from '@/lib/progress-color';
import { ringMetrics } from '@/lib/progress-ring';

export function PillarRing({
  size,
  percent,
  marker,
  children,
}: {
  size: number;
  percent: number;
  marker: string;
  children: ReactNode;
}) {
  const stroke = Math.max(3.5, size * 0.055);
  const pad = 10;
  const box = size + pad * 2;
  const radius = size / 2 + stroke / 2 + 1.5;
  const metrics = ringMetrics(percent, radius);
  const center = box / 2;
  const color = progressBandColor[metrics.band];
  const filterId = `pillar-glow-${marker}`;

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {Platform.OS === 'web'
        ? createElement(
            'svg',
            {
              width: box,
              height: box,
              viewBox: `0 0 ${box} ${box}`,
              'aria-hidden': true,
              style: { position: 'absolute', inset: 0 },
            },
            createElement(
              'defs',
              null,
              createElement(
                'filter',
                { id: filterId, x: '-40%', y: '-40%', width: '180%', height: '180%' },
                createElement('feGaussianBlur', { stdDeviation: '1.4', result: 'blur' }),
                createElement(
                  'feMerge',
                  null,
                  createElement('feMergeNode', { in: 'blur' }),
                  createElement('feMergeNode', { in: 'SourceGraphic' }),
                ),
              ),
            ),
            createElement('circle', {
              cx: center,
              cy: center,
              r: radius,
              fill: 'none',
              stroke: '#2A2826',
              strokeWidth: stroke,
            }),
            metrics.length > 0
              ? createElement('circle', {
                  cx: center,
                  cy: center,
                  r: radius,
                  fill: 'none',
                  stroke: color,
                  strokeWidth: stroke,
                  strokeLinecap: metrics.star ? 'butt' : 'round',
                  strokeDasharray: `${metrics.length} ${metrics.circumference}`,
                  transform: `rotate(-90 ${center} ${center})`,
                  filter: `url(#${filterId})`,
                })
              : null,
          )
        : (
          <View
            style={{
              position: 'absolute',
              width: radius * 2 + stroke,
              height: radius * 2 + stroke,
              borderRadius: radius + stroke,
              borderWidth: stroke,
              borderColor: metrics.length > 0 ? color : '#2A2826',
            }}
          />
        )}
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>{children}</View>
      {metrics.star ? (
        <View style={{ position: 'absolute', top: center - radius - 7, left: center - 8 }} pointerEvents="none">
          <ExcellenceSpark size={16} />
        </View>
      ) : null}
    </View>
  );
}
