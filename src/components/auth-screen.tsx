import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';

const LOGO_ASPECT = 873 / 530;

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const logoWidth = isWide ? 112 : 92;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Image
              accessibilityLabel="YouTime"
              source={require('@/assets/youtime-logo.png')}
              style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT, alignSelf: 'center' }}
              contentFit="contain"
            />

            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function AuthNotice({ message, positive }: { message: string; positive: boolean }) {
  return (
    <Text accessibilityLiveRegion="polite" style={[styles.notice, positive ? styles.noticePositive : styles.noticeError]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingTop: 8,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 8,
  },
  backLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  title: {
    marginTop: 18,
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  notice: {
    marginBottom: 16,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noticePositive: {
    color: colors.ivory,
  },
  noticeError: {
    color: colors.gold,
  },
  pressed: {
    opacity: 0.7,
  },
});
