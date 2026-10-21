import { createElement, useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import type { CelebrationKind } from '@/lib/day-celebration';

const green = '#6FCF97';
const card = '#0C0C0C';

function CheckMark() {
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      { width: 92, height: 92, viewBox: '0 0 92 92', 'aria-hidden': true },
      createElement('circle', { cx: 46, cy: 46, r: 34, fill: 'none', stroke: 'rgba(111,207,151,0.28)', strokeWidth: 3 }),
      createElement('circle', {
        cx: 46,
        cy: 46,
        r: 34,
        fill: 'none',
        stroke: green,
        strokeWidth: 3.5,
        strokeLinecap: 'round',
        strokeDasharray: '150 220',
        transform: 'rotate(-80 46 46)',
      }),
      createElement('path', {
        d: 'M33 47.5 L42.5 57 L60 36',
        fill: 'none',
        stroke: green,
        strokeWidth: 3.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    );
  }
  return (
    <View style={styles.checkFallback}>
      <View style={styles.checkTick} />
    </View>
  );
}

function ExcellenceStar() {
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      { width: 92, height: 92, viewBox: '0 0 92 92', 'aria-hidden': true },
      createElement('circle', { cx: 46, cy: 46, r: 36, fill: 'rgba(232,201,155,0.06)', stroke: 'rgba(232,201,155,0.45)', strokeWidth: 1.4 }),
      createElement('circle', { cx: 46, cy: 46, r: 28, fill: 'none', stroke: 'rgba(196,165,116,0.7)', strokeWidth: 1.2 }),
      createElement('polygon', {
        points: '46,22 51.8,38.2 69,39.2 55.6,49.6 59.8,66.4 46,57.2 32.2,66.4 36.4,49.6 23,39.2 40.2,38.2',
        fill: ui.champagne,
      }),
    );
  }
  return (
    <View style={styles.starFallback}>
      <Text style={styles.starGlyph}>★</Text>
    </View>
  );
}

export function DayCelebration({ kind, onClose }: { kind: CelebrationKind | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const rise = useRef(new Animated.Value(0)).current;
  const continueRef = useRef<View>(null);

  useEffect(() => {
    if (!kind) {
      rise.setValue(0);
      return;
    }
    if (reduced) {
      rise.setValue(1);
    } else {
      rise.setValue(0);
      Animated.timing(rise, { toValue: 1, duration: 320, useNativeDriver: false }).start();
    }
    const node = continueRef.current as unknown as { focus?: () => void } | null;
    const frame = requestAnimationFrame(() => node?.focus?.());
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return () => cancelAnimationFrame(frame);
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
    };
  }, [kind, onClose, reduced, rise]);

  if (!kind) {
    return null;
  }

  const excellence = kind === 'excelencia';
  const scale = rise.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const iconScale = rise.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        accessibilityViewIsModal
        style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Animated.View
          accessibilityRole="summary"
          style={[styles.card, { opacity: rise, transform: [{ scale }] }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10} onPress={onClose} style={styles.close}>
            <Text style={styles.closeLabel}>×</Text>
          </Pressable>
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            {excellence ? <ExcellenceStar /> : <CheckMark />}
          </Animated.View>
          {excellence ? (
            <Text accessibilityRole="header" style={styles.excellenceTitle}>
              Excelência
            </Text>
          ) : (
            <Text accessibilityRole="header" style={styles.metaTitle}>
              Meta diária{'\n'}
              <Text style={styles.metaAccent}>Alcançada</Text>
            </Text>
          )}
          <Text style={styles.message}>
            {excellence
              ? 'Você concluiu 100% dos seus hábitos. Você cumpriu tudo o que prometeu a si mesmo.'
              : 'Você atingiu sua meta diária. A constância se constrói todos os dias.'}
          </Text>
          <Pressable
            ref={continueRef}
            accessibilityRole="button"
            accessibilityLabel="Continuar"
            onPress={onClose}
            style={styles.continue}>
            <Text style={styles.continueLabel}>Continuar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 372,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.38)',
    backgroundColor: card,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: { color: '#B7B2AA', fontSize: 22, lineHeight: 24 },
  checkFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: green,
    backgroundColor: 'rgba(47,143,98,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTick: {
    width: 22,
    height: 12,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: green,
    transform: [{ rotate: '-45deg' }],
  },
  starFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.4,
    borderColor: 'rgba(232,201,155,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,201,155,0.06)',
  },
  starGlyph: { color: ui.champagne, fontSize: 36, lineHeight: 40 },
  metaTitle: {
    marginTop: 18,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  metaAccent: { color: green, fontFamily: fonts.display },
  excellenceTitle: {
    marginTop: 18,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  message: {
    marginTop: 14,
    color: '#C8C4BC',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  continue: {
    marginTop: 22,
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.72)',
    backgroundColor: 'rgba(20,16,8,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
