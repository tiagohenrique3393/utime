import { createElement } from 'react';
import { Platform, View } from 'react-native';

// Brilho concentrado no ponto de 100%. Não é um ícone de estrela.
export function ExcellenceSpark({ size = 16 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFF6D8',
          boxShadow: '0 0 8px rgba(255, 201, 74, 0.9)',
        }}
      />
    );
  }
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true },
    createElement('circle', { cx: 8, cy: 8, r: 5.5, fill: '#FFC94A', opacity: 0.28 }),
    createElement('circle', { cx: 8, cy: 8, r: 2.2, fill: '#FFF8E6' }),
    createElement('path', {
      d: 'M8 1.1C8.22 4.7 8.65 5.15 12.1 5.4C8.65 5.65 8.22 6.1 8 9.7C7.78 6.1 7.35 5.65 3.9 5.4C7.35 5.15 7.78 4.7 8 1.1Z',
      fill: '#FFF8E6',
    }),
  );
}
