import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, Meta, PageTitle, PrimaryButton, TextButton, Track } from '@/components/app-screen';
import { HydrationMeter } from '@/components/hydration-meter';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dailyCounts, refreshDailyBoard, toggleDailyHabit } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { habitPillars, periodLabels, pillarLabels, relevanceLabels } from '@/lib/habit-catalog';
import { formatCalendarDate, formatDailyPercent, formatLongDate, parseDateKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';
import { HYDRATION_HABIT_ID } from '@/lib/suggested-habits';

export default function MyDayScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ data?: string | string[] }>();
  const selectedDate = parseDateKey(params.data);
  const board = useDailyBoard(selectedDate);
  const counts = dailyCounts(board.habits, board.completed);
  const userId = getSessionUserId();

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen>
      <View style={styles.links}>
        <TextButton label="Jornada" onPress={() => router.navigate('/trinta-dias')} />
      </View>
      <View style={styles.header}>
        <Eyebrow>Evolução pessoal</Eyebrow>
        <PageTitle compact>Meu dia</PageTitle>
        <Meta>{board.dateKey ? `${formatLongDate(board.dateKey)} · ${formatCalendarDate(board.dateKey)}` : ''}</Meta>
      </View>

      {!board.ready ? <Text style={styles.note}>Carregando sua rotina.</Text> : null}

      {board.ready && board.habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.note}>Nenhum hábito na rotina.</Text>
        </View>
      ) : null}

      {board.ready && board.habits.length > 0 ? (
        <>
          <Text style={styles.percent}>{formatDailyPercent(counts.percent)}</Text>
          <Text style={styles.count}>
            {counts.done} de {counts.total} hábitos
          </Text>
          <View style={styles.track}>
            <Track percent={counts.percent} />
          </View>
          <Meta>Evolução pessoal. Não altera o ranking.</Meta>
          {board.notice ? <Text style={styles.notice}>{board.notice}</Text> : null}

          {habitPillars.map((pillar) => {
            const group = board.habits.filter((habit) => habit.pillar === pillar);
            if (group.length === 0) {
              return null;
            }
            return (
              <View key={pillar} style={styles.group}>
                <Text style={styles.groupTitle}>{pillarLabels[pillar]}</Text>
                {group.map((habit) => {
                  const hydration = habit.catalogHabitId === HYDRATION_HABIT_ID;
                  const checked = habit.userHabitId !== null && board.completed.has(habit.userHabitId);
                  const relevance = habit.relevance;
                  return (
                    <View key={habit.id}>
                      <Pressable
                        accessibilityRole={hydration ? 'button' : 'checkbox'}
                        accessibilityState={hydration ? undefined : { checked }}
                        accessibilityLabel={habit.label}
                        onPress={hydration ? undefined : () => void toggleDailyHabit(habit)}
                        style={({ pressed }) => [styles.task, pressed && !hydration && styles.pressed]}>
                        <View style={styles.copy}>
                          <Text style={[styles.taskLabel, checked && styles.taskDone]}>{habit.label}</Text>
                          <Text style={styles.state}>
                            {checked ? 'Concluído' : hydration ? 'Pelo contador de água' : periodLabels[habit.period]}
                            {relevance ? ` · ${relevanceLabels[relevance]}` : ''}
                          </Text>
                        </View>
                        <View style={[styles.mark, checked && styles.markOn]} />
                      </Pressable>
                      {hydration && userId && board.dateKey ? (
                        <HydrationMeter
                          userId={userId}
                          dateKey={board.dateKey}
                          onSaved={() => {
                            void refreshDailyBoard(userId, selectedDate ?? undefined);
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>
      ) : null}

      {board.ready ? (
        <View style={styles.personalize}>
          <PrimaryButton label="Personalizar hábitos" onPress={() => router.push('/personalizar-habitos' as Href)} />
        </View>
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
  personalize: {
    marginTop: 28,
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
