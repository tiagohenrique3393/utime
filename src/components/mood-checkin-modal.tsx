import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, ui } from '@/constants/theme';
import { useModalGate } from '@/lib/modal-gate';
import {
  MOOD_LEVEL_MAX,
  MOOD_LEVEL_MIN,
  moodPeriodLabel,
  moodPeriodOrdinal,
  type MoodPeriod,
} from '@/lib/mood-score';

const levels = Array.from({ length: MOOD_LEVEL_MAX - MOOD_LEVEL_MIN + 1 }, (_, i) => i);
const periods: MoodPeriod[] = ['manha', 'tarde', 'noite'];

export function MoodCheckinModal({
  visible,
  period,
  busy,
  notice,
  allowPeriodPick = false,
  lockedPeriods,
  onSave,
  onDismiss,
}: {
  visible: boolean;
  period: MoodPeriod;
  busy: boolean;
  notice: string;
  allowPeriodPick?: boolean;
  lockedPeriods?: readonly MoodPeriod[];
  onSave: (level: number, period: MoodPeriod, note: string) => void;
  onDismiss: () => void;
}) {
  useModalGate(visible);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        {visible ? (
          <MoodCheckinForm
            key={period}
            period={period}
            busy={busy}
            notice={notice}
            allowPeriodPick={allowPeriodPick}
            lockedPeriods={lockedPeriods}
            onSave={onSave}
            onDismiss={onDismiss}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function MoodCheckinForm({
  period,
  busy,
  notice,
  allowPeriodPick,
  lockedPeriods,
  onSave,
  onDismiss,
}: {
  period: MoodPeriod;
  busy: boolean;
  notice: string;
  allowPeriodPick: boolean;
  lockedPeriods?: readonly MoodPeriod[];
  onSave: (level: number, period: MoodPeriod, note: string) => void;
  onDismiss: () => void;
}) {
  const [level, setLevel] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<MoodPeriod>(period);
  const [note, setNote] = useState('');

  return (
    <View accessibilityViewIsModal style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.face}>☺</Text>
        <View style={styles.headCopy}>
          <Text style={styles.kicker}>Check-in do humor</Text>
          <Text style={styles.sub}>{moodPeriodOrdinal(selectedPeriod)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onDismiss} style={styles.close}>
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>De 0 a 10, qual é o seu nível de humor?</Text>
      <View style={styles.levels}>
        {levels.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Humor ${value}`}
            accessibilityState={{ selected: level === value }}
            onPress={() => setLevel(value)}
            style={[styles.level, level === value && styles.levelOn]}>
            <Text style={[styles.levelLabel, level === value && styles.levelLabelOn]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      {allowPeriodPick ? (
        <>
          <Text style={[styles.label, styles.labelGap]}>Período do registro</Text>
          <View style={styles.periods}>
            {periods.map((item) => {
              const locked = lockedPeriods?.includes(item) && item !== selectedPeriod;
              const on = selectedPeriod === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: Boolean(locked) }}
                  disabled={Boolean(locked)}
                  onPress={() => setSelectedPeriod(item)}
                  style={[styles.period, on && styles.periodOn, locked && styles.periodLocked]}>
                  <Text style={[styles.periodLabel, on && styles.periodLabelOn]}>{moodPeriodLabel[item]}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={[styles.label, styles.labelGap]}>Observação (opcional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Ex.: Me senti mais animado e focado hoje."
        placeholderTextColor="#6F6A62"
        style={styles.note}
        multiline
        maxLength={500}
      />

      <Text style={styles.info}>ⓘ Você pode registrar ou atualizar um período esquecido.</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || level == null }}
        disabled={busy || level == null}
        onPress={() => level != null && onSave(level, selectedPeriod, note)}
        style={[styles.primary, level == null && styles.disabled]}>
        <Text style={styles.primaryLabel}>{busy ? 'Salvando' : 'Salvar'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.secondary}>
        <Text style={styles.secondaryLabel}>Agora não</Text>
      </Pressable>
    </View>
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.45)',
    backgroundColor: 'rgba(10,10,10,0.96)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  face: { fontSize: 26, color: '#E6C14A', lineHeight: 30 },
  headCopy: { flex: 1, gap: 2 },
  kicker: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sub: {
    color: '#E6C14A',
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: ui.text, fontSize: 28, lineHeight: 30 },
  label: {
    marginTop: 14,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelGap: { marginTop: 12 },
  levels: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  level: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  levelOn: {
    borderColor: '#E6C14A',
    backgroundColor: 'rgba(230,193,74,0.18)',
  },
  levelLabel: { color: ui.muted, fontFamily: fonts.textMedium, fontSize: 13 },
  levelLabelOn: { color: '#E6C14A' },
  periods: { marginTop: 8, flexDirection: 'row', gap: 8 },
  period: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  periodOn: { backgroundColor: '#E6C14A', borderColor: '#E6C14A' },
  periodLocked: { opacity: 0.4 },
  periodLabel: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  periodLabelOn: { color: '#141210' },
  note: {
    marginTop: 8,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.28)',
    backgroundColor: '#0A0A0A',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  info: {
    marginTop: 10,
    color: '#E6C14A',
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  notice: { marginTop: 8, color: '#F0A0A0', fontFamily: fonts.text, fontSize: 12 },
  primary: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#E8C99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
  secondary: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
});
