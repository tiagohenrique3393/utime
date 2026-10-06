import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';
import { consumeRecoveryRedirect, hasPendingRecovery } from '@/lib/session';

const LOGO_ASPECT = 685 / 243;
const HORIZON_STEPS = 80;

const ink = {
  background: '#050505',
  champagne: '#E8C99B',
  warm: '#F5F1EA',
  buttonText: '#111111',
};

function BackgroundScene({ height }: { height: number }) {
  const arcTop = height * (height < 700 ? 0.66 : 0.6);

  return (
    <View pointerEvents="none" style={styles.scene}>
      <View
        style={[
          styles.beamSoft,
          {
            top: height * 0.1,
            height: Math.max(0, arcTop - height * 0.1),
          },
        ]}
      />
      <View
        style={[
          styles.beam,
          {
            top: height * 0.12,
            height: Math.max(0, arcTop + 16 - height * 0.12),
          },
        ]}
      />
      <View style={[styles.arc, { top: arcTop }]}>
        {Array.from({ length: HORIZON_STEPS }, (_, index) => {
          const t = index / (HORIZON_STEPS - 1);
          const presence = Math.sin(t * Math.PI);
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: `${t * 100}%`,
                bottom: presence * 18,
                width: '2.2%',
                height: 1,
                marginLeft: '-1.1%',
                backgroundColor: ink.champagne,
                opacity: Math.pow(presence, 1.7) * 0.85,
              }}
            />
          );
        })}
        <View style={styles.pointHalo} />
        <View style={styles.point} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 800;
  const isNarrow = width < 380;
  const isShort = height < 700;
  const logoWidth = isShort ? 66 : isWide ? 96 : 82;
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
      <BackgroundScene height={height} />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.frame}>
          <View style={[styles.copy, isShort && styles.copyShort]}>
            <Image
              accessibilityLabel="YouTime"
              source={require('@/assets/youtime-logo.png')}
              tintColor="#F6F1E8"
              style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT }}
              contentFit="contain"
            />
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
      </SafeAreaView>
    </View>
  );
}

const beamWeb = Platform.OS === 'web'
  ? ({
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(to bottom, rgba(232,201,155,0) 0%, rgba(232,201,155,0.08) 42%, rgba(232,201,155,0.42) 100%)',
    } as unknown as ViewStyle)
  : null;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ink.background,
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100dvh', height: '100dvh' } as unknown as ViewStyle)
      : null),
  },
  scene: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  beam: {
    position: 'absolute',
    left: '50%',
    width: 1,
    marginLeft: -0.5,
    backgroundColor: 'rgba(232, 201, 155, 0.28)',
    ...beamWeb,
  },
  beamSoft: {
    position: 'absolute',
    left: '50%',
    width: 8,
    marginLeft: -4,
    backgroundColor: 'rgba(232, 201, 155, 0.035)',
  },
  arc: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
  },
  pointHalo: {
    position: 'absolute',
    left: '50%',
    bottom: 14,
    width: 9,
    height: 9,
    marginLeft: -4.5,
    borderRadius: 5,
    backgroundColor: 'rgba(232, 201, 155, 0.32)',
  },
  point: {
    position: 'absolute',
    left: '50%',
    bottom: 16,
    width: 3,
    height: 3,
    marginLeft: -1.5,
    borderRadius: 2,
    backgroundColor: ink.warm,
  },
  safe: {
    flex: 1,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  copy: {
    alignItems: 'center',
    paddingTop: 36,
  },
  copyShort: {
    paddingTop: 16,
  },
  inscription: {
    marginTop: 30,
    alignItems: 'center',
    gap: 8,
    transform: [{ scaleX: 0.92 }],
  },
  line: {
    color: ink.warm,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2.6,
    textAlign: 'center',
  },
  lineWide: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.1,
  },
  lineNarrow: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.3,
  },
  button: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: ink.champagne,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonLabel: {
    color: ink.buttonText,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  buttonLabelNarrow: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  buttonArrow: {
    color: ink.buttonText,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 18,
  },
});
