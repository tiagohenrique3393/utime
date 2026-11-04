import { Image } from 'expo-image';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayPlanet } from '@/components/day-planet';
import { HabitFormModal, type HabitDraft } from '@/components/habit-form-modal';
import { HabitGlyph } from '@/components/habit-glyph';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  addCustomHabit,
  getCatalogHabits,
  getUserHabits,
  habitPeriods,
  habitPillars,
  habitTitle,
  hydrateHabitRoutine,
  pillarLabels,
  removeUserHabit,
  reorderPeriodHabits,
  subscribeHabitRoutine,
  updateUserHabit,
  type HabitPeriod,
  type HabitPillar,
  type HabitRelevance,
  type UserHabit,
} from '@/lib/habit-catalog';
import { habitIconFor, periodCopy, suggestedMinutes } from '@/lib/habit-visual';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';
const corpoMale = require('@/assets/pillars/corpo-mantime.png');
const corpoFemale = require('@/assets/pillars/corpo-womantime.png');
const menteFigure = require('@/assets/pillars/mente.png');
const espiritoFigure = require('@/assets/pillars/espirito.png');

const relevanceName: Record<HabitRelevance, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

function pillarFigure(pillar: HabitPillar, feminine: boolean) {
  if (pillar === 'corpo') {
    return feminine ? corpoFemale : corpoMale;
  }
  if (pillar === 'mente') {
    return menteFigure;
  }
  return espiritoFigure;
}

const emptyDraft: HabitDraft = {
  label: '',
  pillar: 'corpo',
  period: 'manha',
  minutes: 10,
  relevance: null,
};

export default function PersonalizeHabitsScreen() {
  const signedIn = useRequireSession();
  const catalog = useSyncExternalStore(subscribeHabitRoutine, getCatalogHabits, getCatalogHabits);
  const habits = useSyncExternalStore(subscribeHabitRoutine, getUserHabits, getUserHabits);
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const feminine = profile.journey === 'womantime';
  const [open, setOpen] = useState<Record<HabitPeriod, boolean>>({ manha: false, tarde: false, noite: false });
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; habitId: string | null; draft: HabitDraft } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<UserHabit | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (userId) {
        void hydrateHabitRoutine(userId);
      }
    }, []),
  );

  const active = habits.filter((habit) => habit.active);

  async function shift(period: HabitPeriod, habitId: string, delta: number) {
    const group = active.filter((habit) => habit.period === period);
    const index = group.findIndex((habit) => habit.id === habitId);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= group.length) {
      return;
    }
    const order = group.map((habit) => habit.id);
    const [moved] = order.splice(index, 1);
    if (!moved) {
      return;
    }
    order.splice(next, 0, moved);
    const result = await reorderPeriodHabits(period, order);
    if (!result.ok) {
      setNotice(result.message);
    }
  }

  function draftFrom(habit: UserHabit): HabitDraft {
    const label = habitTitle(habit, catalog);
    return {
      label,
      pillar: habit.pillar,
      period: habit.period,
      minutes: habit.minutes ?? suggestedMinutes(label, habit.catalogHabitId) ?? 10,
      relevance: habit.relevance,
    };
  }

  async function saveDraft(draft: HabitDraft) {
    const label = draft.label.trim();
    if (label.length === 0 || label.length > 80) {
      setNotice('Informe o nome do hábito.');
      return;
    }
    if (!draft.relevance) {
      setNotice('Escolha a relevância do hábito: alta, média ou baixa.');
      return;
    }
    setPending(true);
    if (editor?.mode === 'edit' && editor.habitId) {
      const result = await updateUserHabit(editor.habitId, {
        label,
        pillar: draft.pillar,
        period: draft.period,
        minutes: draft.minutes,
        relevance: draft.relevance,
      });
      setPending(false);
      setNotice(result.ok ? '' : result.message);
      if (result.ok) {
        setEditor(null);
      }
      return;
    }
    const created = await addCustomHabit({
      label,
      period: draft.period,
      pillar: draft.pillar,
      relevance: draft.relevance,
    });
    if (created.ok && draft.minutes != null) {
      const saved = getUserHabits().find((habit) => habit.active && habit.customLabel?.trim() === label);
      if (saved) {
        await updateUserHabit(saved.id, { minutes: draft.minutes });
      }
    }
    setPending(false);
    setNotice(created.ok ? 'Hábito adicionado à sua rotina.' : created.message);
    if (created.ok) {
      setEditor(null);
      setOpen((current) => ({ ...current, [draft.period]: true }));
    }
  }

  async function removeOne(habit: UserHabit) {
    setPending(true);
    const result = await removeUserHabit(habit.id);
    setPending(false);
    setNotice(result.ok ? '' : result.message);
    if (result.ok) {
      setConfirmRemove(null);
    }
  }

  async function removeAll() {
    setPending(true);
    for (const habit of getUserHabits().filter((item) => item.active)) {
      const result = await removeUserHabit(habit.id);
      if (!result.ok) {
        setPending(false);
        setNotice(result.message);
        return;
      }
    }
    setPending(false);
    setConfirmAll(false);
    setNotice('');
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<DayPlanet />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.navigate('/meu-dia' as Href)} style={styles.back}>
        <Text style={styles.backLabel}>‹ Voltar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Personalizar hábitos
      </Text>
      <Text style={styles.lead}>Monte sua rotina ideal.</Text>
      <Text style={styles.copy}>Adicione, edite ou remova os hábitos. Ajuste por pilar e por período.</Text>
      <View style={styles.pillars}>
        {habitPillars.map((pillar) => {
          const count = active.filter((habit) => habit.pillar === pillar).length;
          return (
            <View key={pillar} style={styles.pillar}>
              <Image source={pillarFigure(pillar, feminine)} contentFit="cover" style={styles.pillarImage} />
              <Text style={styles.pillarName}>{pillarLabels[pillar]}</Text>
              <Text style={styles.pillarCount}>{`${count} ${count === 1 ? 'hábito' : 'hábitos'}`}</Text>
            </View>
          );
        })}
      </View>
      <View accessibilityRole="summary" style={styles.circle}>
        <Text style={styles.circleMark}>◎</Text>
        <View style={styles.circleCopy}>
          <Text style={styles.circleTitle}>Círculo / Ranking</Text>
          <Text style={styles.circleText}>Requisitos: 10 hábitos (2 Alta · 4 Média · 4 Baixa)</Text>
        </View>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {habitPeriods.map((period) => {
        const group = active.filter((habit) => habit.period === period);
        return (
          <View key={period} style={styles.block}>
            <Image pointerEvents="none" source={period === 'manha' ? require('@/assets/period-manha.jpg') : period === 'tarde' ? require('@/assets/period-tarde.jpg') : require('@/assets/period-noite.jpg')} contentFit="cover" style={styles.periodPhoto} />
            <View pointerEvents="none" style={styles.periodShade} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open[period] }}
              onPress={() => setOpen((current) => ({ ...current, [period]: !current[period] }))}
              style={styles.blockHead}>
              <View style={styles.blockCopy}>
                <Text style={styles.blockTitle}>{periodCopy[period].title}</Text>
                <Text style={styles.blockSubtitle}>{periodCopy[period].subtitle}</Text>
              </View>
              <Text style={styles.blockCount}>{`${group.length} ${group.length === 1 ? 'hábito' : 'hábitos'}`}</Text>
              <Text style={styles.chevron}>{open[period] ? '⌃' : '⌄'}</Text>
            </Pressable>
            {open[period] ? (
              <>
                {group.map((habit, index) => {
                  const label = habitTitle(habit, catalog);
                  const minutes = habit.minutes ?? suggestedMinutes(label, habit.catalogHabitId);
                  return (
                    <View key={habit.id} style={styles.row}>
                      <View style={styles.order}>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Subir ${label}`} disabled={index === 0} onPress={() => void shift(period, habit.id, -1)} style={styles.orderButton}>
                          <Text style={styles.orderLabel}>↑</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Descer ${label}`} disabled={index === group.length - 1} onPress={() => void shift(period, habit.id, 1)} style={styles.orderButton}>
                          <Text style={styles.orderLabel}>↓</Text>
                        </Pressable>
                      </View>
                      <HabitGlyph name={habitIconFor(label, habit.catalogHabitId)} color={ui.champagne} />
                      <View style={styles.rowCopy}>
                        <Text numberOfLines={1} style={styles.rowLabel}>
                          {label}
                        </Text>
                        <Text style={styles.rowMeta}>{minutes != null ? `${minutes} min` : 'Sem duração'}{habit.relevance ? ` · ${relevanceName[habit.relevance]}` : ''}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${label}`} onPress={() => setEditor({ mode: 'edit', habitId: habit.id, draft: draftFrom(habit) })} style={styles.iconButton}>
                        <Text style={styles.iconLabel}>✎</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${label}`} onPress={() => setConfirmRemove(habit)} style={styles.iconButton}>
                        <Text style={styles.removeLabel}>⌫</Text>
                      </Pressable>
                    </View>
                  );
                })}
                <View style={styles.legend}>
                  <Text style={styles.legendItem}>Arrastar{'\n'}Altere a ordem dos hábitos.</Text>
                  <Text style={styles.legendItem}>Editar{'\n'}Mude o hábito, período ou relevância.</Text>
                  <Text style={styles.legendItem}>Remover{'\n'}Exclua o hábito da sua rotina.</Text>
                </View>
              </>
            ) : null}
          </View>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => { setNotice(''); setEditor({ mode: 'create', habitId: null, draft: emptyDraft }); }} style={styles.add}>
        <Text style={styles.addLabel}>Adicionar hábito</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setConfirmAll(true)} style={styles.removeAll}>
        <Text style={styles.removeAllLabel}>Remover todos os hábitos</Text>
      </Pressable>
      <HabitFormModal
        visible={editor !== null}
        title={editor?.mode === 'edit' ? 'Editar hábito' : 'Novo hábito'}
        initial={editor?.draft ?? emptyDraft}
        pending={pending}
        notice={editor ? notice : ''}
        onClose={() => {
          if (!pending) {
            setEditor(null);
          }
        }}
        onSubmit={(draft) => void saveDraft(draft)}
      />
      <Modal visible={confirmRemove !== null} transparent animationType="fade" onRequestClose={() => setConfirmRemove(null)}>
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remover hábito</Text>
            <Text style={styles.dialogCopy}>O hábito sai da rotina. O histórico de check-in permanece.</Text>
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => confirmRemove && void removeOne(confirmRemove)} style={styles.removeAll}>
              <Text style={styles.removeAllLabel}>Remover</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmRemove(null)} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={confirmAll} transparent animationType="fade" onRequestClose={() => setConfirmAll(false)}>
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remover todos os hábitos</Text>
            <Text style={styles.dialogCopy}>A rotina fica vazia. Check-ins, pontuação e conquistas já registrados permanecem.</Text>
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => void removeAll()} style={styles.removeAll}>
              <Text style={styles.removeAllLabel}>Remover todos</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirmAll(false)} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  back: { minHeight: 36, justifyContent: 'center' },
  backLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: ui.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: 0.3, textTransform: 'uppercase' },
  lead: { marginTop: 8, color: ui.textChampagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.6 },
  copy: { marginTop: 4, color: '#A39E96', fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  pillars: { marginTop: 16, flexDirection: 'row', gap: 8 },
  pillar: { flex: 1, alignItems: 'center', gap: 4 },
  pillarImage: { width: 72, height: 84, borderRadius: 16 },
  pillarName: { color: ui.text, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  pillarCount: { color: '#A39E96', fontFamily: fonts.text, fontSize: 11 },
  circle: {
    marginTop: 14,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(196,165,116,0.35)',
    backgroundColor: 'rgba(18,16,12,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  circleMark: { color: ui.champagne, fontSize: 16 },
  circleCopy: { flex: 1 },
  circleTitle: { color: ui.champagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  circleText: { marginTop: 2, color: '#C8C2B8', fontFamily: fonts.text, fontSize: 11, lineHeight: 15 },
  notice: { marginTop: 10, color: ui.textChampagne, fontFamily: fonts.text, fontSize: 13 },
  block: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,200,142,0.16)', backgroundColor: '#0A0A0A', overflow: 'hidden' },
  periodPhoto: { position: 'absolute', top: 0, right: 0, left: 0, height: 74 },
  periodShade: { position: 'absolute', top: 0, right: 0, left: 0, height: 74, backgroundColor: 'rgba(5,5,5,0.62)' },
  blockHead: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  blockCopy: { flex: 1 },
  blockTitle: { color: ui.text, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.8, textTransform: 'uppercase' },
  blockSubtitle: { color: '#A39E96', fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  blockCount: { color: ui.text, fontFamily: fonts.text, fontSize: 12 },
  chevron: { color: ui.textChampagne, width: 16, textAlign: 'center' },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: 'rgba(243,239,232,0.08)' },
  order: { width: 28 },
  orderButton: { minHeight: 22, alignItems: 'center', justifyContent: 'center' },
  orderLabel: { color: '#8E8A84', fontSize: 12 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: ui.text, fontFamily: fonts.text, fontSize: 13 },
  rowMeta: { marginTop: 2, color: '#A39E96', fontFamily: fonts.text, fontSize: 11 },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  iconLabel: { color: ui.champagne, fontSize: 16 },
  removeLabel: { color: '#E15A4C', fontSize: 16 },
  legend: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(243,239,232,0.08)' },
  legendItem: { flex: 1, color: '#8E8A84', fontFamily: fonts.text, fontSize: 10, lineHeight: 13, textTransform: 'uppercase' },
  add: { marginTop: 16, minHeight: 50, borderRadius: 999, backgroundColor: ui.champagneDeep, alignItems: 'center', justifyContent: 'center' },
  addLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
  removeAll: { marginTop: 10, minHeight: 46, borderRadius: 999, borderWidth: 1, borderColor: '#E15A4C', alignItems: 'center', justifyContent: 'center' },
  removeAllLabel: { color: '#E15A4C', fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,201,155,0.35)', backgroundColor: '#0C0C0C', padding: 16 },
  dialogTitle: { color: ui.text, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase' },
  dialogCopy: { marginTop: 8, color: '#C8C2B8', fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  cancel: { marginTop: 8, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
});
