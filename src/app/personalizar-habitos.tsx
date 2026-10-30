import { Image } from 'expo-image';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayPlanet } from '@/components/day-planet';
import { HabitGlyph } from '@/components/habit-glyph';
import { HabitRelevanceChoices } from '@/components/habit-relevance-choices';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
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
  type HabitRelevance,
  type UserHabit,
} from '@/lib/habit-catalog';
import { habitAcceptsDuration, habitIconFor, parseHabitMinutes, periodCopy, pillarTone, suggestedMinutes } from '@/lib/habit-visual';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';
const periodImage: Record<HabitPeriod, number> = {
  manha: require('@/assets/period-manha.jpg'),
  tarde: require('@/assets/period-tarde.jpg'),
  noite: require('@/assets/period-noite.jpg'),
};

export default function PersonalizeHabitsScreen() {
  const signedIn = useRequireSession();
  const catalog = useSyncExternalStore(subscribeHabitRoutine, getCatalogHabits, getCatalogHabits);
  const habits = useSyncExternalStore(subscribeHabitRoutine, getUserHabits, getUserHabits);
  const [open, setOpen] = useState<Record<HabitPeriod, boolean>>({ manha: true, tarde: true, noite: true });
  const [editing, setEditing] = useState<string | null>(null);
  const [minutesText, setMinutesText] = useState('');
  const [notice, setNotice] = useState('');
  const dragY = useRef(0);
  const relevanceChain = useRef(new Map<string, Promise<void>>());

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

  function openMinutes(habit: UserHabit, label: string) {
    const current = habit.minutes ?? suggestedMinutes(label, habit.catalogHabitId);
    setEditing(habit.id);
    setMinutesText(current == null ? '' : String(current));
    setNotice('');
  }

  async function saveMinutes(habit: UserHabit) {
    const parsed = parseHabitMinutes(minutesText);
    if (!parsed.ok) {
      setNotice(parsed.message);
      return;
    }
    const result = await updateUserHabit(habit.id, { minutes: parsed.minutes });
    if (!result.ok) {
      setNotice('Não foi possível salvar a duração. Tente novamente.');
      return;
    }
    setNotice('');
    setEditing(null);
  }

  function saveRelevance(habit: UserHabit, next: HabitRelevance) {
    if (habit.relevance === next) {
      return;
    }
    const previous = relevanceChain.current.get(habit.id) ?? Promise.resolve();
    const run = previous.then(async () => {
      const latest = getUserHabits().find((item) => item.id === habit.id);
      if (!latest || latest.relevance === next) {
        return;
      }
      const result = await updateUserHabit(latest.id, { relevance: next });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setNotice('');
    });
    relevanceChain.current.set(habit.id, run);
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
        Personalizar{'\n'}hábitos
      </Text>
      <Text style={styles.lead}>Monte sua rotina ideal</Text>
      <Text style={styles.copy}>Adicione, remova ou ajuste os hábitos. Sua rotina, no seu ritmo.</Text>
      <View style={styles.pillars}>
        {habitPillars.map((pillar) => {
          const count = active.filter((habit) => habit.pillar === pillar).length;
          return (
            <View key={pillar} style={styles.pillar}>
              <HabitGlyph name={pillar === 'corpo' ? 'run' : pillar === 'mente' ? 'brain' : 'lotus'} color={pillarTone[pillar]} size={22} />
              <Text style={[styles.pillarName, { color: pillarTone[pillar] }]}>{pillarLabels[pillar]}</Text>
              <Text style={styles.pillarCount}>{`${count} ${count === 1 ? 'hábito' : 'hábitos'}`}</Text>
            </View>
          );
        })}
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {habitPeriods.map((period) => {
        const group = active.filter((habit) => habit.period === period);
        return (
          <View key={period} style={styles.block}>
            <Image pointerEvents="none" source={periodImage[period]} contentFit="cover" style={styles.periodPhoto} />
            <View pointerEvents="none" style={styles.periodShade} />
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open[period] }} onPress={() => setOpen((current) => ({ ...current, [period]: !current[period] }))} style={styles.blockHead}>
              <HabitGlyph name={period === 'noite' ? 'moon' : 'sun'} color={period === 'noite' ? '#8EB7E8' : '#E8C88E'} />
              <View style={styles.blockCopy}>
                <Text style={styles.blockTitle}>{periodCopy[period].title}</Text>
                <Text style={styles.blockSubtitle}>{periodCopy[period].subtitle}</Text>
              </View>
              <Text style={styles.blockCount}>{String(group.length)}</Text>
              <Text style={styles.chevron}>{open[period] ? '⌃' : '⌄'}</Text>
            </Pressable>
            {open[period]
              ? group.map((habit) => {
                  const label = habitTitle(habit, catalog);
                  const duration = habit.minutes ?? suggestedMinutes(label, habit.catalogHabitId);
                  const canEditDuration = habitAcceptsDuration(label, habit.catalogHabitId) && duration != null;
                  return (
                    <View key={habit.id} style={styles.row}>
                      <View
                        accessibilityLabel={`Reordenar ${label}`}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderGrant={(event) => {
                          dragY.current = event.nativeEvent.pageY;
                        }}
                        onResponderMove={(event) => {
                          const delta = event.nativeEvent.pageY - dragY.current;
                          if (delta > 28) {
                            dragY.current += 28;
                            void shift(period, habit.id, 1);
                          } else if (delta < -28) {
                            dragY.current -= 28;
                            void shift(period, habit.id, -1);
                          }
                        }}
                        style={styles.grip}>
                        <Text style={styles.gripMark}>≡</Text>
                      </View>
                      <HabitGlyph name={habitIconFor(label, habit.catalogHabitId)} color={pillarTone[habit.pillar]} />
                      <View style={styles.rowCopy}>
                        <Text numberOfLines={1} style={styles.rowLabel}>
                          {label}
                        </Text>
                        {canEditDuration && editing === habit.id ? (
                          <View style={styles.minutesEdit}>
                            <TextInput
                              autoFocus
                              value={minutesText}
                              onChangeText={(value) => {
                                setMinutesText(value.replace(/\D/g, '').slice(0, 4));
                                setNotice('');
                              }}
                              onSubmitEditing={() => void saveMinutes(habit)}
                              keyboardType="number-pad"
                              inputMode="numeric"
                              returnKeyType="done"
                              maxLength={4}
                              placeholder="Minutos"
                              placeholderTextColor={ui.faint}
                              accessibilityLabel={`Duração de ${label} em minutos`}
                              style={styles.minutesInput}
                            />
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Salvar duração de ${label}`}
                              onPress={() => void saveMinutes(habit)}
                              style={styles.minutesSave}>
                              <Text style={styles.minutesSaveLabel}>OK</Text>
                            </Pressable>
                          </View>
                        ) : canEditDuration ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Editar duração de ${label}`}
                            hitSlop={10}
                            onPress={() => openMinutes(habit, label)}
                            style={styles.minutesButton}>
                            <Text style={styles.minutes}>{`${duration} MIN`}</Text>
                          </Pressable>
                        ) : null}
                        <HabitRelevanceChoices
                          title="Relevância"
                          unclassified={habit.relevance === null}
                          value={habit.relevance}
                          habitLabel={label}
                          onChange={(next) => saveRelevance(habit, next)}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${label}`}
                        onPress={() => void removeUserHabit(habit.id)}
                        style={styles.remove}>
                        <Text style={styles.removeLabel}>−</Text>
                      </Pressable>
                    </View>
                  );
                })
              : null}
            <Pressable accessibilityRole="button" onPress={() => router.push(`/adicionar-habito?periodo=${period}` as Href)} style={styles.add}>
              <Text style={styles.addLabel}>+ Adicionar hábito</Text>
            </Pressable>
          </View>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  back: { minHeight: 36, justifyContent: 'center' },
  backLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: ui.text, fontFamily: fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: 0.4, textTransform: 'uppercase' },
  lead: { marginTop: 8, color: ui.textChampagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  copy: { marginTop: 6, color: '#A39E96', fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  pillars: { marginTop: 18, flexDirection: 'row', gap: 8 },
  pillar: {
    flex: 1,
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,200,142,0.16)',
    backgroundColor: 'rgba(12,12,12,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pillarName: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  pillarCount: { color: '#A39E96', fontFamily: fonts.text, fontSize: 11 },
  notice: { marginTop: 12, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13 },
  block: { marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,200,142,0.16)', backgroundColor: '#0A0A0A', overflow: 'hidden' },
  periodPhoto: { position: 'absolute', top: 0, right: 0, left: 0, height: 72 },
  periodShade: { position: 'absolute', top: 0, right: 0, left: 0, height: 72, backgroundColor: 'rgba(5,5,5,0.58)' },
  blockHead: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  blockCopy: { flex: 1 },
  blockTitle: { color: ui.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: 1.1, textTransform: 'uppercase' },
  blockSubtitle: { color: '#A39E96', fontFamily: fonts.display, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  blockCount: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 14 },
  chevron: { color: ui.textChampagne, width: 16, textAlign: 'center' },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: 'rgba(243,239,232,0.08)' },
  grip: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  gripMark: { color: '#8E8A84', fontSize: 16 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: ui.text, fontFamily: fonts.text, fontSize: 15 },
  minutesButton: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', marginTop: 2, paddingRight: 8 },
  minutes: { color: '#A39E96', fontFamily: fonts.text, fontSize: 11, letterSpacing: 0.6 },
  minutesEdit: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  minutesInput: { flex: 1, minWidth: 0, height: 36, borderRadius: 8, borderWidth: 1, borderColor: ui.line, color: ui.text, fontFamily: fonts.text, fontSize: 14, paddingHorizontal: 8 },
  minutesSave: { minWidth: 44, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(232,200,142,0.45)' },
  minutesSaveLabel: { color: ui.textChampagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1 },
  remove: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E15A4C', alignItems: 'center', justifyContent: 'center' },
  removeLabel: { color: '#fff', fontSize: 18, lineHeight: 20 },
  add: { minHeight: 46, margin: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(232,200,142,0.45)', alignItems: 'center', justifyContent: 'center' },
  addLabel: { color: ui.textChampagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
});
