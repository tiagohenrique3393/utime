import { createElement, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { circlePalette as ink } from '@/components/circle-palette';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

const gold = ink.champagne;

export function BulbIcon({ size = 16 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: gold }} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('path', {
      d: 'M9 18.2h6M9.6 21h4.8M12 3.2a6.2 6.2 0 0 0-3.3 11.4c.5.4.8 1 .8 1.6v.6h5v-.6c0-.6.3-1.2.8-1.6A6.2 6.2 0 0 0 12 3.2z',
      fill: 'none',
      stroke: gold,
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

export function TargetIcon({ size = 16 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: gold }} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('circle', { cx: 12, cy: 12, r: 7.2, fill: 'none', stroke: gold, strokeWidth: 1.4 }),
    node('circle', { cx: 12, cy: 12, r: 3.1, fill: 'none', stroke: gold, strokeWidth: 1.4 }),
    node('path', { d: 'M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4', stroke: gold, strokeWidth: 1.4, strokeLinecap: 'round' }),
  );
}

export function ChevronIcon() {
  if (Platform.OS !== 'web') {
    return null;
  }
  return node(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true },
    node('path', { d: 'M5 2.6 9.4 7 5 11.4', fill: 'none', stroke: gold, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  );
}

export function PillarGlyph({ kind, size = 22 }: { kind: 'corpo' | 'mente' | 'espirito'; size?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: gold }} />;
  }
  const common = { fill: 'none', stroke: gold, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  let body: ReactNode = null;
  if (kind === 'corpo') {
    body = node(
      'g',
      null,
      node('rect', { x: 4.4, y: 8.4, width: 3.4, height: 7.2, rx: 1.1, fill: gold }),
      node('rect', { x: 16.2, y: 8.4, width: 3.4, height: 7.2, rx: 1.1, fill: gold }),
      node('path', { d: 'M7.8 12h8.4', stroke: gold, strokeWidth: 2.2, strokeLinecap: 'round' }),
    );
  } else if (kind === 'mente') {
    body = node(
      'g',
      null,
      node('path', {
        d: 'M12 4.2c-2.6.2-4.4 2-4.4 4.2 0 .8.2 1.4.6 2-.7.6-1.3 1.5-1.3 2.6 0 2 1.7 3.5 3.9 3.5.6 0 1.1-.1 1.6-.3V4.4',
        ...common,
      }),
      node('path', {
        d: 'M12 4.2c2.6.2 4.4 2 4.4 4.2 0 .8-.2 1.4-.6 2 .7.6 1.3 1.5 1.3 2.6 0 2-1.7 3.5-3.9 3.5-.6 0-1.1-.1-1.6-.3V4.4',
        ...common,
      }),
    );
  } else {
    body = node(
      'g',
      null,
      node('path', { d: 'M12 4.2 14.6 11 12 16.8 9.4 11 12 4.2z', ...common }),
      node('path', { d: 'M5.2 9.2 10.2 10.6 8.6 16.2 4.4 13.8 5.2 9.2z', ...common }),
      node('path', { d: 'M18.8 9.2 13.8 10.6 15.4 16.2 19.6 13.8 18.8 9.2z', ...common }),
    );
  }
  return node('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, body);
}
