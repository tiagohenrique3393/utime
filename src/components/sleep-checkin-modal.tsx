import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, ui } from '@/constants/theme';
import { useModalGate } from '@/lib/modal-gate';
import {
  DEFAULT_SLEEP_GOAL_HOURS,
  SLEEP_HOURS_MAX,
  SLEEP_HOURS_MIN,
  SLEEP_HOURS_STEP,
  clampSleepHours,
  formatSleepHours,
} from '@/lib/sleep-score';

const qualities = [1, 2, 3, 4, 5] as const;

export function SleepCheckinModal({
  visible,
  busy,
  notice,
  onSave,
  onDismiss,
}: {
  visible: boolean;
  busy: boolean;
  notice: string;
  onSave: (hours: number, quality: number) => void;
  onDismiss: () => void;
}) {
  useModalGate(visible);
  const insets = useSafeAreaInsets();
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState(3);

  function bump(delta: number) {
    setHours((current) => clampSleepHours(current + delta));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.kicker}>Check-in do sono</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onDismiss} style={styles.close}>
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>Rápido e inteligente</Text>

          <Text style={styles.label}>Quantas horas você dormiu?</Text>
          <View style={styles.hoursRow}>
            <Pressable accessibilityRole="button" onPress={() => bump(-SLEEP_HOURS_STEP)} style={styles.step}>
              <Text style={styles.stepLabel}>−</Text>
            </Pressable>
            <View style={styles.hoursBubble}>
              <Text style={styles.hoursValue}>{formatSleepHours(hours)} h</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => bump(SLEEP_HOURS_STEP)} style={styles.step}>
              <Text style={styles.stepLabel}>+</Text>
            </Pressable>
          </View>
          <View style={styles.sliderRail}>
            <View style={[styles.sliderFill, { width: `${(hours / SLEEP_HOURS_MAX) * 100}%` }]} />
          </View>
          <View style={styles.sliderEnds}>
            <Text style={styles.hint}>{SLEEP_HOURS_MIN}h</Text>
            <Text style={styles.hint}>Meta {DEFAULT_SLEEP_GOAL_HOURS}h</Text>
            <Text style={styles.hint}>{SLEEP_HOURS_MAX}h</Text>
          </View>

          <Text style={[styles.label, styles.labelGap]}>Como foi seu sono?</Text>
          <View style={styles.qualityRow}>
            {qualities.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: quality === value }}
                onPress={() => setQuality(value)}
                style={[styles.quality, quality === value && styles.qualityOn]}>
                <Text style={[styles.qualityLabel, quality === value && styles.qualityLabelOn]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.qualityHints}>
            <Text style={styles.hint}>Muito ruim</Text>
            <Text style={styles.hint}>Excelente</Text>
          </View>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onSave(hours, quality)}
            style={styles.primary}>
            <Text style={styles.primaryLabel}>{busy ? 'Salvando' : 'Salvar'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8C99B',
    backgroundColor: '#070707',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', paddingTop: 14 },
  kicker: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: '#FFFFFF', fontSize: 22, lineHeight: 24 },
  sub: {
    marginTop: 2,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  label: {
    marginTop: 18,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelGap: { marginTop: 20 },
  hoursRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 22 },
  hoursBubble: {
    minWidth: 120,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6C14A',
    backgroundColor: 'rgba(230,193,74,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  hoursValue: { color: '#F5E6B8', fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  sliderRail: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1A1917',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.28)',
  },
  sliderFill: { height: '100%', borderRadius: 999, backgroundColor: '#E6C14A' },
  sliderEnds: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  hint: { marginTop: 6, color: ui.muted, fontFamily: fonts.text, fontSize: 12, textAlign: 'center' },
  qualityRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  quality: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityOn: { borderColor: '#E8C99B', backgroundColor: 'rgba(232,201,155,0.14)' },
  qualityLabel: { color: ui.muted, fontFamily: fonts.display, fontSize: 16 },
  qualityLabelOn: { color: ui.champagne },
  qualityHints: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  notice: { marginTop: 10, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13, textAlign: 'center' },
  primary: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#E8C99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
  secondary: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
});
