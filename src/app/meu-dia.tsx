import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, Meta, PageTitle, PrimaryButton, TextButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  getCatalogHabits,
  getUserHabits,
  habitPillars,
  habitTitle,
  hydrateHabitRoutine,
  isHabitRoutinePersonalized,
  periodLabels,
  pillarLabels,
  relevanceLabels,
  subscribeHabitRoutine,
} from '@/lib/habit-catalog';
import { loadCompletedHabitIds, personalCompletionPercent, setHabitCompleted, todayKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

function formatToday(date = new Date()) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function MyDayScreen() {
  const signedIn = useRequireSession();
  const catalog = useSyncExternalStore(subscribeHabitRoutine, getCatalogHabits, getCatalogHabits);
  const habits = useSyncExternalStore(subscribeHabitRoutine, getUserHabits, getUserHabits);
  const personalized = useSyncExternalStore(
    subscribeHabitRoutine,
    isHabitRoutinePersonalized,
    isHabitRoutinePersonalized,
  );
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [logNotice, setLogNotice] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dayLabel, setDayLabel] = useState(formatToday);

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      setDayLabel(formatToday());
      void (async () => {
        await hydrateHabitRoutine(userId);
        if (!active) {
          return;
        }
        const routine = getUserHabits().filter((habit) => habit.active);
        if (!isHabitRoutinePersonalized() && routine.length === 0) {
          setDone(new Set());
          setLogNotice('');
          setPhase('ready');
          return;
        }
        const result = await loadCompletedHabitIds(userId, todayKey());
        if (!active) {
          return;
        }
        setDone(new Set(result.ids));
        setLogNotice(result.ok ? '' : result.message);
        setPhase('ready');
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function toggle(habitId: string) {
    const userId = getSessionUserId();
    if (!userId || togglingId) {
      return;
    }
    const next = !done.has(habitId);
    setTogglingId(habitId);
    const result = await setHabitCompleted(userId, habitId, todayKey(), next);
    setTogglingId(null);
    if (!result.ok) {
      setLogNotice(result.message);
      return;
    }
    setLogNotice('');
    setDone((current) => {
      const copy = new Set(current);
      if (next) {
        copy.add(habitId);
      } else {
        copy.delete(habitId);
      }
      return copy;
    });
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const active = habits.filter((habit) => habit.active);
  const completedCount = active.filter((habit) => done.has(habit.id)).length;
  const percent = personalCompletionPercent(active.length, completedCount);
  const routineReady = personalized || active.length > 0;

  return (
    <AppScreen>
      <View style={styles.links}>
        <TextButton label="Perfil" onPress={() => router.navigate('/perfil')} />
        <TextButton label="Personalizar hábitos" onPress={() => router.push('/personalizar-habitos' as Href)} />
      </View>
      <View style={styles.header}>
        <Eyebrow>Evolução pessoal</Eyebrow>
        <PageTitle compact>Meu dia</PageTitle>
        <Meta>{dayLabel}</Meta>
      </View>

      {phase === 'loading' ? <Text style={styles.note}>Carregando sua rotina.</Text> : null}

      {phase === 'ready' && !routineReady ? (
        <View style={styles.empty}>
          <Text style={styles.note}>
            Sua rotina personalizada ainda não foi criada. Os hábitos oficiais continuam na jornada, em Hoje.
          </Text>
          <PrimaryButton label="Personalizar hábitos" onPress={() => router.push('/personalizar-habitos' as Href)} />
        </View>
      ) : null}

      {phase === 'ready' && routineReady ? (
        <>
          <Text style={styles.percent}>{percent}%</Text>
          <Text style={styles.count}>
            {active.length === 0 ? 'Nenhum hábito na rotina.' : `${completedCount} de ${active.length} hábitos`}
          </Text>
          <View style={styles.track}>
            <Track percent={percent} />
          </View>
          <Meta>Evolução pessoal. Não altera o ranking.</Meta>
          {logNotice ? <Text style={styles.notice}>{logNotice}</Text> : null}

          {active.length === 0 ? (
            <View style={styles.empty}>
              <TextButton label="Personalizar hábitos" onPress={() => router.push('/personalizar-habitos' as Href)} />
            </View>
          ) : (
            habitPillars.map((pillar) => {
              const group = active.filter((habit) => habit.pillar === pillar);
              if (group.length === 0) {
                return null;
              }
              return (
                <View key={pillar} style={styles.group}>
                  <Text style={styles.groupTitle}>{pillarLabels[pillar]}</Text>
                  {group.map((habit) => {
                    const checked = done.has(habit.id);
                    const busy = togglingId === habit.id;
                    return (
                      <Pressable
                        key={habit.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked, busy }}
                        accessibilityLabel={habitTitle(habit, catalog)}
                        disabled={togglingId !== null}
                        onPress={() => void toggle(habit.id)}
                        style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
                        <View style={styles.copy}>
                          <Text style={[styles.taskLabel, checked && styles.taskDone]}>{habitTitle(habit, catalog)}</Text>
                          <Text style={styles.state}>
                            {busy
                              ? 'Salvando'
                              : `${checked ? 'Concluído' : periodLabels[habit.period]}${
                                  habit.relevance ? ` · ${relevanceLabels[habit.relevance]}` : ''
                                }`}
                          </Text>
                        </View>
                        <View style={[styles.mark, checked && styles.markOn]} />
                      </Pressable>
                    );
                  })}
                </View>
              );
            })
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  header: {
    marginTop: 8,
    gap: 8,
  },
  percent: {
    marginTop: 28,
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 64,
    lineHeight: 72,
  },
  count: {
    marginTop: 4,
    marginBottom: 16,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    marginBottom: 12,
  },
  group: {
    marginTop: 28,
  },
  groupTitle: {
    marginBottom: 6,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  task: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  taskLabel: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 21,
  },
  taskDone: {
    color: ui.champagne,
  },
  state: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: ui.line,
  },
  markOn: {
    backgroundColor: ui.champagne,
    borderColor: ui.champagne,
  },
  empty: {
    marginTop: 28,
    gap: 16,
  },
  note: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  notice: {
    marginTop: 12,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
