import { Image, type ImageStyle } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createElement, useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';
import { consumeRecoveryRedirect, hasPendingRecovery } from '@/lib/session';

const LOGO_ASPECT = 685 / 243;

const ink = {
  champagne: '#E6D2AE',
  warm: '#F5F1EA',
  buttonText: '#161412',
};

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Planet({ height }: { height: number }) {
  if (Platform.OS !== 'web') {
    return <View style={{ height, width: '100%', backgroundColor: 'transparent' }} />;
  }

  return (
    <View pointerEvents="none" style={[styles.planetSlot, { height }]}>
      {node(
        'svg',
        {
          viewBox: '0 0 1200 100',
          width: '100%',
          height: '100%',
          fill: 'none',
          preserveAspectRatio: 'xMidYMin meet',
          style: { display: 'block', backgroundColor: 'transparent', background: 'none' },
        },
        node(
          'defs',
          null,
          node(
            'linearGradient',
            { id: 'utime-rim', x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0' }),
            node('stop', { offset: '42%', stopColor: '#E8C99B', stopOpacity: '0.35' }),
            node('stop', { offset: '50%', stopColor: '#F6EFE2', stopOpacity: '0.9' }),
            node('stop', { offset: '58%', stopColor: '#E8C99B', stopOpacity: '0.35' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'utime-sun', cx: '50%', cy: '50%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#F7F1E6', stopOpacity: '0.75' }),
            node('stop', { offset: '30%', stopColor: '#E8C99B', stopOpacity: '0.22' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
        ),
        node('path', {
          d: 'M 0 86 Q 600 8 1200 86',
          fill: 'none',
          stroke: 'url(#utime-rim)',
          strokeWidth: 1.15,
        }),
        node('ellipse', {
          cx: 600,
          cy: 12,
          rx: 64,
          ry: 8,
          fill: 'url(#utime-sun)',
        }),
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isShort = height < 740;
  const frameWidth = Math.min(width, width >= 840 ? 470 : width);
  const logoWidth = isShort ? 56 : Math.min(72, frameWidth * 0.18);
  const planetHeight = Math.round(Math.min(frameWidth * 0.46, isShort ? 150 : 210));
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
        width: 'clamp(56px, 16vw, 74px)',
        height: `calc(clamp(56px, 16vw, 74px) * ${LOGO_ASPECT})`,
      } as unknown as ImageStyle)
    : { width: logoWidth, height: logoWidth * LOGO_ASPECT };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.stage}>
          <View style={[styles.frame, { maxWidth: frameWidth }]}>
            <View style={[styles.lit, isShort && styles.litShort]}>
              <View pointerEvents="none" style={styles.beamGlow} />
              <View pointerEvents="none" style={styles.beam} />
              <Image
                accessibilityLabel="YouTime"
                source={require('@/assets/youtime-logo.png')}
                style={[logoStyle, styles.logo]}
                contentFit="contain"
              />
              <View style={styles.inscription}>
                <Text style={styles.line}>DISCIPLINA NO HOJE.</Text>
                <Text style={styles.line}>CONSTÂNCIA NO CAMINHO.</Text>
              </View>
              <View style={styles.beforeHorizon} />
            </View>

            <Planet height={planetHeight} />

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
        </View>
      </SafeAreaView>
    </View>
  );
}

const webLit = Platform.OS === 'web'
  ? ({ paddingTop: 'clamp(18px, 5vh, 52px)' } as unknown as ViewStyle)
  : null;

const webInscription = Platform.OS === 'web'
  ? ({ marginTop: 'clamp(20px, 3vh, 32px)' } as unknown as ViewStyle)
  : null;

const webBefore = Platform.OS === 'web'
  ? ({ height: 'clamp(28px, 5vh, 56px)' } as unknown as ViewStyle)
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

const beamGlowWeb = Platform.OS === 'web'
  ? ({
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(to top, rgba(232,201,155,0.28) 0%, rgba(232,201,155,0.08) 30%, rgba(232,201,155,0) 72%)',
      filter: 'blur(10px)',
    } as unknown as ViewStyle)
  : null;

const beamWeb = Platform.OS === 'web'
  ? ({
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(to top, rgba(236,214,176,0.42) 0%, rgba(232,201,155,0.12) 22%, rgba(232,201,155,0.03) 50%, rgba(232,201,155,0) 100%)',
    } as unknown as ViewStyle)
  : null;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
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
  frame: {
    flex: 1,
    width: '100%',
  },
  lit: {
    alignItems: 'center',
    paddingTop: 28,
    position: 'relative',
    ...webLit,
  },
  litShort: {
    paddingTop: 12,
  },
  beamGlow: {
    position: 'absolute',
    left: '50%',
    top: '6%',
    bottom: 0,
    width: 28,
    marginLeft: -14,
    backgroundColor: 'rgba(232, 201, 155, 0.05)',
    ...beamGlowWeb,
  },
  beam: {
    position: 'absolute',
    left: '50%',
    top: '4%',
    bottom: 0,
    width: 1,
    marginLeft: -0.5,
    backgroundColor: 'rgba(232, 201, 155, 0.28)',
    ...beamWeb,
  },
  logo: {
    zIndex: 1,
  },
  inscription: {
    marginTop: 26,
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
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
  beforeHorizon: {
    height: 36,
    width: '100%',
    ...webBefore,
  },
  planetSlot: {
    width: '120vw',
    position: 'relative',
    left: '50%',
    marginTop: -1,
    backgroundColor: 'transparent',
    transform: [{ translateX: '-50%' }],
  },
  breath: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 12,
  },
  buttonSlot: {
    width: '100%',
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
