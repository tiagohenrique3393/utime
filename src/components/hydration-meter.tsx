import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';

import { fonts, ui } from '@/constants/theme';
import { todayKey } from '@/lib/habit-day';
import {
  hydrationProgress,
  loadHydration,
  saveHydration,
  type HydrationDay,
} from '@/lib/hydration';

const additions = [200, 250, 500];
const press = { cursor: 'pointer' } as ViewStyle;

function formatMl(ml: number) {
  return `${new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.round(ml)))} ml`;
}

function Drop() {
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
      createElement('path', {
        d: 'M8 1.7C8 1.7 3.3 7.1 3.3 10.1a4.7 4.7 0 0 0 9.4 0C12.7 7.1 8 1.7 8 1.7z',
        stroke: ui.champagne,
        strokeWidth: 1.1,
        strokeLinejoin: 'round',
      }),
    );
  }
  return <View style={styles.drop} />;
}

export function HydrationMeter({
  userId,
  dateKey,
  onSaved,
}: {
  userId: string;
  dateKey: string;
  onSaved: () => void;
}) {
  const [day, setDay] = useState<HydrationDay>({ goalMl: null, consumedMl: 0 });
  const [goalText, setGoalText] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const loadTicket = useRef(0);
  const locked = dateKey !== todayKey();

  useEffect(() => {
    const ticket = ++loadTicket.current;
    let active = true;
    void loadHydration(userId, dateKey).then((result) => {
      if (!active || ticket !== loadTicket.current) {
        return;
      }
      setDay(result.day);
      setGoalText(result.day.goalMl == null ? '' : String(result.day.goalMl));
      setNotice(result.ok ? '' : result.message);
    });
    return () => {
      active = false;
    };
  }, [dateKey, userId]);

  async function commit(next: HydrationDay) {
    if (pending || locked) {
      return;
    }
    const ticket = ++loadTicket.current;
    setPending(true);
    const saved = await saveHydration(userId, dateKey, next);
    if (ticket !== loadTicket.current) {
      setPending(false);
      return;
    }
    setPending(false);
    if (!saved.ok) {
      setNotice(saved.message);
      return;
    }
    setDay(saved.day);
    setGoalText(saved.day.goalMl == null ? '' : String(saved.day.goalMl));
    setNotice(saved.message);
    onSaved();
  }

  function saveGoal() {
    const trimmed = goalText.trim();
    if (trimmed.length === 0) {
      void commit({ ...day, goalMl: null });
      return;
    }
    if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0) {
      setNotice('Informe a meta em mililitros.');
      return;
    }
    void commit({ ...day, goalMl: Number(trimmed) });
  }

  const progress = hydrationProgress(day.consumedMl, day.goalMl);
  const goalMl = day.goalMl;
  const ticks = goalMl == null ? [] : [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(goalMl * part));

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Drop />
        <Text style={styles.title}>Hidratação</Text>
        <Text numberOfLines={1} style={styles.goalLabel}>
          {day.goalMl == null ? 'Defina sua meta' : `Meta ${formatMl(day.goalMl)}`}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{formatMl(day.consumedMl)}</Text>
        <Text style={styles.amountDot}>·</Text>
        <Text style={styles.amountPercent}>{progress}%</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={styles.rail}>
        {progress > 0 ? <View style={[styles.fill, { width: `${progress}%` }]} /> : null}
      </View>
      {ticks.length > 0 ? (
        <View style={styles.ticks}>
          {ticks.map((tick, index) => (
            <Text
              key={`${tick}-${index}`}
              numberOfLines={1}
              style={[styles.tick, index === 0 && styles.tickEdge, index === ticks.length - 1 && styles.tickEnd]}>
              {new Intl.NumberFormat('pt-BR').format(tick)}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.adds}>
        {additions.map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            disabled={pending || locked}
            onPress={() => void commit({ ...day, consumedMl: day.consumedMl + amount })}
            style={({ pressed }) => [styles.add, press, (pending || locked) && styles.dim, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={styles.addLabel}>{`+ ${amount} ml`}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={pending || locked || day.consumedMl === 0}
          onPress={() => void commit({ ...day, consumedMl: Math.max(0, day.consumedMl - 200) })}
          style={({ pressed }) => [
            styles.add,
            press,
            (pending || locked || day.consumedMl === 0) && styles.dim,
            pressed && styles.pressed,
          ]}>
          <Text numberOfLines={1} style={styles.addLabel}>− 200 ml</Text>
        </Pressable>
      </View>
      <View style={styles.goalRow}>
        <TextInput
          value={goalText}
          onChangeText={(value) => {
            setGoalText(value.replace(/[^\d]/g, ''));
            setNotice('');
          }}
          onSubmitEditing={saveGoal}
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!pending && !locked}
          placeholder="Meta em ml"
          placeholderTextColor={ui.faint}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" disabled={pending || locked} onPress={saveGoal} style={[styles.goalAction, (pending || locked) && styles.dim]}>
          <Text style={styles.goalActionLabel}>{pending ? 'Salvando' : 'Salvar meta'}</Text>
        </Pressable>
      </View>
      {locked ? <Text style={styles.notice}>Este dia está disponível só para consulta.</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.08)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drop: {
    width: 7,
    height: 10,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 1,
    borderWidth: 1.15,
    borderColor: ui.champagne,
    transform: [{ rotate: '45deg' }],
  },
  title: {
    flex: 1,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  goalLabel: {
    flexShrink: 1,
    color: '#9A958E',
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  amount: {
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 28,
    lineHeight: 32,
  },
  amountDot: {
    color: '#6E6A64',
    fontFamily: fonts.text,
    fontSize: 18,
    lineHeight: 24,
  },
  amountPercent: {
    color: ui.champagne,
    fontFamily: fonts.textLight,
    fontSize: 28,
    lineHeight: 32,
  },
  rail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2926',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ui.champagne,
  },
  ticks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tick: {
    flex: 1,
    color: '#6E6A64',
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  tickEdge: {
    textAlign: 'left',
  },
  tickEnd: {
    textAlign: 'right',
  },
  adds: {
    flexDirection: 'row',
    gap: 8,
  },
  add: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  addLabel: {
    color: '#D9D4CC',
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.1)',
    backgroundColor: '#101010',
    paddingHorizontal: 12,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  goalAction: {
    minHeight: 36,
    justifyContent: 'center',
  },
  goalActionLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  notice: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  dim: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.72,
  },
});
