import { createElement, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { ui } from '@/constants/theme';

const gold = ui.champagne;

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Fallback({ size }: { size: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: gold }} />;
}

export function PremiumCrownIcon({ size = 14 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('path', {
      d: 'M3.8 9.2 7.2 12l4.8-6.4L16.8 12l3.4-2.8-.8 8.6H4.6z',
      fill: gold,
      stroke: gold,
      strokeWidth: 1.1,
      strokeLinejoin: 'round',
    }),
    node('path', { d: 'M5 19.2h14', stroke: gold, strokeWidth: 1.4, strokeLinecap: 'round' }),
  );
}

export function PremiumBarsIcon({ size = 18 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('path', { d: 'M5 18V11M10 18V8M15 18V13M20 18V6', stroke: gold, strokeWidth: 2, strokeLinecap: 'round' }),
  );
}

export function PremiumPeopleIcon({ size = 18 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('circle', { cx: 9, cy: 8, r: 2.4, fill: 'none', stroke: gold, strokeWidth: 1.5 }),
    node('circle', { cx: 16.2, cy: 9, r: 2, fill: 'none', stroke: gold, strokeWidth: 1.4 }),
    node('path', {
      d: 'M4.4 17.4c.4-2.4 2.2-3.8 4.6-3.8s4.2 1.4 4.6 3.8M13.4 17.2c.3-1.7 1.5-2.8 3.2-2.8 1.5 0 2.6.9 3 2.4',
      fill: 'none',
      stroke: gold,
      strokeWidth: 1.5,
      strokeLinecap: 'round',
    }),
  );
}

export function PremiumTargetIcon({ size = 18 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('circle', { cx: 12, cy: 12, r: 7.2, fill: 'none', stroke: gold, strokeWidth: 1.5 }),
    node('circle', { cx: 12, cy: 12, r: 3.2, fill: 'none', stroke: gold, strokeWidth: 1.5 }),
    node('path', { d: 'M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3', stroke: gold, strokeWidth: 1.5, strokeLinecap: 'round' }),
  );
}

export function PremiumLockIcon({ size = 12 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('rect', { x: 6, y: 10.5, width: 12, height: 9, rx: 2, fill: 'none', stroke: '#F3EFE8', strokeWidth: 1.5 }),
    node('path', { d: 'M8.4 10.5V8.2a3.6 3.6 0 0 1 7.2 0v2.3', fill: 'none', stroke: '#F3EFE8', strokeWidth: 1.5, strokeLinecap: 'round' }),
  );
}

export function PremiumShieldIcon({ size = 18 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('path', {
      d: 'M12 3.2 19 6.2v5.3c0 4.4-2.9 7.7-7 9.3-4.1-1.6-7-4.9-7-9.3V6.2z',
      fill: 'none',
      stroke: gold,
      strokeWidth: 1.5,
      strokeLinejoin: 'round',
    }),
  );
}

export function PremiumSupportIcon({ size = 18 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('path', {
      d: 'M5 11a7 7 0 0 1 14 0v2.2a2.4 2.4 0 0 1-2.4 2.4H15v-5h2.2A7 7 0 0 0 5 11zm0 0v4.6A2.4 2.4 0 0 0 7.4 18H9',
      fill: 'none',
      stroke: gold,
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

export function PremiumChevronIcon({ size = 14 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 14 14', 'aria-hidden': true },
    node('path', { d: 'M5 2.6 9.4 7 5 11.4', fill: 'none', stroke: gold, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  );
}

export function PremiumBackIcon({ size = 22 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <Fallback size={size} />;
  }
  return node(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    node('path', { d: 'M15.2 5.2 8.6 12l6.6 6.8', fill: 'none', stroke: '#F3EFE8', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  );
}
