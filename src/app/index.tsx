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
const HORIZON_STEPS = 42;

const ink = {
  background: '#050505',
  champagne: '#E8C99B',
  warm: '#F5F1EA',
  buttonText: '#111111',
};

function Horizon() {
  return (
    <View pointerEvents="none" style={styles.horizon}>
      {Array.from({ length: HORIZON_STEPS }, (_, index) => {
        const t = index / (HORIZON_STEPS - 1);
        const presence = Math.sin(t * Math.PI);
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: `${t * 100}%`,
              bottom: 4 + presence * 14,
              width: '3.4%',
              height: 1,
              marginLeft: '-1.7%',
              backgroundColor: ink.champagne,
              opacity: Math.pow(presence, 1.45) * 0.92,
            }}
          />
        );
      })}
      <View style={styles.horizonHalo} />
      <View style={styles.horizonPoint} />
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 800;
  const isNarrow = width < 390;
  const isShort = height < 700;
  const logoWidth = isWide ? 104 : isShort || isNarrow ? 70 : 88;
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
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <View style={styles.composition}>
              <View style={styles.logoWrap}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.glow,
                    {
                      width: logoWidth * 0.7,
                      height: logoWidth * LOGO_ASPECT * 1.2,
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

              <View style={styles.inscription}>
                <Text style={[styles.line, isWide && styles.lineWide, isNarrow && styles.lineNarrow]}>
                  DISCIPLINA NO HOJE.
                </Text>
                <Text style={[styles.line, isWide && styles.lineWide, isNarrow && styles.lineNarrow]}>
                  CONSTÂNCIA NO CAMINHO.
                </Text>
              </View>

              <Horizon />
            </View>

            <View style={styles.space} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Iniciar minha jornada"
              onPress={() => router.push('/cadastro')}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={[styles.buttonLabel, isNarrow && styles.buttonLabelNarrow]}>INICIAR MINHA JORNADA  →</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

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
    paddingHorizontal: 28,
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
    maxWidth: 420,
    alignSelf: 'center',
    paddingTop: 12,
    paddingBottom: 18,
  },
  columnWide: {
    maxWidth: 460,
    paddingBottom: 32,
  },
  composition: {
    alignItems: 'center',
    paddingTop: 28,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(232, 201, 155, 0.075)',
  },
  inscription: {
    marginTop: 36,
    alignItems: 'center',
    gap: 7,
    transform: [{ scaleX: 0.92 }],
  },
  line: {
    color: ink.warm,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  lineWide: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 3.2,
  },
  lineNarrow: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  horizon: {
    width: '100%',
    height: 32,
    marginTop: 34,
  },
  horizonHalo: {
    position: 'absolute',
    left: '50%',
    bottom: 12,
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 5,
    backgroundColor: 'rgba(232, 201, 155, 0.28)',
  },
  horizonPoint: {
    position: 'absolute',
    left: '50%',
    bottom: 15,
    width: 4,
    height: 4,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: ink.warm,
  },
  space: {
    flexGrow: 1,
    minHeight: 48,
  },
  button: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: ink.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonLabel: {
    color: ink.buttonText,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  buttonLabelNarrow: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
