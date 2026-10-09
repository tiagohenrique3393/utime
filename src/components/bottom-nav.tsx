import { router, usePathname, type Href } from 'expo-router';
import { createElement, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, ui } from '@/constants/theme';

const tabs: { label: string; href: Href; match: (path: string) => boolean }[] = [
  {
    label: 'Hoje',
    href: '/inicio',
    match: (path) =>
      path === '/inicio' || path === '/jornada' || path === '/meu-dia' || path === '/personalizar-habitos',
  },
  {
    label: 'Progresso',
    href: '/progresso',
    match: (path) => path === '/progresso',
  },
  {
    label: '3 Pilares',
    href: '/pilares',
    match: (path) => path === '/pilares' || path.startsWith('/pilar'),
  },
  {
    label: 'Constância',
    href: '/constancia',
    match: (path) => path === '/constancia',
  },
  {
    label: 'Círculo',
    href: '/ranking',
    match: (path) => path === '/ranking',
  },
  {
    label: 'Perfil',
    href: '/perfil',
    match: (path) => path === '/perfil',
  },
];

function glyph(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function NavIcon({ label, selected }: { label: string; selected: boolean }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  const stroke = selected ? ui.champagne : ui.faint;
  const common = { fill: 'none', stroke, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' };
  let body: ReactNode = null;
  if (label === 'Hoje') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M3.5 13.2c2.2-3.1 4.4-4.6 6.5-4.6s4.3 1.5 6.5 4.6', ...common }),
      glyph('circle', { cx: 10, cy: 7.2, r: 1.35, fill: stroke, stroke: 'none' }),
    );
  } else if (label === 'Progresso') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M4 14.5v-3.2', ...common }),
      glyph('path', { d: 'M8 14.5V8', ...common }),
      glyph('path', { d: 'M12 14.5V5.5', ...common }),
      glyph('path', { d: 'M16 14.5v-5', ...common }),
    );
  } else if (label === '3 Pilares') {
    body = glyph(
      'g',
      null,
      glyph('circle', { cx: 6.2, cy: 12.4, r: 1.7, ...common }),
      glyph('circle', { cx: 13.8, cy: 12.4, r: 1.7, ...common }),
      glyph('circle', { cx: 10, cy: 6.2, r: 1.7, ...common }),
    );
  } else if (label === 'Constância') {
    body = glyph(
      'g',
      null,
      glyph('rect', { x: 4, y: 5, width: 12, height: 11, rx: 1.4, ...common }),
      glyph('path', { d: 'M4 8.5h12', ...common }),
    );
  } else if (label === 'Círculo') {
    body = glyph('circle', { cx: 10, cy: 10, r: 5.2, ...common });
  } else {
    body = glyph(
      'g',
      null,
      glyph('circle', { cx: 10, cy: 7, r: 2.2, ...common }),
      glyph('path', { d: 'M5.2 15.6c.7-2.3 2.4-3.4 4.8-3.4s4.1 1.1 4.8 3.4', ...common }),
    );
  }
  return glyph('svg', { width: 18, height: 18, viewBox: '0 0 20 20', 'aria-hidden': true }, body);
}

export function BottomNav({ variant = 'default', backgroundColor }: { variant?: 'default' | 'hoje'; backgroundColor?: string }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hoje = variant === 'hoje';
  const compact = width < 430;

  return (
    <View style={[styles.bar, hoje && styles.barHoje, backgroundColor ? { backgroundColor } : null, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const selected = tab.match(pathname);
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (pathname !== tab.href) {
                router.navigate(tab.href);
              }
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={[styles.mark, hoje && styles.markHoje, selected && styles.markSelected, hoje && selected && styles.markGlow]} />
            <NavIcon label={tab.label} selected={selected} />
            <Text
              numberOfLines={2}
              style={[styles.label, compact && styles.labelCompact, hoje && styles.labelHoje, selected && styles.labelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: ui.lineSoft,
    backgroundColor: ui.background,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 48,
    gap: 5,
    paddingHorizontal: 1,
  },
  mark: {
    width: 16,
    height: 1,
    backgroundColor: 'transparent',
  },
  markSelected: {
    backgroundColor: ui.champagne,
  },
  barHoje: {
    backgroundColor: '#070706',
    borderTopColor: 'rgba(243, 239, 232, 0.06)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  markHoje: {
    width: 18,
    height: 2,
  },
  markGlow: {
    boxShadow: '0 0 6px rgba(232, 201, 155, 0.7)',
  },
  label: {
    width: '100%',
    color: ui.faint,
    fontFamily: fonts.display,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  labelCompact: {
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.1,
  },
  labelHoje: {
    fontSize: 9,
    letterSpacing: 0.35,
  },
  labelSelected: {
    color: ui.champagne,
  },
  pressed: {
    opacity: 0.8,
  },
});
