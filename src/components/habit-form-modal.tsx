import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, ui } from '@/constants/theme';
import type { HabitPeriod, HabitPillar, HabitRelevance } from '@/lib/habit-catalog';
import { pillarLabels } from '@/lib/habit-catalog';

const corpo = require('@/assets/pillars/corpo-mantime.png');
const mente = require('@/assets/pillars/mente.png');
const espirito = require('@/assets/pillars/espirito.png');

const durations = [5, 10, 15, 20, 30, 45, 60, 90] as const;

const relevanceCopy: Record<HabitRelevance, { label: string; detail: string }> = {
  alta: { label: 'Alta', detail: 'Prioridade máxima ao seu dia.' },
  media: { label: 'Média', detail: 'Importante para sua rotina.' },
  baixa: { label: 'Baixa', detail: 'Complementa o seu dia.' },
};

const periodCopy: Record<HabitPeriod, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

const pillarImage: Record<HabitPillar, number> = {
  corpo,
  mente,
  espirito,
};

export type HabitDraft = {
  label: string;
  pillar: HabitPillar;
  period: HabitPeriod;
  minutes: number | null;
  relevance: HabitRelevance | null;
};

export function HabitFormModal({
  visible,
  title,
  initial,
  pending,
  notice,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  initial: HabitDraft;
  pending: boolean;
  notice: string;
  onClose: () => void;
  onSubmit: (draft: HabitDraft) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (visible) {
      setDraft(initial);
    }
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} onPress={onClose} style={styles.close}>
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.field}>Nome do hábito</Text>
          <TextInput
            value={draft.label}
            onChangeText={(label) => setDraft((current) => ({ ...current, label }))}
            placeholder="Ex.: Treinar, Ler, Estudar..."
            placeholderTextColor={ui.faint}
            maxLength={80}
            accessibilityLabel="Nome do hábito"
            style={styles.input}
          />
          <Text style={styles.field}>Pilar</Text>
          <View style={styles.choices}>
            {(['corpo', 'mente', 'espirito'] as const).map((pillar) => {
              const selected = draft.pillar === pillar;
              return (
                <Pressable
                  key={pillar}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={pillarLabels[pillar]}
                  onPress={() => setDraft((current) => ({ ...current, pillar }))}
                  style={[styles.choice, selected && styles.choiceOn]}>
                  <Image source={pillarImage[pillar]} contentFit="cover" style={styles.choiceImage} />
                  <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>{pillarLabels[pillar]}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.field}>Período</Text>
          <View style={styles.choices}>
            {(['manha', 'tarde', 'noite'] as const).map((period) => {
              const selected = draft.period === period;
              return (
                <Pressable
                  key={period}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={periodCopy[period]}
                  onPress={() => setDraft((current) => ({ ...current, period }))}
                  style={[styles.choice, selected && styles.choiceOn]}>
                  <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>{periodCopy[period]}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.field}>Tempo estimado</Text>
          <View style={styles.minutes}>
            {durations.map((minutes) => {
              const selected = draft.minutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${minutes} minutos`}
                  onPress={() => setDraft((current) => ({ ...current, minutes }))}
                  style={[styles.minute, selected && styles.choiceOn]}>
                  <Text style={[styles.minuteLabel, selected && styles.choiceLabelOn]}>{`${minutes} min`}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.field}>Relevância</Text>
          {(['alta', 'media', 'baixa'] as const).map((relevance) => {
            const selected = draft.relevance === relevance;
            const copy = relevanceCopy[relevance];
            return (
              <Pressable
                key={relevance}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${copy.label}. ${copy.detail}`}
                onPress={() => setDraft((current) => ({ ...current, relevance }))}
                style={[styles.relevance, selected && styles.choiceOn]}>
                <Text style={[styles.relevanceLabel, selected && styles.choiceLabelOn]}>{copy.label}</Text>
                <Text style={styles.relevanceDetail}>{copy.detail}</Text>
              </Pressable>
            );
          })}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending }}
            disabled={pending}
            onPress={() => onSubmit(draft)}
            style={[styles.save, pending && styles.pressed]}>
            <Text style={styles.saveLabel}>{pending ? 'Salvando' : 'Salvar hábito'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.45)',
    backgroundColor: '#0C0C0C',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  title: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: ui.text, fontSize: 22 },
  field: {
    marginTop: 12,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.28)',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    paddingHorizontal: 12,
  },
  choices: { marginTop: 8, flexDirection: 'row', gap: 8 },
  choice: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  choiceOn: { borderColor: ui.champagneDeep, backgroundColor: 'rgba(196,165,116,0.16)' },
  choiceImage: { width: 28, height: 28, borderRadius: 14 },
  choiceLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  choiceLabelOn: { color: ui.champagne },
  minutes: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  minute: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteLabel: { color: ui.text, fontFamily: fonts.text, fontSize: 12 },
  relevance: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  relevanceLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  relevanceDetail: { marginTop: 2, color: '#A39E96', fontFamily: fonts.text, fontSize: 12 },
  notice: { marginTop: 10, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13 },
  save: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ui.champagneDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
});
