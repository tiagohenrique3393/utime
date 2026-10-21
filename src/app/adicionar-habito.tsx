import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayPlanet } from '@/components/day-planet';
import { HabitGlyph } from '@/components/habit-glyph';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { classifyHabit, normalizeHabitText } from '@/lib/habit-classify';
import {
  addCustomHabit,
  chooseCatalogHabit,
  getCatalogHabits,
  getUserHabits,
  habitPillars,
  habitTitle,
  hydrateHabitRoutine,
  pillarLabels,
  subscribeHabitRoutine,
  updateUserHabit,
  type HabitPeriod,
  type HabitPillar,
} from '@/lib/habit-catalog';
import { extraHabitTemplates, habitIconFor, libraryNote, pillarTone } from '@/lib/habit-visual';
import { useRequireSession } from '@/lib/require-session';
import { suggestedHabitById, suggestedHabits } from '@/lib/suggested-habits';

const page = '#050505';
const periods = new Set<HabitPeriod>(['manha', 'tarde', 'noite']);

function readPeriod(value: string | string[] | undefined): HabitPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && periods.has(raw as HabitPeriod) ? (raw as HabitPeriod) : 'manha';
}

export default function AddHabitScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ periodo?: string | string[] }>();
  const origin = readPeriod(params.periodo);
  const catalog = useSyncExternalStore(subscribeHabitRoutine, getCatalogHabits, getCatalogHabits);
  const habits = useSyncExternalStore(subscribeHabitRoutine, getUserHabits, getUserHabits);
  const [query, setQuery] = useState('');
  const [pillar, setPillar] = useState<HabitPillar | 'todos'>('todos');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<HabitPeriod>(origin);
  const [chosenPillar, setChosenPillar] = useState<HabitPillar | null>(null);
  const [minutesText, setMinutesText] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (userId) {
        void hydrateHabitRoutine(userId);
      }
      setPeriod(origin);
    }, [origin]),
  );

  const library = useMemo(() => {
    const source = catalog.length > 0 ? catalog : suggestedHabits.map((habit) => ({ id: habit.id, label: habit.label, pillar: habit.pillar, period: habit.period, sortOrder: 0 }));
    const rows = source.map((item) => ({ id: item.id, label: item.label, pillar: item.pillar, custom: false }));
    for (const extra of extraHabitTemplates) {
      if (!rows.some((row) => normalizeHabitText(row.label) === normalizeHabitText(extra.label))) {
        rows.push({ id: `custom:${normalizeHabitText(extra.label)}`, label: extra.label, pillar: extra.pillar, custom: true });
      }
    }
    return rows;
  }, [catalog]);

  const activeLabels = new Set(habits.filter((habit) => habit.active).map((habit) => normalizeHabitText(habitTitle(habit, catalog))));
  const needle = normalizeHabitText(query);
  const visible = library.filter((item) => {
    if (pillar !== 'todos' && item.pillar !== pillar) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const note = libraryNote(item.label);
    return normalizeHabitText(`${item.label} ${note.detail} ${item.pillar}`).includes(needle);
  });
  const guess = classifyHabit(name);
  const pillarValue = chosenPillar ?? guess.pillar;

  async function addItem(item: { id: string; label: string; pillar: HabitPillar; custom: boolean }) {
    if (pending) {
      return;
    }
    setPending(true);
    const result = item.custom
      ? await addCustomHabit({ label: item.label, period: origin, pillar: item.pillar, relevance: null })
      : await chooseCatalogHabit(item.id, suggestedHabitById(item.id)?.relevance ?? null, origin);
    setPending(false);
    setNotice(result.message);
    if (result.ok) {
      router.navigate('/personalizar-habitos' as Href);
    }
  }

  async function createCustom() {
    if (pending) {
      return;
    }
    const trimmed = minutesText.trim();
    const minutes = trimmed.length === 0 ? null : Number(trimmed);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) {
      setNotice('Informe a duração em minutos, ou deixe em branco.');
      return;
    }
    setPending(true);
    const result = await addCustomHabit({ label: name, period, pillar: pillarValue, relevance: null });
    if (result.ok && minutes !== null) {
      const created = getUserHabits().find((habit) => habit.active && habit.customLabel?.trim() === name.trim());
      if (created) {
        await updateUserHabit(created.id, { minutes });
      }
    }
    setPending(false);
    setNotice(result.message);
    if (result.ok) {
      router.navigate('/personalizar-habitos' as Href);
    }
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<DayPlanet />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.navigate('/personalizar-habitos' as Href)} style={styles.back}>
        <Text style={styles.backLabel}>‹ Voltar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Adicionar hábito
      </Text>
      <Text style={styles.lead}>Escolha um hábito para incluir na sua rotina</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar hábitos..."
        placeholderTextColor={ui.faint}
        autoCapitalize="none"
        style={styles.search}
      />
      <View style={styles.filters}>
        {(['todos', ...habitPillars] as const).map((item) => {
          const selected = pillar === item;
          const color = item === 'todos' ? ui.champagneDeep : pillarTone[item];
          return (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setPillar(item)} style={[styles.filter, selected && { backgroundColor: color, borderColor: color }]}>
              <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>{item === 'todos' ? 'Todos' : pillarLabels[item]}</Text>
            </Pressable>
          );
        })}
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {visible.map((item) => {
        const note = libraryNote(item.label);
        const added = activeLabels.has(normalizeHabitText(item.label));
        return (
          <View key={item.id} style={styles.row}>
            <HabitGlyph name={habitIconFor(item.label, item.custom ? null : item.id)} color={pillarTone[item.pillar]} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.label}</Text>
              <Text style={styles.detail}>{note.detail}</Text>
            </View>
            {note.range ? <Text style={styles.range}>{note.range}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${item.label}`} disabled={pending || added} onPress={() => void addItem(item)} style={[styles.plus, added && styles.plusOn]}>
              <Text style={styles.plusLabel}>{added ? '✓' : '+'}</Text>
            </Pressable>
          </View>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => setCreating((current) => !current)} style={styles.more}>
        <Text style={styles.moreTitle}>+ Adicionar mais hábitos</Text>
        <Text style={styles.moreCopy}>Criar um hábito personalizado</Text>
      </Pressable>
      {creating ? (
        <View style={styles.form}>
          <Text style={styles.field}>Nome do hábito</Text>
          <TextInput value={name} onChangeText={(value) => { setName(value); setChosenPillar(null); }} placeholder="Ex.: Estudar inglês" placeholderTextColor={ui.faint} style={styles.input} />
          <Text style={styles.field}>Período</Text>
          <View style={styles.filters}>
            {(['manha', 'tarde', 'noite'] as const).map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: period === item }} onPress={() => setPeriod(item)} style={[styles.filter, period === item && styles.filterOn]}>
                <Text style={[styles.filterLabel, period === item && styles.filterLabelOn]}>{item === 'manha' ? 'Manhã' : item === 'tarde' ? 'Tarde' : 'Noite'}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.field}>Duração</Text>
          <TextInput value={minutesText} onChangeText={setMinutesText} keyboardType="number-pad" placeholder="Opcional, em minutos" placeholderTextColor={ui.faint} style={styles.input} />
          <Text style={styles.field}>{guess.confident || chosenPillar ? 'Pilar' : 'Pilar sugerido'}</Text>
          <View style={styles.filters}>
            {habitPillars.map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: pillarValue === item }} onPress={() => setChosenPillar(item)} style={[styles.filter, pillarValue === item && { backgroundColor: pillarTone[item], borderColor: pillarTone[item] }]}>
                <Text style={[styles.filterLabel, pillarValue === item && styles.filterLabelOn]}>{pillarLabels[item]}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => void createCustom()} style={styles.save}>
            <Text style={styles.saveLabel}>{pending ? 'Salvando' : 'Criar hábito'}</Text>
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  back: { minHeight: 36, justifyContent: 'center' },
  backLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: ui.text, fontFamily: fonts.display, fontSize: 32, lineHeight: 36, textTransform: 'uppercase' },
  lead: { marginTop: 6, color: ui.textChampagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  search: {
    marginTop: 16,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,200,142,0.2)',
    backgroundColor: 'rgba(12,12,12,0.8)',
    paddingHorizontal: 16,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  filters: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(232,200,142,0.28)', alignItems: 'center', justifyContent: 'center' },
  filterOn: { backgroundColor: ui.champagneDeep, borderColor: ui.champagneDeep },
  filterLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  filterLabelOn: { color: '#141210' },
  notice: { marginTop: 12, color: ui.textChampagne, fontFamily: fonts.text, fontSize: 13 },
  row: { marginTop: 10, minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(232,200,142,0.14)', backgroundColor: 'rgba(10,10,10,0.78)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  copy: { flex: 1, minWidth: 0 },
  name: { color: ui.text, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.4, textTransform: 'uppercase' },
  detail: { marginTop: 2, color: '#A39E96', fontFamily: fonts.text, fontSize: 12, lineHeight: 16 },
  range: { color: '#8E8A84', fontFamily: fonts.text, fontSize: 10, letterSpacing: 0.4 },
  plus: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: ui.champagneDeep, alignItems: 'center', justifyContent: 'center' },
  plusOn: { backgroundColor: 'rgba(232,200,142,0.16)' },
  plusLabel: { color: ui.champagneDeep, fontSize: 18, lineHeight: 20 },
  more: { marginTop: 16, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(232,200,142,0.4)', alignItems: 'center', justifyContent: 'center' },
  moreTitle: { color: ui.text, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  moreCopy: { marginTop: 2, color: '#A39E96', fontFamily: fonts.text, fontSize: 12 },
  form: { marginTop: 14, gap: 8, paddingBottom: 12 },
  field: { marginTop: 8, color: ui.textChampagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: ui.line, backgroundColor: 'rgba(8,8,8,0.8)', paddingHorizontal: 12, color: ui.text, fontFamily: fonts.text, fontSize: 16 },
  save: { marginTop: 12, minHeight: 48, borderRadius: 999, backgroundColor: ui.champagneDeep, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' },
});
