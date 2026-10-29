import { createElement, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { fonts, ui } from '@/constants/theme';
import { todayKey } from '@/lib/habit-day';
import {
  addHydrationIntake,
  clearedHydration,
  formatHydrationPercent,
  hydrationFill,
  hydrationGoalsMl,
  hydrationPercent,
  isHydrationGoal,
  loadHydration,
  saveHydration,
  type HydrationDay,
} from '@/lib/hydration';
import { formatHydrationAmount } from '@/lib/hydration-volume';

const additions = [200, 300, 500] as const;
const press = { cursor: 'pointer' } as ViewStyle;

function formatMl(ml: number) {
  return `${new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.round(ml)))} ml`;
}

function Drop() {
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
      createElement('path', {
        d: 'M8 1.5C8 1.5 3.1 6.7 3.1 10a4.9 4.9 0 0 0 9.8 0C12.9 6.7 8 1.5 8 1.5z',
        fill: '#6EB6F2',
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
  onSaved?: () => void;
}) {
  const { width } = useWindowDimensions();
  const tablet = width >= 720;
  const [day, setDay] = useState<HydrationDay>({ goalMl: null, consumedMl: 0 });
  const [draftMl, setDraftMl] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmZero, setConfirmZero] = useState(false);
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
      setDraftMl(result.day.goalMl != null && isHydrationGoal(result.day.goalMl) ? result.day.goalMl : null);
      setExpanded(false);
      setConfirmZero(false);
      setNotice(result.ok ? '' : result.message);
    });
    return () => {
      active = false;
    };
  }, [dateKey, userId]);

  async function commit(next: HydrationDay) {
    if (pending || locked) {
      return false;
    }
    const ticket = ++loadTicket.current;
    setPending(true);
    const saved = await saveHydration(userId, dateKey, next);
    if (ticket !== loadTicket.current) {
      setPending(false);
      return false;
    }
    setPending(false);
    if (!saved.ok) {
      setNotice(saved.message);
      return false;
    }
    setDay(saved.day);
    setNotice('');
    onSaved?.();
    return true;
  }

  function toggleGoal() {
    if (locked) {
      return;
    }
    setExpanded((open) => {
      if (open) {
        setDraftMl(day.goalMl != null && isHydrationGoal(day.goalMl) ? day.goalMl : null);
      }
      return !open;
    });
    setNotice('');
  }

  async function saveGoal() {
    if (draftMl == null || !isHydrationGoal(draftMl)) {
      setNotice('Escolha uma das metas de 1,0 L a 5,0 L.');
      return;
    }
    const saved = await commit({ ...day, goalMl: draftMl });
    if (saved) {
      setExpanded(false);
    }
  }

  async function confirmClear() {
    setConfirmZero(false);
    await commit(clearedHydration(day));
  }

  const percent = hydrationPercent(day.consumedMl, day.goalMl);
  const fill = hydrationFill(day.consumedMl, day.goalMl);
  const goalLabel = day.goalMl == null ? 'Defina sua meta' : formatHydrationAmount(day.goalMl);
  const amountLabel = day.goalMl == null ? formatMl(day.consumedMl) : `${formatMl(day.consumedMl)} / ${goalLabel}`;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Drop />
        <Text style={styles.title}>Hidratação</Text>
        <Text numberOfLines={1} style={styles.goalLabel}>
          {day.goalMl == null ? 'Meta' : `Meta ${goalLabel}`}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{amountLabel}</Text>
        <Text style={styles.percent}>{day.goalMl == null ? '—' : formatHydrationPercent(percent)}</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(fill) }}
        style={styles.rail}>
        {fill > 0 ? <View style={[styles.fill, { width: `${fill}%` }]} /> : null}
      </View>
      <View style={styles.adds}>
        {additions.map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            disabled={pending || locked}
            onPress={() => void commit({ ...day, consumedMl: addHydrationIntake(day.consumedMl, amount) })}
            style={({ pressed }) => [styles.add, press, (pending || locked) && styles.dim, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={styles.addLabel}>{`+ ${amount} ml`}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.tools}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          disabled={locked}
          onPress={toggleGoal}
          style={({ pressed }) => [styles.alter, press, locked && styles.dim, pressed && styles.pressed]}>
          <Text style={styles.alterLabel}>Alterar meta diária</Text>
          <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={pending || locked || day.consumedMl === 0}
          onPress={() => setConfirmZero(true)}
          style={({ pressed }) => [styles.zero, press, (pending || locked || day.consumedMl === 0) && styles.dim, pressed && styles.pressed]}>
          <Text style={styles.zeroLabel}>Zerar</Text>
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.goals}>
          {hydrationGoalsMl.map((goal) => {
            const selected = draftMl === goal;
            return (
              <View key={goal} style={[styles.goalSlot, tablet ? styles.goalSlotTablet : styles.goalSlotPhone]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={pending || locked}
                  onPress={() => setDraftMl(goal)}
                  style={({ pressed }) => [styles.goalOption, selected && styles.goalSelected, pressed && styles.pressed]}>
                  <Text style={[styles.goalOptionLabel, selected && styles.goalSelectedLabel]}>{formatHydrationAmount(goal)}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
      {expanded ? (
        <Pressable
          accessibilityRole="button"
          disabled={pending || locked || draftMl == null}
          onPress={() => void saveGoal()}
          style={({ pressed }) => [styles.save, press, (pending || locked || draftMl == null) && styles.dim, pressed && styles.pressed]}>
          <Text style={styles.saveLabel}>{pending ? 'Salvando' : 'Salvar meta'}</Text>
        </Pressable>
      ) : null}
      {locked ? <Text style={styles.notice}>Este dia está disponível só para consulta.</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Modal transparent visible={confirmZero} animationType="fade" onRequestClose={() => setConfirmZero(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>Deseja zerar o consumo de água de hoje?</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfirmZero(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelLabel}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void confirmClear()} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmLabel}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.12)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drop: {
    width: 8,
    height: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 2,
    backgroundColor: '#6EB6F2',
    transform: [{ rotate: '45deg' }],
  },
  title: {
    flex: 1,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  goalLabel: {
    flexShrink: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  amount: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 28,
    lineHeight: 32,
  },
  percent: {
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
    backgroundColor: '#6EB6F2',
  },
  adds: {
    flexDirection: 'row',
    gap: 8,
  },
  add: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  addLabel: {
    color: '#E7E1D8',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 16,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alter: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  alterLabel: {
    color: '#E7E1D8',
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chevron: {
    color: '#E7E1D8',
    fontSize: 14,
    lineHeight: 16,
  },
  zero: {
    minHeight: 44,
    minWidth: 92,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  zeroLabel: {
    color: '#E7E1D8',
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  goals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  goalSlot: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  goalSlotPhone: {
    width: '33.33%',
  },
  goalSlotTablet: {
    width: '20%',
  },
  goalOption: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101010',
  },
  goalSelected: {
    borderColor: '#E7C99A',
    backgroundColor: 'rgba(231, 201, 154, 0.16)',
  },
  goalOptionLabel: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  goalSelectedLabel: {
    color: '#E7C99A',
  },
  save: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#E7C99A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    color: '#1A140E',
    fontFamily: fonts.textMedium,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  notice: {
    color: ui.textChampagne,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: '#12110F',
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.28)',
    padding: 20,
    gap: 18,
  },
  modalText: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelLabel: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalConfirm: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#E7C99A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmLabel: {
    color: '#1A140E',
    fontFamily: fonts.textMedium,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
