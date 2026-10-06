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
const VB_W = 480;
const VB_H = 230;
const CREST = 18;
const RISE = 62;

const ink = {
  background: '#050505',
  champagne: '#E6D2AE',
  warm: '#F5F1EA',
  buttonText: '#161412',
};

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Planet({ height }: { height: number }) {
  const half = VB_W / 2;
  const radius = (half * half + RISE * RISE) / (2 * RISE);
  const cy = CREST + radius;

  if (Platform.OS !== 'web') {
    return <View style={{ height, width: '100%' }} />;
  }

  return (
    <View pointerEvents="none" style={[styles.planetSlot, { height }]}>
      {node(
        'svg',
        {
          viewBox: `0 0 ${VB_W} ${VB_H}`,
          width: '100%',
          height: '100%',
          preserveAspectRatio: 'xMidYMin meet',
        },
        node(
          'defs',
          null,
          node(
            'radialGradient',
            { id: 'utime-surf', cx: '50%', cy: '0%', r: '78%' },
            node('stop', { offset: '0%', stopColor: '#050505' }),
            node('stop', { offset: '22%', stopColor: '#050505' }),
            node('stop', { offset: '58%', stopColor: '#050505' }),
            node('stop', { offset: '100%', stopColor: '#050505' }),
          ),
          node(
            'linearGradient',
            { id: 'utime-rim', x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0' }),
            node('stop', { offset: '30%', stopColor: '#E8C99B', stopOpacity: '0.28' }),
            node('stop', { offset: '50%', stopColor: '#F6EFE2', stopOpacity: '0.95' }),
            node('stop', { offset: '70%', stopColor: '#E8C99B', stopOpacity: '0.28' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'utime-sun', cx: '50%', cy: '50%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#F7F1E6', stopOpacity: '0.95' }),
            node('stop', { offset: '16%', stopColor: '#E8C99B', stopOpacity: '0.55' }),
            node('stop', { offset: '46%', stopColor: '#E8C99B', stopOpacity: '0.12' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'filter',
            { id: 'utime-grain', x: '-20%', y: '-20%', width: '140%', height: '140%' },
            node('feTurbulence', {
              type: 'fractalNoise',
              baseFrequency: '0.85',
              numOctaves: '2',
              result: 'noise',
            }),
            node('feColorMatrix', {
              type: 'matrix',
              values: '0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.05  0 0 0 0.05 0',
            }),
          ),
          node(
            'linearGradient',
            { id: 'utime-sides', x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#050505' }),
            node('stop', { offset: '10%', stopColor: '#050505', stopOpacity: '0.82' }),
            node('stop', { offset: '24%', stopColor: '#050505', stopOpacity: '0' }),
            node('stop', { offset: '76%', stopColor: '#050505', stopOpacity: '0' }),
            node('stop', { offset: '90%', stopColor: '#050505', stopOpacity: '0.82' }),
            node('stop', { offset: '100%', stopColor: '#050505' }),
          ),
          node(
            'linearGradient',
            { id: 'utime-down', x1: '0', y1: '0', x2: '0', y2: '1' },
            node('stop', { offset: '0%', stopColor: '#050505', stopOpacity: '0' }),
            node('stop', { offset: '100%', stopColor: '#050505' }),
          ),
          node(
            'filter',
            { id: 'utime-glow', x: '-40%', y: '-80%', width: '180%', height: '260%' },
            node('feGaussianBlur', { stdDeviation: '2.2' }),
          ),
        ),
        node('circle', { cx: half, cy, r: radius, fill: 'url(#utime-surf)' }),
        node('circle', {
          cx: half,
          cy,
          r: radius,
          fill: '#050505',
          filter: 'url(#utime-grain)',
          opacity: 0,
        }),
        node('rect', { x: 0, y: 0, width: VB_W, height: VB_H, fill: 'url(#utime-sides)' }),
        node('rect', { x: 0, y: 78, width: VB_W, height: VB_H - 78, fill: 'url(#utime-down)' }),
        node('circle', {
          cx: half,
          cy,
          r: radius,
          fill: 'none',
          stroke: 'url(#utime-rim)',
          strokeWidth: 6,
          filter: 'url(#utime-glow)',
          opacity: 0.85,
        }),
        node('circle', {
          cx: half,
          cy,
          r: radius,
          fill: 'none',
          stroke: 'url(#utime-rim)',
          strokeWidth: 1.15,
        }),
        node('ellipse', {
          cx: half,
          cy: CREST + 1,
          rx: 78,
          ry: 16,
          fill: 'url(#utime-sun)',
          filter: 'url(#utime-glow)',
        }),
        node('ellipse', {
          cx: half,
          cy: CREST + 0.5,
          rx: 18,
          ry: 4.5,
          fill: '#F4E7CF',
          opacity: 0.85,
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
      <View pointerEvents="none" style={styles.ambient} />
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

const ambientWeb = Platform.OS === 'web'
  ? ({
      backgroundColor: 'transparent',
      backgroundImage:
        'radial-gradient(ellipse at 50% 42%, rgba(186,154,104,0.075), rgba(186,154,104,0) 62%)',
    } as unknown as ViewStyle)
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
  ambient: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '18%',
    bottom: '28%',
    ...ambientWeb,
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
    width: '100%',
    alignSelf: 'center',
    marginTop: -1,
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
