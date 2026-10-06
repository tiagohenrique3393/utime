import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';
import { consumeRecoveryRedirect, hasPendingRecovery } from '@/lib/session';

const LOGO_ASPECT = 685 / 243;

const ink = {
  background: '#050505',
  inscription: 'rgba(232, 224, 210, 0.78)',
  horizon: 'rgba(214, 196, 168, 0.32)',
  horizonFill: 'rgba(214, 196, 168, 0.045)',
  button: '#E6D7C3',
  buttonText: '#141210',
};

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 700;
  const isNarrow = width < 390;
  const isShort = height < 740;
  const logoWidth = isWide ? 112 : isNarrow || isShort ? 74 : 92;
  const resumeSession = getSessionUserId() !== null || hasPendingRecovery();

  useEffect(() => {
    if (consumeRecoveryRedirect()) {
      router.replace('/redefinir-senha');
      return;
    }
    if (getSessionUserId()) {
      router.replace(isOnboardingComplete() ? '/inicio' : '/boas-vindas');
    }
  }, []);

  if (resumeSession) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={[styles.safe, isWide && styles.safeWide]} edges={['top', 'right', 'bottom', 'left']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <View style={[styles.hero, isShort && styles.heroShort]}>
              <View style={styles.logoWrap}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.glow,
                    {
                      width: logoWidth * 0.92,
                      height: logoWidth * LOGO_ASPECT * 1.18,
                    },
                  ]}
                />
                <Image
                  accessibilityLabel="YouTime"
                  source={require('@/assets/youtime-logo.png')}
                  style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT }}
                  contentFit="contain"
                />
              </View>

              <View pointerEvents="none" style={styles.horizonSlot}>
                <View style={styles.horizonArc} />
              </View>

              <View style={styles.inscription}>
                <Text style={[styles.line, isWide && styles.lineWide, isNarrow && styles.lineNarrow]}>
                  DISCIPLINA NO HOJE.
                </Text>
                <Text style={[styles.line, isWide && styles.lineWide, isNarrow && styles.lineNarrow]}>
                  CONSTÂNCIA NO CAMINHO.
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Iniciar minha jornada"
              onPress={() => router.push('/cadastro')}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={[styles.buttonLabel, isNarrow && styles.buttonLabelNarrow]}>INICIAR MINHA JORNADA</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const glowWeb = Platform.OS === 'web'
  ? ({
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(to bottom, rgba(198,174,138,0) 0%, rgba(198,174,138,0.11) 48%, rgba(198,174,138,0) 100%)',
    } as ViewStyle)
  : null;

const horizonWeb = Platform.OS === 'web'
  ? ({
      boxShadow: '0 0 22px rgba(214, 196, 168, 0.14)',
    } as ViewStyle)
  : null;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ink.background,
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100dvh', height: '100dvh' } as unknown as ViewStyle)
      : null),
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  safeWide: {
    paddingHorizontal: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  columnWide: {
    maxWidth: 480,
    paddingTop: 20,
    paddingBottom: 28,
  },
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  heroShort: {
    paddingBottom: 28,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(198, 174, 138, 0.07)',
    ...glowWeb,
  },
  horizonSlot: {
    width: '88%',
    maxWidth: 420,
    height: 26,
    marginTop: 26,
    overflow: 'hidden',
    alignItems: 'center',
  },
  horizonArc: {
    position: 'absolute',
    top: 0,
    width: '156%',
    height: 260,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: ink.horizon,
    backgroundColor: ink.horizonFill,
    ...horizonWeb,
  },
  inscription: {
    marginTop: 28,
    alignItems: 'center',
    gap: 8,
  },
  line: {
    color: ink.inscription,
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 2.1,
    textAlign: 'center',
  },
  lineWide: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 3.2,
  },
  lineNarrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.1,
  },
  button: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: ink.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonLabel: {
    color: ink.buttonText,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.3,
  },
  buttonLabelNarrow: {
    fontSize: 11,
    letterSpacing: 0.7,
  },
  buttonArrow: {
    color: ink.buttonText,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 18,
  },
});
