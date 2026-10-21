import { createElement } from 'react';
import { Platform, View } from 'react-native';

import type { HabitIcon } from '@/lib/habit-classify';

function svg(size: number, color: string, path: string) {
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement('path', {
      d: path,
      fill: 'none',
      stroke: color,
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

const paths: Record<HabitIcon, string> = {
  run: 'M14 6.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM6 20l3.2-4.2 2.1 1.6 2.4-3.2M8.8 9.2 11 12l3.2-1.2 2.2 2.4M14.2 10.8 16.8 8l3 1',
  lotus: 'M12 19s6-3.2 6-8.2C18 7 15.2 5 12 7.2 8.8 5 6 7 6 10.8 6 15.8 12 19 12 19Z',
  book: 'M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V19a2.4 2.4 0 0 0-2.2-1.4H5V5.5ZM19 5.5h-6.2A2.8 2.8 0 0 0 10 8.3V19a2.4 2.4 0 0 1 2.2-1.4H19V5.5Z',
  brain: 'M9 18V9.5A3.5 3.5 0 0 1 12.5 6 3.5 3.5 0 0 1 16 9.5V12M8 12H6.8A2.8 2.8 0 0 1 4 9.2 2.8 2.8 0 0 1 7.2 7M16 12h1.2A2.8 2.8 0 0 0 20 9.2 2.8 2.8 0 0 0 16.8 7',
  drop: 'M12 3.5S6.2 10 6.2 14.2a5.8 5.8 0 0 0 11.6 0C17.8 10 12 3.5 12 3.5Z',
  spark: 'M12 3.5 13.4 8l4.6.4-3.6 3 1.2 4.6L12 13.6 8.4 16l1.2-4.6L6 8.4 10.6 8 12 3.5Z',
  utensils: 'M8 4v6a2 2 0 0 0 2 2H8m0 0v8M16 4v16M16 4c1.6 2 1.6 4.2 0 6',
  moon: 'M16 4.5A7.2 7.2 0 1 0 19.5 15 5.6 5.6 0 0 1 16 4.5Z',
  coffee: 'M6 8h10v5.5A4.5 4.5 0 0 1 11.5 18h-1A4.5 4.5 0 0 1 6 13.5V8ZM16 9.5h1.4A2.6 2.6 0 0 1 20 12v.2A2.3 2.3 0 0 1 17.7 14H16',
  phone: 'M8 4h8a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 16 20H8a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 8 4Zm4 13.2h.1',
  bed: 'M4 18V8m16 10V12M4 14h16M8 14v-2.2A1.8 1.8 0 0 1 9.8 10H12',
  sun: 'M12 16.2A4.2 4.2 0 1 0 12 7.8a4.2 4.2 0 0 0 0 8.4ZM12 3.5v1.6M12 18.9v1.6M4.6 12H3M21 12h-1.6M6.2 6.2 5 5M19 19l-1.2-1.2M17.8 6.2 19 5M5 19l1.2-1.2',
  heart: 'M12 19s-6.2-3.8-6.2-8.1A3.4 3.4 0 0 1 12 8.6a3.4 3.4 0 0 1 6.2 2.3C18.2 15.2 12 19 12 19Z',
  target: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
};

export function HabitGlyph({ name, color, size = 16 }: { name: HabitIcon; color: string; size?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: color }} />;
  }
  return svg(size, color, paths[name]);
}
