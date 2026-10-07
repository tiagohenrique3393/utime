import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, ui } from '@/constants/theme';

const tabs: { label: string; href: Href; match: (path: string) => boolean }[] = [
  {
    label: 'Hoje',
    href: '/inicio',
    match: (path) => path === '/inicio' || path === '/jornada',
  },
  {
    label: 'Jornada',
    href: '/trinta-dias',
    match: (path) =>
      path === '/trinta-dias' ||
      path === '/progresso' ||
      path === '/pilares' ||
      path === '/constancia' ||
      path.startsWith('/pilar'),
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

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const selected = tab.match(pathname);
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!selected) {
                router.navigate(tab.href);
              }
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={[styles.mark, selected && styles.markSelected]} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 48,
    gap: 7,
  },
  mark: {
    width: 16,
    height: 1,
    backgroundColor: 'transparent',
  },
  markSelected: {
    backgroundColor: ui.champagne,
  },
  label: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  labelSelected: {
    color: ui.champagne,
  },
  pressed: {
    opacity: 0.8,
  },
});
