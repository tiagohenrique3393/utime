import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, ui } from '@/constants/theme';
import { useModalGate } from '@/lib/modal-gate';
import { moodPeriodOrdinal, type MoodPeriod } from '@/lib/mood-score';

const faces: { level: 1 | 2 | 3 | 4 | 5; glyph: string; color: string }[] = [
  { level: 1, glyph: '☹', color: '#E15A4C' },
  { level: 2, glyph: '😕', color: '#E3924A' },
  { level: 3, glyph: '😐', color: '#E6C14A' },
  { level: 4, glyph: '🙂', color: '#8BCF5A' },
  { level: 5, glyph: '☺', color: '#39FF73' },
];

export function MoodCheckinModal({
  visible,
  period,
  busy,
  notice,
  onSave,
  onDismiss,
}: {
  visible: boolean;
  period: MoodPeriod;
  busy: boolean;
  notice: string;
  onSave: (level: number) => void;
  onDismiss: () => void;
}) {
  useModalGate(visible);
  const insets = useSafeAreaInsets();
  const [level, setLevel] = useState<number | null>(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.kicker}>Check-in do humor</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onDismiss} style={styles.close}>
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>{moodPeriodOrdinal(period)}</Text>
          <Text style={styles.label}>Como está seu humor?</Text>
          <View style={styles.faces}>
            {faces.map((face) => (
              <Pressable
                key={face.level}
                accessibilityRole="button"
                accessibilityLabel={`Humor ${face.level}`}
                accessibilityState={{ selected: level === face.level }}
                onPress={() => setLevel(face.level)}
                style={[
                  styles.face,
                  level === face.level && styles.faceOn,
                  { borderColor: face.color },
                  level === face.level ? { shadowColor: face.color, shadowOpacity: 0.7, shadowRadius: 10 } : null,
                ]}>
                <Text style={[styles.faceGlyph, { color: face.color }]}>{face.glyph}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.info}>Aparece apenas uma vez neste período.</Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || level == null }}
            disabled={busy || level == null}
            onPress={() => level != null && onSave(level)}
            style={[styles.primary, level == null && styles.disabled]}>
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
    textAlign: 'center',
  },
  faces: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  face: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  faceOn: { backgroundColor: 'rgba(232,201,155,0.12)' },
  faceGlyph: { fontSize: 26, lineHeight: 30 },
  info: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  notice: { marginTop: 10, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13, textAlign: 'center' },
  primary: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#E8C99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
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
