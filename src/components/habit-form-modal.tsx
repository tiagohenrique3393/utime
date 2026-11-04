import { Image } from 'expo-image';
import { createElement, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitGlyph } from '@/components/habit-glyph';
import { dayButtonFill, fonts, ui } from '@/constants/theme';
import type { HabitPeriod, HabitPillar, HabitRelevance } from '@/lib/habit-catalog';
import { pillarLabels } from '@/lib/habit-catalog';
import { useModalGate } from '@/lib/modal-gate';

const corpo = require('@/assets/pillars/corpo-mantime.png');
const mente = require('@/assets/pillars/mente.png');
const espirito = require('@/assets/pillars/espirito.png');

const durations = [5, 10, 15, 20, 30, 45, 60, 90] as const;

const relevanceCopy: Record<HabitRelevance, { label: string; detail: string }> = {
  alta: { label: 'Alta', detail: 'Prioridade máxima ao seu dia.' },
  media: { label: 'Média', detail: 'Importante para a sua rotina.' },
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
  const windowSize = useWindowDimensions();
  const [draft, setDraft] = useState(initial);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [viewport, setViewport] = useState(windowSize.height);
  useModalGate(visible);

  useEffect(() => {
    if (visible) {
      setDraft(initial);
      setMinutesOpen(false);
    }
  }, [visible, initial]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof globalThis.window === 'undefined') {
      return;
    }
    const visual = globalThis.window.visualViewport;
    if (!visual) {
      return;
    }
    const sync = () => setViewport(visual.height);
    sync();
    visual.addEventListener('resize', sync);
    return () => visual.removeEventListener('resize', sync);
  }, [visible]);

  const maxHeight = Math.max(320, Math.min(windowSize.height, viewport) - insets.top - insets.bottom - 20);
  const minuteLabel = draft.minutes == null ? 'Sem tempo' : `${draft.minutes} min`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoid}>
        <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View accessibilityViewIsModal style={[styles.card, { maxHeight }]}>
            <View style={styles.head}>
              <View style={styles.plus}>
                <Text style={styles.plusLabel}>+</Text>
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} onPress={onClose} style={styles.close}>
                <Text style={styles.closeLabel}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.field}>Nome do hábito</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={draft.label}
                  onChangeText={(label) => setDraft((current) => ({ ...current, label }))}
                  placeholder="Ex.: Treinar, Ler, Estudar..."
                  placeholderTextColor={ui.faint}
                  maxLength={80}
                  accessibilityLabel="Nome do hábito"
                  style={styles.input}
                />
                <View pointerEvents="none" style={styles.inputIcon}>
                  <FieldMark name="pencil" />
                </View>
              </View>
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
                      style={[styles.choice, !selected && styles.choiceOff, selected && styles.choiceOn]}>
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
                  const icon = period === 'noite' ? 'moon' : 'sun';
                  return (
                    <Pressable
                      key={period}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={periodCopy[period]}
                      onPress={() => setDraft((current) => ({ ...current, period }))}
                      style={[styles.period, selected && dayButtonFill, selected && styles.periodOn]}>
                      <HabitGlyph name={icon} color={selected ? '#141210' : '#A39E96'} size={14} />
                      <Text style={[styles.choiceLabel, selected && styles.periodLabelOn]}>{periodCopy[period]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.field}>Tempo estimado</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: minutesOpen }}
                accessibilityLabel={`Tempo estimado, ${minuteLabel}`}
                onPress={() => setMinutesOpen((open) => !open)}
                style={styles.minuteCurrent}>
                <View style={styles.minuteLead}>
                  <FieldMark name="clock" />
                  <Text style={styles.minuteCurrentLabel}>{minuteLabel}</Text>
                </View>
                <Text style={styles.chevron}>{minutesOpen ? '⌃' : '⌄'}</Text>
              </Pressable>
              {minutesOpen ? (
                <View style={styles.minutes}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: draft.minutes == null }}
                    accessibilityLabel="Sem tempo"
                    onPress={() => {
                      setDraft((current) => ({ ...current, minutes: null }));
                      setMinutesOpen(false);
                    }}
                    style={[styles.minute, draft.minutes == null && styles.choiceOn]}>
                    <Text style={[styles.minuteLabel, draft.minutes == null && styles.choiceLabelOn]}>Sem tempo</Text>
                  </Pressable>
                  {durations.map((minutes) => {
                    const selected = draft.minutes === minutes;
                    return (
                      <Pressable
                        key={minutes}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${minutes} minutos`}
                        onPress={() => {
                          setDraft((current) => ({ ...current, minutes }));
                          setMinutesOpen(false);
                        }}
                        style={[styles.minute, selected && styles.choiceOn]}>
                        <Text style={[styles.minuteLabel, selected && styles.choiceLabelOn]}>{`${minutes} min`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
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
                    <FieldMark name={relevance === 'alta' ? 'crown' : relevance === 'media' ? 'target' : 'layers'} />
                    <View style={styles.relevanceCopy}>
                      <Text style={[styles.relevanceLabel, selected && styles.choiceLabelOn]}>{copy.label}</Text>
                      <Text style={styles.relevanceDetail}>{copy.detail}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={() => onSubmit(draft)}
              style={[styles.save, dayButtonFill, pending && styles.pressed]}>
              <Text style={styles.saveLabel}>{pending ? 'Salvando' : 'Salvar hábito'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldMark({ name }: { name: 'pencil' | 'clock' | 'crown' | 'target' | 'layers' }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.markFallback} />;
  }
  const path =
    name === 'pencil'
      ? 'M4 16.8V20h3.2L18.2 9 15 5.8 4 16.8zM15 5.8l2.2-2.2a1.2 1.2 0 0 1 1.7 0l1.5 1.5a1.2 1.2 0 0 1 0 1.7L18.2 9'
      : name === 'clock'
        ? 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 7.5V12l3 2'
        : name === 'crown'
          ? 'M4 16.5h16L18.6 8.2 14.2 12 12 6.5 9.8 12 5.4 8.2 4 16.5z'
          : name === 'target'
            ? 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'
            : 'M6 15.5h12v2.2H6zM7.2 11.2h9.6v2.2H7.2zM8.4 7h7.2v2.2H8.4z';
  return createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement('path', {
      d: path,
      fill: 'none',
      stroke: '#E8C99B',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1 },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8C99B',
    backgroundColor: '#0C0C0C',
    boxShadow: '0 0 22px rgba(226,170,70,0.38)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  plus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: ui.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusLabel: { color: ui.champagne, fontSize: 16, lineHeight: 18 },
  title: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: ui.text, fontSize: 22 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingBottom: 8 },
  field: {
    marginTop: 10,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputRow: { marginTop: 6, justifyContent: 'center' },
  input: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.28)',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    paddingLeft: 12,
    paddingRight: 36,
  },
  inputIcon: { position: 'absolute', right: 12, top: 13 },
  choices: { marginTop: 6, flexDirection: 'row', gap: 6 },
  choice: {
    flex: 1,
    minHeight: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  choiceOff: { opacity: 0.72 },
  period: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  choiceOn: {
    borderColor: '#E7C99A',
    backgroundColor: 'rgba(231, 201, 154, 0.2)',
    boxShadow: '0 0 12px rgba(231, 201, 154, 0.28)',
  },
  markFallback: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.champagne },
  choiceImage: { width: 42, height: 46 },
  choiceLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  choiceLabelOn: { color: ui.champagne },
  periodOn: { borderColor: '#E7C99A' },
  periodLabelOn: { color: '#141210' },
  minuteCurrent: {
    marginTop: 6,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.28)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minuteLead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  minuteCurrentLabel: { color: ui.text, fontFamily: fonts.text, fontSize: 14 },
  chevron: { color: ui.champagne, fontSize: 14 },
  minutes: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  minute: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteLabel: { color: ui.text, fontFamily: fonts.text, fontSize: 12 },
  relevance: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relevanceCopy: { flex: 1 },
  relevanceLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  relevanceDetail: { marginTop: 1, color: '#A39E96', fontFamily: fonts.text, fontSize: 12 },
  notice: { marginTop: 8, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13 },
  save: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
});
