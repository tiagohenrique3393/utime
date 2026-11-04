import { createElement } from 'react';
import { Platform, View } from 'react-native';

import type { HabitIcon } from '@/lib/habit-classify';

type Tone = 'main' | 'dark' | 'paper';
type Part = { d: string; tone: Tone; stroke?: boolean };

const art: Record<HabitIcon, Part[]> = {
  dumbbell: [
    { d: 'M3.2 7.4h3.4v9.2H3.2zM17.4 7.4h3.4v9.2h-3.4z', tone: 'dark' },
    { d: 'M5.8 8.8h2.4v6.4H5.8zM15.8 8.8h2.4v6.4h-2.4z', tone: 'main' },
    { d: 'M7.6 10.4h8.8v3.2H7.6z', tone: 'paper' },
  ],
  kimono: [
    { d: 'M8 7.2 12 4.2 16 7.2V20H8V7.2z', tone: 'paper' },
    { d: 'M12 4.6 9.2 8.4 12 11.2 14.8 8.4 12 4.6z', tone: 'main' },
    { d: 'M8.4 12.2h7.2v1.7H8.4z', tone: 'dark' },
  ],
  book: [
    { d: 'M4.2 5.2h6.2c.9 0 1.6.7 1.6 1.6V19c-.7-.5-1.5-.8-2.4-.8H4.2V5.2z', tone: 'main' },
    { d: 'M19.8 5.2h-6.2c-.9 0-1.6.7-1.6 1.6V19c.7-.5 1.5-.8 2.4-.8h5.4V5.2z', tone: 'paper' },
    { d: 'M11.2 6.6v11.2', tone: 'dark', stroke: true },
  ],
  coffee: [
    { d: 'M5.2 7.2h9.2v5.2a3.6 3.6 0 0 1-3.6 3.6H8.8a3.6 3.6 0 0 1-3.6-3.6V7.2z', tone: 'main' },
    { d: 'M14.2 8.4h1.5a2.2 2.2 0 0 1 0 4.4H14.2', tone: 'dark', stroke: true },
    { d: 'M7.2 4.6c.4.8.4 1.4 0 2.2M9.6 4.2c.4.8.4 1.4 0 2.2', tone: 'paper', stroke: true },
  ],
  shower: [
    { d: 'M7 4.2h10v2.2H7z', tone: 'main' },
    { d: 'M9 8.2h1.2v2.2H9zM12 9h1.2v2.4H12zM15 8.2h1.2v2.2H15zM8.2 13h1.1v2.4H8.2zM11.4 13.6h1.1V16h-1.1zM14.6 13h1.1v2.4h-1.1z', tone: 'paper' },
  ],
  lotus: [
    { d: 'M12 6.2a1.5 1.5 0 1 0 .01 0z', tone: 'paper' },
    { d: 'M8.2 14.2c.2-2.4 1.6-4 3.8-4s3.6 1.6 3.8 4', tone: 'main' },
    { d: 'M6.4 17.6c1.2-1.6 2.8-2.4 5.6-2.4s4.4.8 5.6 2.4H6.4z', tone: 'dark' },
  ],
  pray: [
    { d: 'M11.2 4.8c.6 1.6.6 4.2 0 7.2-.6-3-.6-5.6 0-7.2z', tone: 'paper' },
    { d: 'M8.2 8.2c.8 1.2 1.6 3.4 1.8 6.2-1.6-.2-2.8-1.4-3.4-3.2.2-1.4.8-2.4 1.6-3zM15.8 8.2c-.8 1.2-1.6 3.4-1.8 6.2 1.6-.2 2.8-1.4 3.4-3.2-.2-1.4-.8-2.4-1.6-3z', tone: 'main' },
  ],
  stretch: [
    { d: 'M14.2 4.8a1.4 1.4 0 1 0 .01 0z', tone: 'paper' },
    { d: 'M9.2 8.4h6.2l-1.2 4.2H10.4L9.2 8.4z', tone: 'main' },
    { d: 'M10.2 12.6 8.2 19M13.8 12.6 16.2 19M8.4 9.2 6.2 7.2', tone: 'dark', stroke: true },
  ],
  agenda: [
    { d: 'M6.2 4.2h11.6v15.6H6.2z', tone: 'paper' },
    { d: 'M6.2 4.2h2v15.6h-2z', tone: 'main' },
    { d: 'M10.2 8h5.2M10.2 11h5.2M10.2 14h3.6', tone: 'dark', stroke: true },
  ],
  bed: [
    { d: 'M4 16.5V8.5h2.2v5.2H20V16.5H4z', tone: 'dark' },
    { d: 'M6.2 11.2h13.6v2.6H6.2z', tone: 'main' },
    { d: 'M7 9.2h4.2v2H7z', tone: 'paper' },
  ],
  utensils: [
    { d: 'M7.2 3.8v6.2a1.6 1.6 0 0 0 1.6 1.6V20H7.2v-8.4A1.6 1.6 0 0 1 5.6 10V3.8h1.6z', tone: 'main' },
    { d: 'M16.2 3.8c1.4 1.8 1.4 3.6 0 5.4V20h-1.6V3.8h1.6z', tone: 'paper' },
  ],
  drop: [
    { d: 'M12 3.2S6.4 9.2 6.4 13a5.6 5.6 0 0 0 11.2 0C17.6 9.2 12 3.2 12 3.2z', tone: 'main' },
    { d: 'M9.2 13.2a2.2 2.2 0 0 0 2.2 2.4', tone: 'paper', stroke: true },
  ],
  run: [
    { d: 'M15.2 5.4a1.5 1.5 0 1 0 .01 0z', tone: 'paper' },
    { d: 'M8.2 18.8 11 14l2.2 1.4 1.6-2.6-2.4-1.6 2.2-2.2 2.6 1.2', tone: 'main', stroke: true },
  ],
  walk: [
    { d: 'M8.2 14.2c1.6-1 3.2-.2 3.4 1.6.2 1.6-.8 2.6-2.4 2.8-1.8.2-3-1.2-1-4.4z', tone: 'main' },
    { d: 'M13.2 6.4c1.6-1 3.2-.2 3.4 1.6.2 1.6-.8 2.6-2.4 2.8-1.8.2-3-1.2-1-4.4z', tone: 'paper' },
  ],
  brain: [
    { d: 'M8 14.8V10a3.2 3.2 0 0 1 3.2-3.2h1.6A3.2 3.2 0 0 1 16 10v4.8H8z', tone: 'main' },
    { d: 'M6.2 11.2a2.2 2.2 0 0 1 2.2-2.4M17.8 11.2a2.2 2.2 0 0 0-2.2-2.4', tone: 'dark', stroke: true },
  ],
  spark: [
    { d: 'M12 3.4 13.6 8l4.8.3-3.8 3.1 1.3 4.6L12 13.4 8.1 16l1.3-4.6L5.6 8.3 10.4 8 12 3.4z', tone: 'main' },
  ],
  moon: [
    { d: 'M14.8 4.2A7 7 0 1 0 18.6 15 5.4 5.4 0 0 1 14.8 4.2z', tone: 'main' },
  ],
  phone: [
    { d: 'M8 3.8h8a1.4 1.4 0 0 1 1.4 1.4v13.6A1.4 1.4 0 0 1 16 20.2H8a1.4 1.4 0 0 1-1.4-1.4V5.2A1.4 1.4 0 0 1 8 3.8z', tone: 'dark' },
    { d: 'M9.2 5.2h5.6v11.2H9.2z', tone: 'paper' },
  ],
  sun: [
    { d: 'M12 16.4a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8z', tone: 'main' },
    { d: 'M12 3.2v2M12 18.8v2M4.4 12H2.4M21.6 12h-2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18', tone: 'paper', stroke: true },
  ],
  heart: [
    { d: 'M12 18.6s-5.8-3.4-5.8-7.4A3.2 3.2 0 0 1 12 8.6a3.2 3.2 0 0 1 5.8 2.6c0 4-5.8 7.4-5.8 7.4z', tone: 'main' },
  ],
  check: [
    { d: 'M4.2 6.8h15.6v2.2H4.2zM4.2 11h15.6v2.2H4.2zM4.2 15.2h15.6V17.4H4.2z', tone: 'paper' },
    { d: 'M5.2 7.2 6.4 8.6 8.4 6.4M5.2 11.4 6.4 12.8 8.4 10.6M5.2 15.6 6.4 17 8.4 14.8', tone: 'main', stroke: true },
  ],
  target: [
    { d: 'M12 19.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4z', tone: 'dark' },
    { d: 'M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4z', tone: 'main' },
    { d: 'M12 13.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z', tone: 'paper' },
  ],
};

const palette = {
  live: { main: '#E4C48A', dark: '#8A6A3E', paper: '#F4E7CC' },
  muted: { main: '#8A8680', dark: '#5C5954', paper: '#C8C4BE' },
};

function mutedColor(color: string) {
  const value = color.toLowerCase();
  return value === '#6e6a64' || value === '#8e8a84' || value === '#5c5954';
}

export function HabitGlyph({ name, color, size = 18 }: { name: HabitIcon; color: string; size?: number }) {
  const tones = mutedColor(color) ? palette.muted : palette.live;
  if (Platform.OS !== 'web') {
    return <View style={{ width: size * 0.72, height: size * 0.72, borderRadius: size * 0.18, backgroundColor: tones.main }} />;
  }
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    art[name].map((part, index) =>
      createElement('path', {
        key: index,
        d: part.d,
        fill: part.stroke ? 'none' : tones[part.tone],
        stroke: part.stroke ? tones[part.tone] : 'none',
        strokeWidth: part.stroke ? 1.5 : 0,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    ),
  );
}
