import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ConsistencyCalendar } from '@/components/consistency-calendar';
import { ConstancyPlanet } from '@/components/constancy-planet';
import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { bestStreak, currentStreak, marksFromLogs, yearExcellence, type DayMark } from '@/lib/constancy';
import { refreshDailyBoard } from '@/lib/daily-board';
import { loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

function monthOf(day: string) {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
}

export default function ConstancyScreen() {
  const signedIn = useRequireSession();
  const [today, setToday] = useState('');
  const [marks, setMarks] = useState<Map<string, DayMark>>(() => new Map());
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      void (async () => {
        const day = todayKey();
        try {
          await refreshDailyBoard(userId, day);
        } catch {
          // A leitura segue com as linhas já gravadas.
        }
        const closed = todayKey();
        const logs = await loadHabitLogsUntil(userId, closed);
        if (!active) {
          return;
        }
        if (!logs.ok) {
          setPhase('error');
          setNotice(logs.message);
          return;
        }
        setToday(closed);
        setMarks(marksFromLogs(logs.rows));
        setCursor((current) => current ?? monthOf(closed));
        setNotice('');
        setPhase('ready');
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  const viewed = cursor ?? (today ? monthOf(today) : null);
  const streak = today ? currentStreak(marks, today) : 0;
  const record = today ? bestStreak(marks, today) : 0;
  const excellence = viewed && today ? yearExcellence(marks, viewed.year, today) : null;

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<ConstancyPlanet />}>
      <Text accessibilityRole="header" style={styles.title}>
        CONSTÂNCIA
      </Text>

      {phase === 'loading' ? <Text style={styles.note}>Carregando sua constância.</Text> : null}
      {phase === 'error' ? <Text style={styles.note}>{notice}</Text> : null}

      {phase === 'ready' && today && viewed && excellence ? (
        <>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.figure}>
                <Text style={styles.number}>{streak}</Text>
                <Text style={styles.unit}>DIAS</Text>
              </View>
              <Text style={styles.statLabel}>SEQUÊNCIA ATUAL</Text>
            </View>
            <View style={styles.stat}>
              <View style={styles.figure}>
                <Text style={styles.number}>{record}</Text>
                <Text style={styles.unit}>DIAS</Text>
              </View>
              <Text style={styles.statLabel}>RECORDE</Text>
            </View>
          </View>

          <View style={styles.calendar}>
            <ConsistencyCalendar
              today={today}
              cursor={viewed}
              marks={marks}
              onCursor={setCursor}
              onOpenDay={(dateKey) => router.push(`/consulta-dia?data=${dateKey}` as Href)}
            />
          </View>

          <View style={styles.excellence}>
            <Text style={styles.excellenceTitle}>{`EXCELÊNCIA ${excellence.year}`}</Text>
            <View style={styles.excellenceTotal}>
              <GoldStar size={16} />
              <Text style={styles.excellenceNumber}>{excellence.total}</Text>
              <Text style={styles.excellenceUnit}>DIAS{'\n'}PERFEITOS</Text>
            </View>
          </View>

          <View style={styles.months}>
            {excellence.months.map((month, index) => {
              const selected = index + 1 === viewed.month;
              return (
                <View key={month.label} style={styles.monthSlot}>
                  <View style={[styles.monthCard, selected && styles.monthCardOn]}>
                    <Text style={styles.monthLabel}>{month.label}</Text>
                    {month.count == null ? (
                      <Text style={styles.monthDash}>—</Text>
                    ) : (
                      <View style={styles.monthCount}>
                        <GoldStar size={11} />
                        <Text style={styles.monthValue}>{month.count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: page,
  },
  title: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 3.2,
  },
  note: {
    marginTop: 28,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  stats: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.22)',
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  number: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 38,
    lineHeight: 40,
  },
  unit: {
    marginLeft: 6,
    marginBottom: 6,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  statLabel: {
    marginTop: 8,
    color: '#A39E96',
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  calendar: {
    marginTop: 26,
  },
  excellence: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  excellenceTitle: {
    flex: 1,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  excellenceTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  excellenceNumber: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  excellenceUnit: {
    color: '#A39E96',
    fontFamily: fonts.text,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
  },
  months: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthSlot: {
    width: '25%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  monthCard: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.14)',
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  monthCardOn: {
    borderColor: ui.champagne,
  },
  monthLabel: {
    color: '#A39E96',
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  monthCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthValue: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 14,
    lineHeight: 18,
  },
  monthDash: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 18,
  },
});
