export const colors = {
  background: '#000000',
  ivory: '#FFFFFF',
  muted: '#A3A3A3',
  gold: '#FFFFFF',
  line: 'rgba(255, 255, 255, 0.14)',
  card: '#141414',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  iconBorder: '#737373',
  track: '#242424',
  onPrimary: '#000000',
  danger: '#E7B4B4',
  wash: 'rgba(255, 255, 255, 0.08)',
} as const;

export const fonts = {
  display: 'BarlowSemiCondensed_500Medium',
  displayLight: 'BarlowSemiCondensed_300Light',
  text: 'Manrope_400Regular',
  textLight: 'Manrope_300Light',
  textMedium: 'Manrope_500Medium',
} as const;

export const textChampagne = '#B8A078';

export const ui = {
  background: '#000000',
  text: '#F3EFE8',
  muted: '#8C8882',
  faint: '#5E5A55',
  textChampagne,
  champagne: '#E8C99B',
  champagneDeep: '#C4A574',
  goldBright: '#F2C56A',
  goldHot: '#E08A28',
  ink: '#141210',
  line: 'rgba(232, 201, 155, 0.2)',
  lineSoft: 'rgba(243, 239, 232, 0.08)',
  veil: 'rgba(232, 201, 155, 0.14)',
  track: '#1A1917',
} as const;

export const goldFill = {
  backgroundColor: '#E08A28',
  experimental_backgroundImage: 'linear-gradient(180deg, #F6C56A 0%, #E39A3C 48%, #C56A1E 100%)',
} as const;

// Mesmo preenchimento sólido do botão Ver meu dia em src/app/inicio.tsx.
export const dayButtonFill = {
  backgroundColor: '#E7C99A',
} as const;
