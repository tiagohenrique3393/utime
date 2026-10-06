import { Image, type ImageStyle } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';
import { consumeRecoveryRedirect, hasPendingRecovery } from '@/lib/session';

const LOGO_ASPECT = 685 / 243;
const HORIZON_STEPS = 96;

const ink = {
  background: '#050505',
  champagne: '#E6D2AE',
  line: 'rgba(232, 201, 155, 0.42)',
  warm: '#F5F1EA',
  buttonText: '#161412',
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
              bottom: presence * 10,
              width: '2.4%',
              height: 1,
              marginLeft: '-1.2%',
              backgroundColor: ink.line,
              opacity: Math.pow(presence, 1.85),
            }}
          />
        );
      })}
      <View style={styles.point} />
    </View>
  );
}

export default function HomeScreen() {
  const { height } = useWindowDimensions();
  const isShort = height < 700;
  const logoWidth = isShort ? 62 : 74;
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

  const logoStyle: ImageStyle = Platform.OS === 'web'
    ? ({
        width: 'clamp(60px, 16vw, 78px)',
        height: `calc(clamp(60px, 16vw, 78px) * ${LOGO_ASPECT})`,
      } as unknown as ImageStyle)
    : { width: logoWidth, height: logoWidth * LOGO_ASPECT };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.stage}>
          <View style={[styles.cluster, isShort && styles.clusterShort]}>
            <Image
              accessibilityLabel="YouTime"
              source={require('@/assets/youtime-logo.png')}
              style={logoStyle}
              contentFit="contain"
            />
            <View style={styles.inscription}>
              <Text style={styles.line}>DISCIPLINA NO HOJE.</Text>
              <Text style={styles.line}>CONSTÂNCIA NO CAMINHO.</Text>
            </View>
            <Horizon />
          </View>

          <View style={styles.breath} />

          <View style={styles.buttonSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Iniciar minha jornada"
              onPress={() => router.push('/cadastro')}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonLabel}>INICIAR MINHA JORNADA →</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const webCluster = Platform.OS === 'web'
  ? ({ paddingTop: 'clamp(12px, 4vh, 40px)' } as unknown as ViewStyle)
  : null;

const webInscription = Platform.OS === 'web'
  ? ({ marginTop: 'clamp(22px, 3.2vh, 34px)' } as unknown as ViewStyle)
  : null;

const webHorizon = Platform.OS === 'web'
  ? ({ marginTop: 'clamp(18px, 2.8vh, 30px)' } as unknown as ViewStyle)
  : null;

const webLine = Platform.OS === 'web'
  ? ({
      fontSize: 'clamp(10px, 2.35vw, 12px)',
      lineHeight: 'clamp(14px, 3vw, 16px)',
      letterSpacing: 'clamp(1.2px, 0.42vw, 2.8px)',
    } as unknown as TextStyle)
  : null;

const webButtonLabel = Platform.OS === 'web'
  ? ({
      fontSize: 'clamp(11px, 2.5vw, 12px)',
      letterSpacing: 'clamp(0.8px, 0.28vw, 1.5px)',
    } as unknown as TextStyle)
  : null;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ink.background,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100dvh', height: '100dvh', maxHeight: '100dvh' } as unknown as ViewStyle)
      : null),
  },
  safe: {
    flex: 1,
  },
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  cluster: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 28,
    ...webCluster,
  },
  clusterShort: {
    paddingTop: 12,
  },
  inscription: {
    marginTop: 28,
    alignItems: 'center',
    gap: 8,
    transform: [{ scaleX: 0.92 }],
    ...webInscription,
  },
  line: {
    color: ink.warm,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2.4,
    textAlign: 'center',
    ...webLine,
  },
  horizon: {
    width: '100%',
    height: 18,
    marginTop: 24,
    ...webHorizon,
  },
  point: {
    position: 'absolute',
    left: '50%',
    bottom: 9,
    width: 2,
    height: 2,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: 'rgba(245, 241, 234, 0.55)',
  },
  breath: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 20,
  },
  buttonSlot: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ink.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonLabel: {
    color: ink.buttonText,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.35,
    textAlign: 'center',
    ...webButtonLabel,
  },
});
