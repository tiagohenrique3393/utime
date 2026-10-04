import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';

const tabs: { label: string; href: Href }[] = [
  { label: 'Início', href: '/inicio' },
  { label: 'Jornada', href: '/trinta-dias' },
  { label: 'Progresso', href: '/progresso' },
  { label: 'Ranking', href: '/ranking' },
  { label: 'Perfil', href: '/perfil' },
];

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map((tab) => {
        const selected = pathname === tab.href;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
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
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 46,
    gap: 8,
  },
  mark: {
    width: 18,
    height: 1,
    backgroundColor: 'transparent',
  },
  markSelected: {
    backgroundColor: colors.gold,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  labelSelected: {
    color: colors.gold,
  },
  pressed: {
    opacity: 0.84,
  },
});
