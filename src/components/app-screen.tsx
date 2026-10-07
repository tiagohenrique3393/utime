import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BottomNav } from '@/components/bottom-nav';
import { fonts, ui } from '@/constants/theme';

type Width = 'narrow' | 'regular' | 'stage';

export function AppScreen({
  children,
  showNav = true,
  width = 'regular',
  backdrop,
  navVariant = 'default',
}: {
  children: ReactNode;
  showNav?: boolean;
  width?: Width;
  backdrop?: ReactNode;
  navVariant?: 'default' | 'hoje';
}) {
  const window = useWindowDimensions();
  const wide = window.width >= 840;
  const maxWidth = width === 'stage' ? 1120 : width === 'narrow' ? 460 : wide ? 720 : 520;

  return (
    <View style={styles.screen}>
      {backdrop ? (
        <View pointerEvents="none" style={styles.backdrop}>
          {backdrop}
        </View>
      ) : null}
      <StatusBar style="light" />
      <SafeAreaView
        edges={showNav ? ['top', 'left', 'right'] : ['top', 'right', 'bottom', 'left']}
        style={[styles.safe, backdrop ? styles.safeAbove : null]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, wide && styles.contentWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, { maxWidth }]}>{children}</View>
        </ScrollView>
      </SafeAreaView>
      {showNav ? <BottomNav variant={navVariant} /> : null}
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function PageTitle({ children, compact = false }: { children: string; compact?: boolean }) {
  return <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{children}</Text>;
}

export function Meta({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.meta, style]}>{children}</Text>;
}

export function Track({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={styles.track}>
      <View style={[styles.fill, { width: `${value}%` }]} />
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function Hairline() {
  return <View style={styles.hairline} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ui.background,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  safeAbove: {
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 36,
    alignItems: 'center',
  },
  contentWide: {
    paddingHorizontal: 32,
    paddingTop: 28,
  },
  column: {
    width: '100%',
  },
  eyebrow: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 0.4,
  },
  titleCompact: {
    fontSize: 34,
    lineHeight: 38,
  },
  meta: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  track: {
    height: 2,
    borderRadius: 1,
    backgroundColor: ui.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: ui.champagne,
  },
  primary: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: ui.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryLabel: {
    color: ui.ink,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  textButtonLabel: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.78,
  },
  hairline: {
    height: 1,
    backgroundColor: ui.lineSoft,
  },
});
