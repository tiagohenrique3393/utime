import { Image } from 'expo-image';
import { router, useFocusEffect, type Href } from 'expo-router';
import { createElement, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type ViewProps, type ViewStyle } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayPlanet } from '@/components/day-planet';
import { DragHandSlot, DragHandStyle } from '@/components/drag-hand';
import { HabitFormModal, type HabitDraft } from '@/components/habit-form-modal';
import { HabitGlyph } from '@/components/habit-glyph';
import { useReducedMotion } from '@/components/motion';
import { dayButtonFill, fonts, ui } from '@/constants/theme';
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
  placeHabit,
  removeUserHabit,
  subscribeHabitRoutine,
  updateUserHabit,
  type HabitPeriod,
  type HabitPillar,
  type HabitRelevance,
  type UserHabit,
} from '@/lib/habit-catalog';
import { dragHintVisible, readDragLearned, writeDragLearned } from '@/lib/drag-hint';
import { locateHabitDrop, type DragBand } from '@/lib/habit-drag';
import { habitOrderAfterMove, nextPeriod, planHabitMove } from '@/lib/habit-order';
import { habitIconFor, periodCopy, suggestedMinutes } from '@/lib/habit-visual';
import { useModalGate } from '@/lib/modal-gate';
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

type DropHint = { period: HabitPeriod; index: number };

function pillarFigure(pillar: HabitPillar, feminine: boolean) {
  if (pillar === 'corpo') {
    return feminine ? corpoFemale : corpoMale;
  }
  if (pillar === 'mente') {
    return menteFigure;
  }
  return espiritoFigure;
}

function Seal({ kind, tone }: { kind: HabitRelevance; tone: string }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  const path =
    kind === 'alta'
      ? 'M3 15h14l-1.4-7.2L12.2 11 10 5.2 7.8 11 4.4 7.8 3 15z'
      : kind === 'media'
        ? 'M10 16.2a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4zM10 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z'
        : 'M3 13.2h14v2.2H3zM4.2 9h11.6v2.1H4.2zM5.4 4.8h9.2v2.1H5.4z';
  return createElement(
    'svg',
    { width: 12, height: 12, viewBox: '0 0 20 20', 'aria-hidden': true },
    createElement('path', { d: path, fill: 'none', stroke: tone, strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round' }),
  );
}

function Mark({ kind }: { kind: 'drag' | 'edit' | 'remove' }) {
  if (Platform.OS !== 'web') {
    return <Text style={kind === 'remove' ? styles.removeLabel : styles.iconLabel}>{kind === 'drag' ? '≡' : kind === 'edit' ? '✎' : '⌫'}</Text>;
  }
  const color = kind === 'remove' ? '#E15A4C' : '#C4A574';
  const path =
    kind === 'drag'
      ? 'M7 4.5h2.2v2.2H7zM12.8 4.5h2.2v2.2h-2.2zM7 9.6h2.2v2.2H7zM12.8 9.6h2.2v2.2h-2.2zM7 14.7h2.2v2.2H7zM12.8 14.7h2.2v2.2h-2.2z'
      : kind === 'edit'
        ? 'M4 16.8V20h3.2L18.2 9 15 5.8 4 16.8zM15 5.8l2.2-2.2a1.2 1.2 0 0 1 1.7 0l1.5 1.5a1.2 1.2 0 0 1 0 1.7L18.2 9 15 5.8z'
        : 'M8 8h8l-.6 11.2H8.6L8 8zM6.5 6.2h11M10 6.2V4.8h4v1.4';
  return createElement(
    'svg',
    { width: kind === 'drag' ? 16 : 15, height: kind === 'drag' ? 16 : 15, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement('path', { d: path, fill: kind === 'drag' ? color : 'none', stroke: color, strokeWidth: 1.6, strokeLinejoin: 'round' }),
  );
}

const emptyDraft: HabitDraft = {
  label: '',
  pillar: 'corpo',
  period: 'manha',
  minutes: 10,
  relevance: null,
};

const handleStyle = { touchAction: 'none', userSelect: 'none' } as ViewStyle;

function webData(data: Record<string, string>): ViewProps {
  return { dataSet: data } as unknown as ViewProps;
}

function browserStorage() {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage;
}

function hostElement(node: unknown): HTMLElement | null {
  if (node && typeof node === 'object' && 'dataset' in node && 'style' in node) {
    return node as HTMLElement;
  }
  return null;
}

function withLift(habits: readonly UserHabit[], lift: { id: string; period: HabitPeriod; index: number } | null) {
  if (!lift) {
    return habits;
  }
  const planned = planHabitMove(habits, lift.id, lift.period, lift.index);
  if (!planned) {
    return habits;
  }
  const byId = new Map(planned.map((item) => [item.id, item]));
  return habits
    .map((habit) => {
      const next = byId.get(habit.id);
      return next ? { ...habit, period: next.period, sortOrder: next.sortOrder } : habit;
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

export default function PersonalizeHabitsScreen() {
  const signedIn = useRequireSession();
  const catalog = useSyncExternalStore(subscribeHabitRoutine, getCatalogHabits, getCatalogHabits);
  const habits = useSyncExternalStore(subscribeHabitRoutine, getUserHabits, getUserHabits);
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const feminine = profile.journey === 'womantime';
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState<Record<HabitPeriod, boolean>>({ manha: false, tarde: false, noite: false });
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; habitId: string | null; draft: HabitDraft } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<UserHabit | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null);
  const [lift, setLift] = useState<{ id: string; period: HabitPeriod; index: number } | null>(null);
  const [hintOn, setHintOn] = useState(false);
  const [learned, setLearned] = useState(false);
  const openRef = useRef(open);
  const moveRef = useRef<(habitId: string, period: HabitPeriod, index: number) => Promise<boolean>>(async () => false);
  openRef.current = open;
  useModalGate(confirmRemove !== null || confirmAll);

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (userId) {
        void hydrateHabitRoutine(userId);
      }
    }, []),
  );

  const active = habits.filter((habit) => habit.active);
  const shown = withLift(active, lift);

  useEffect(() => {
    setLearned(readDragLearned(getSessionUserId(), browserStorage()));
  }, [signedIn]);

  async function moveHabit(habitId: string, period: HabitPeriod, index: number) {
    const current = getUserHabits().find((habit) => habit.id === habitId && habit.active);
    if (!current) {
      return false;
    }
    const group = getUserHabits().filter((habit) => habit.active && habit.period === period).map((habit) => habit.id);
    if (current.period === period && habitOrderAfterMove(group, habitId, index).every((id, position) => id === group[position])) {
      return true;
    }
    setPending(true);
    const result = await placeHabit(habitId, period, index);
    setPending(false);
    if (!result.ok) {
      setNotice(result.message);
      return false;
    }
    return true;
  }
  moveRef.current = moveHabit;

  function togglePeriod(period: HabitPeriod) {
    const willOpen = !open[period];
    setOpen((current) => ({ ...current, [period]: !current[period] }));
    if (!willOpen) {
      setHintOn(false);
      return;
    }
    if (!readDragLearned(getSessionUserId(), browserStorage())) {
      setHintOn(true);
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    type Session = {
      habitId: string;
      label: string;
      pointerId: number;
      x: number;
      y: number;
      startX: number;
      startY: number;
      startedAt: number;
      touch: boolean;
      active: boolean;
      handle: Element;
      drop: DropHint | null;
      hoverPeriod: HabitPeriod | null;
      hoverTimer: number | null;
      holdTimer: number | null;
    };
    let session: Session | null = null;
    let saving = false;
    let restoreScroll: (() => void) | null = null;

    function clearHover() {
      if (session?.hoverTimer != null) {
        window.clearTimeout(session.hoverTimer);
        session.hoverTimer = null;
      }
      if (session?.holdTimer != null) {
        window.clearTimeout(session.holdTimer);
        session.holdTimer = null;
      }
      if (session) {
        session.hoverPeriod = null;
      }
    }

    function unlockScroll() {
      restoreScroll?.();
      restoreScroll = null;
    }

    function lockScroll(from: Element | null) {
      let node = from?.parentElement ?? null;
      while (node) {
        const overflow = getComputedStyle(node).overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight + 4) {
          const previous = node.style.overflowY;
          const previousTouch = node.style.touchAction;
          node.style.overflowY = 'hidden';
          node.style.touchAction = 'none';
          const locked = node;
          restoreScroll = () => {
            locked.style.overflowY = previous;
            locked.style.touchAction = previousTouch;
          };
          return;
        }
        node = node.parentElement;
      }
    }

    function readBands() {
      const headers: DragBand[] = [];
      const rows: DragBand[] = [];
      document.querySelectorAll('[data-drop-kind="period"]').forEach((node) => {
        const period = node.getAttribute('data-drop-period') as HabitPeriod | null;
        if (!period) {
          return;
        }
        const rect = node.getBoundingClientRect();
        headers.push({ period, top: rect.top, bottom: rect.bottom });
      });
      document.querySelectorAll('[data-drop-kind="row"]').forEach((node) => {
        const period = node.getAttribute('data-drop-period') as HabitPeriod | null;
        const id = node.getAttribute('data-drop-id');
        if (!period || !id) {
          return;
        }
        const rect = node.getBoundingClientRect();
        rows.push({ period, id, top: rect.top, bottom: rect.bottom });
      });
      return { headers, rows };
    }

    function watchHover(x: number, y: number) {
      if (!session) {
        return;
      }
      const header = document.elementsFromPoint(x, y).find((node) => (node as Element).closest?.('[data-drop-kind="period"]'));
      const period = header ? ((header as Element).closest('[data-drop-kind="period"]')?.getAttribute('data-drop-period') as HabitPeriod | null) : null;
      if (!period || openRef.current[period]) {
        if (session.hoverTimer != null) {
          window.clearTimeout(session.hoverTimer);
          session.hoverTimer = null;
          session.hoverPeriod = null;
        }
        return;
      }
      if (session.hoverPeriod === period) {
        return;
      }
      if (session.hoverTimer != null) {
        window.clearTimeout(session.hoverTimer);
      }
      session.hoverPeriod = period;
      session.hoverTimer = window.setTimeout(() => {
        setOpen((current) => ({ ...current, [period]: true }));
      }, 380);
    }

    function beginDrag() {
      if (!session || session.active) {
        return;
      }
      session.active = true;
      if (session.handle instanceof HTMLElement && session.handle.setPointerCapture) {
        try {
          session.handle.setPointerCapture(session.pointerId);
        } catch {
          // O ponteiro continua acompanhado pela janela.
        }
      }
      lockScroll(session.handle);
      setDraggingId(session.habitId);
      setHintOn(false);
    }

    function finish(commit: boolean) {
      const current = session;
      const tracking = { capture: true } as EventListenerOptions;
      window.removeEventListener('pointermove', onMove, tracking);
      window.removeEventListener('pointerup', onUp, tracking);
      window.removeEventListener('pointercancel', onCancel, tracking);
      window.removeEventListener('touchmove', blockTouchScroll, tracking);
      clearHover();
      session = null;
      setGhost(null);
      setDraggingId(null);
      unlockScroll();
      if (current?.handle instanceof HTMLElement && current.handle.hasPointerCapture?.(current.pointerId)) {
        try {
          current.handle.releasePointerCapture(current.pointerId);
        } catch {
          // A captura já foi encerrada pelo navegador.
        }
      }
      if (!commit || !current?.active || !current.drop) {
        setLift(null);
        return;
      }
      const drop = current.drop;
      saving = true;
      void moveRef.current(current.habitId, drop.period, drop.index).then((saved) => {
        saving = false;
        setLift(null);
        if (saved) {
          writeDragLearned(getSessionUserId(), browserStorage());
          setLearned(true);
          setHintOn(false);
        }
      });
    }

    function onMove(event: PointerEvent) {
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (!session.active) {
        const held = Date.now() - session.startedAt;
        if (session.touch && distance > 16 && held < 160) {
          finish(false);
          return;
        }
        if (session.touch ? held < 160 : distance < 4) {
          return;
        }
        beginDrag();
      }
      if (!session?.active) {
        return;
      }
      event.preventDefault();
      session.x = event.clientX;
      session.y = event.clientY;
      setGhost({ label: session.label, x: event.clientX, y: event.clientY - 36 });
      const bands = readBands();
      const drop = locateHabitDrop(event.clientY, session.habitId, bands.headers, bands.rows);
      if (drop) {
        session.drop = drop;
        setLift({ id: session.habitId, period: drop.period, index: drop.index });
      }
      watchHover(event.clientX, event.clientY);
    }

    function onUp(event: PointerEvent) {
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      finish(true);
    }

    function onCancel(event: PointerEvent) {
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      finish(false);
    }

    function blockTouchScroll(event: TouchEvent) {
      if (session?.active) {
        event.preventDefault();
      }
    }

    function handleFrom(event: PointerEvent) {
      for (const node of event.composedPath()) {
        if (node instanceof Element) {
          const found = node.closest('[data-drag-handle]');
          if (found) {
            return found;
          }
        }
      }
      return null;
    }

    function onDown(event: PointerEvent) {
      setHintOn(false);
      if (saving || session || (event.pointerType === 'mouse' && event.button !== 0)) {
        return;
      }
      const handle = handleFrom(event);
      const habitId = handle?.getAttribute('data-drag-handle');
      if (!handle || !habitId) {
        return;
      }
      const touch = event.pointerType !== 'mouse';
      if (!touch) {
        event.preventDefault();
      }
      event.stopPropagation();
      session = {
        habitId,
        label: handle.getAttribute('data-drag-label') || 'Hábito',
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        startedAt: Date.now(),
        touch,
        active: false,
        handle,
        drop: null,
        hoverPeriod: null,
        hoverTimer: null,
        holdTimer: null,
      };
      if (touch) {
        session.holdTimer = window.setTimeout(() => beginDrag(), 160);
      }
      const tracking = { capture: true, passive: false } as AddEventListenerOptions;
      window.addEventListener('pointermove', onMove, tracking);
      window.addEventListener('pointerup', onUp, tracking);
      window.addEventListener('pointercancel', onCancel, tracking);
      window.addEventListener('touchmove', blockTouchScroll, tracking);
    }

    window.addEventListener('pointerdown', onDown, { capture: true, passive: false });
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      finish(false);
    };
  }, []);

  function draftFrom(habit: UserHabit): HabitDraft {
    const label = habitTitle(habit, catalog);
    return {
      label,
      pillar: habit.pillar,
      period: habit.period,
      minutes: habit.minutes,
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
      <DragHandStyle />
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
        <HabitGlyph name="target" color={ui.champagne} size={18} />
        <View style={styles.circleCopy}>
          <Text style={styles.circleTitle}>Círculo / Ranking</Text>
          <Text style={styles.circleText}>Requisitos: 10 hábitos (2 Alta · 4 Média · 4 Baixa)</Text>
        </View>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {habitPeriods.map((period) => {
        const group = shown.filter((habit) => habit.period === period);
        const showHand = dragHintVisible({
          learned,
          expanded: hintOn && open[period] && group.length > 0 && habitPeriods.find((item) => open[item] && shown.some((habit) => habit.period === item)) === period,
          dismissed: draggingId !== null,
        });
        return (
          <View key={period} style={styles.block}>
            <Image pointerEvents="none" source={period === 'manha' ? require('@/assets/period-manha.jpg') : period === 'tarde' ? require('@/assets/period-tarde.jpg') : require('@/assets/period-noite.jpg')} contentFit="cover" style={styles.periodPhoto} />
            <View pointerEvents="none" style={styles.periodShade} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open[period] }}
              ref={(node) => {
                const element = hostElement(node);
                if (!element) {
                  return;
                }
                element.dataset.dropKind = 'period';
                element.dataset.dropPeriod = period;
              }}
              {...webData({ dropKind: 'period', dropPeriod: period })}
              onPress={() => togglePeriod(period)}
              style={styles.blockHead}>
              <View style={styles.blockCopy}>
                <Text style={styles.blockTitle}>{periodCopy[period].title}</Text>
                <Text style={styles.blockSubtitle}>{periodCopy[period].subtitle}</Text>
              </View>
              <Text style={styles.blockCount}>{`${group.length} ${group.length === 1 ? 'hábito' : 'hábitos'}`}</Text>
              <Text style={styles.chevron}>{open[period] ? '⌃' : '⌄'}</Text>
            </Pressable>
            {showHand ? <DragHandSlot reduced={reducedMotion} /> : null}
            {open[period]
              ? group.map((habit, index) => {
                  const label = habitTitle(habit, catalog);
                  const minutes = habit.minutes ?? suggestedMinutes(label, habit.catalogHabitId);
                  const hinted = lift?.period === period && lift.index === index && lift.id !== habit.id;
                  return (
                    <View
                      key={habit.id}
                      ref={(node) => {
                        const element = hostElement(node);
                        if (!element) {
                          return;
                        }
                        element.dataset.dropKind = 'row';
                        element.dataset.dropPeriod = period;
                        element.dataset.dropId = habit.id;
                      }}
                      {...webData({ dropKind: 'row', dropPeriod: period, dropIndex: String(index), dropId: habit.id })}
                      style={[styles.row, draggingId === habit.id && styles.rowDragging, hinted && styles.rowHint]}>
                      <View
                        accessible
                        ref={(node) => {
                          const element = hostElement(node);
                          if (!element) {
                            return;
                          }
                          element.style.touchAction = 'none';
                          element.dataset.dragHandle = habit.id;
                          element.dataset.dragLabel = label;
                        }}
                        accessibilityLabel={`Arrastar ${label}`}
                        accessibilityActions={[
                          { name: 'increment', label: 'Mover para cima' },
                          { name: 'decrement', label: 'Mover para baixo' },
                          { name: 'movePeriod', label: 'Mover para o próximo período' },
                        ]}
                        onAccessibilityAction={(event) => {
                          const action = event.nativeEvent.actionName;
                          if (action === 'increment') {
                            void moveHabit(habit.id, period, index - 1);
                          } else if (action === 'decrement') {
                            void moveHabit(habit.id, period, index + 1);
                          } else if (action === 'movePeriod') {
                            void moveHabit(habit.id, nextPeriod(period), 999);
                          }
                        }}
                        {...webData({ dragHandle: habit.id, dragLabel: label })}
                        style={[styles.handle, handleStyle]}>
                        <Mark kind="drag" />
                      </View>
                      <View style={styles.glyphRing}>
                        <HabitGlyph name={habitIconFor(label, habit.catalogHabitId)} color={ui.champagne} size={16} />
                      </View>
                      <View style={styles.rowCopy}>
                        <Text numberOfLines={1} style={styles.rowLabel}>
                          {label}
                        </Text>
                        <Text style={styles.rowMeta}>{minutes != null ? `${minutes} min` : 'Sem duração'}</Text>
                      </View>
                      {habit.relevance ? (
                        <View style={[styles.pill, habit.relevance === 'alta' && styles.pillHigh, habit.relevance === 'media' && styles.pillMid]}>
                          <Seal kind={habit.relevance} tone={habit.relevance === 'alta' ? '#1A140E' : ui.champagne} />
                          <Text style={[styles.pillLabel, habit.relevance === 'alta' && styles.pillLabelHigh]}>{relevanceName[habit.relevance]}</Text>
                        </View>
                      ) : null}
                      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${label}`} onPress={() => setEditor({ mode: 'edit', habitId: habit.id, draft: draftFrom(habit) })} style={styles.iconButton}>
                        <Mark kind="edit" />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${label}`} onPress={() => setConfirmRemove(habit)} style={styles.iconButton}>
                        <Mark kind="remove" />
                      </Pressable>
                    </View>
                  );
                })
              : null}
            {open[period] ? (
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <Mark kind="drag" />
                  <Text style={styles.legendTitle}>Arrastar</Text>
                  <Text style={styles.legendText}>Altera a ordem dos hábitos.</Text>
                </View>
                <View style={styles.legendItem}>
                  <Mark kind="edit" />
                  <Text style={styles.legendTitle}>Editar</Text>
                  <Text style={styles.legendText}>Mude o hábito, período ou relevância.</Text>
                </View>
                <View style={styles.legendItem}>
                  <Mark kind="remove" />
                  <Text style={styles.legendTitle}>Remover</Text>
                  <Text style={styles.legendText}>Exclua o hábito da sua rotina.</Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => { setNotice(''); setEditor({ mode: 'create', habitId: null, draft: emptyDraft }); }} style={[styles.add, dayButtonFill]}>
        <Text style={styles.addLabel}>+ Adicionar hábito</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setConfirmAll(true)} style={styles.removeAll}>
        <Text style={styles.removeAllLabel}>Remover todos os hábitos</Text>
      </Pressable>
      {ghost && Platform.OS === 'web'
        ? createElement(
            'div',
            {
              style: {
                position: 'fixed',
                left: ghost.x + 14,
                top: ghost.y + 10,
                zIndex: 80,
                pointerEvents: 'none',
                background: '#16130E',
                color: '#F3EFE8',
                border: '1px solid #E8C99B',
                borderRadius: 12,
                padding: '8px 12px',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              },
            },
            ghost.label,
          )
        : null}
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
          <View accessibilityViewIsModal style={styles.dialog}>
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
          <View accessibilityViewIsModal style={styles.dialog}>
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
  lead: { marginTop: 8, color: ui.champagne, fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.4 },
  copy: { marginTop: 4, color: '#D5D0C8', fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  pillars: { marginTop: 16, flexDirection: 'row', gap: 8 },
  pillar: { flex: 1, alignItems: 'center', gap: 4 },
  pillarImage: { width: 84, height: 96 },
  pillarName: { color: ui.text, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  pillarCount: { color: '#A39E96', fontFamily: fonts.text, fontSize: 11 },
  circle: {
    marginTop: 14,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8C99B',
    backgroundColor: 'rgba(18,16,12,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    boxShadow: '0 0 16px rgba(226,170,70,0.28)',
  },
  circleCopy: { flex: 1 },
  circleTitle: { color: ui.champagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  circleText: { marginTop: 2, color: '#C8C2B8', fontFamily: fonts.text, fontSize: 11, lineHeight: 15 },
  notice: { marginTop: 10, color: ui.textChampagne, fontFamily: fonts.text, fontSize: 13 },
  block: { marginTop: 12, position: 'relative', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(232,200,142,0.16)', backgroundColor: '#0A0A0A', overflow: 'hidden' },
  periodPhoto: { position: 'absolute', top: 0, right: 0, left: 0, height: 78 },
  periodShade: { position: 'absolute', top: 0, right: 0, left: 0, height: 78, backgroundColor: 'rgba(5,5,5,0.48)' },
  blockHead: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  blockCopy: { flex: 1 },
  blockTitle: { color: ui.text, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.8, textTransform: 'uppercase' },
  blockSubtitle: { color: '#A39E96', fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  blockCount: { color: ui.text, fontFamily: fonts.text, fontSize: 12 },
  chevron: { color: '#E8C99B', width: 16, textAlign: 'center', fontSize: 16 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: 'rgba(243,239,232,0.08)' },
  rowDragging: { opacity: 0.35 },
  rowHint: { borderTopColor: ui.champagneDeep },
  handle: { width: 36, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: ui.text, fontFamily: fonts.text, fontSize: 13 },
  rowMeta: { marginTop: 2, color: '#A39E96', fontFamily: fonts.text, fontSize: 11 },
  glyphRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 8px rgba(232,201,155,0.45)',
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(196,165,116,0.55)', paddingHorizontal: 8, paddingVertical: 3 },
  pillHigh: { backgroundColor: '#E0A24A', borderColor: '#E0A24A' },
  pillMid: { borderColor: '#E8C99B' },
  pillLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  pillLabelHigh: { color: '#1A140E' },
  iconButton: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  iconLabel: { color: ui.champagne, fontSize: 16 },
  removeLabel: { color: '#E15A4C', fontSize: 16 },
  legend: {
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.4)',
  },
  legendItem: { flex: 1, alignItems: 'center', gap: 4 },
  legendTitle: { color: ui.champagne, fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' },
  legendText: { color: '#A39E96', fontFamily: fonts.text, fontSize: 10, lineHeight: 13, textAlign: 'center' },
  add: { marginTop: 16, minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
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
