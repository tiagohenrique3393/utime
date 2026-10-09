import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen, Eyebrow, Meta, PageTitle, PrimaryButton, TextButton } from '@/components/app-screen';
import { colors, fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  addCustomHabit,
  chooseCatalogHabit,
  getCatalogHabits,
  getUserHabits,
  habitPeriods,
  habitPillars,
  habitRelevances,
  habitTitle,
  hydrateHabitRoutine,
  isHabitRoutinePersonalized,
  periodLabels,
  pillarLabels,
  relevanceLabels,
  removeUserHabit,
  savePersonalizedRoutine,
  subscribeHabitRoutine,
  updateUserHabit,
  type CatalogHabit,
  type HabitPeriod,
  type HabitPillar,
  type HabitRelevance,
  type HabitResult,
  type UserHabit,
} from '@/lib/habit-catalog';
import { suggestedHabits } from '@/lib/suggested-habits';
import { useRequireSession } from '@/lib/require-session';

type Draft = {
  label: string;
  period: HabitPeriod;
  pillar: HabitPillar;
  relevance: HabitRelevance | null;
};

function ChoiceChips<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[styles.chip, selected && styles.chipOn]}>
            <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{labels[option]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PersonalizeHabitsScreen() {
  const signedIn = useRequireSession();
  const catalog = useSyncExternalStore(subscribeHabitRoutine, getCatalogHabits, getCatalogHabits);
  const habits = useSyncExternalStore(subscribeHabitRoutine, getUserHabits, getUserHabits);
  const personalized = useSyncExternalStore(
    subscribeHabitRoutine,
    isHabitRoutinePersonalized,
    isHabitRoutinePersonalized,
  );
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeError, setNoticeError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickRelevance, setPickRelevance] = useState<HabitRelevance | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customPeriod, setCustomPeriod] = useState<HabitPeriod | null>(null);
  const [customPillar, setCustomPillar] = useState<HabitPillar | null>(null);
  const [customRelevance, setCustomRelevance] = useState<HabitRelevance | null>(null);

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      hydrateHabitRoutine(userId).finally(() => {
        if (active) {
          setPhase('ready');
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  async function run(action: () => Promise<HabitResult>) {
    if (pending) {
      return null;
    }
    setPending(true);
    const result = await action();
    setNotice(result.message);
    setNoticeError(!result.ok);
    setPending(false);
    return result;
  }

  function beginEdit(habit: UserHabit) {
    setConfirmId(null);
    setEditingId(habit.id);
    setDraft({
      label: habit.customLabel ?? '',
      period: habit.period,
      pillar: habit.pillar,
      relevance: habit.relevance,
    });
  }

  async function saveEdit(habit: UserHabit) {
    if (!draft) {
      return;
    }
    if (!draft.relevance) {
      setNotice('Escolha a relevância alta, média ou baixa.');
      setNoticeError(true);
      return;
    }
    const result = await run(() =>
      updateUserHabit(habit.id, {
        label: habit.catalogHabitId ? undefined : draft.label,
        period: draft.period,
        pillar: draft.pillar,
        relevance: draft.relevance,
      }),
    );
    if (result?.ok) {
      setEditingId(null);
      setDraft(null);
    }
  }

  async function removeHabit(habitId: string) {
    const result = await run(() => removeUserHabit(habitId));
    if (result?.ok) {
      setConfirmId(null);
      if (editingId === habitId) {
        setEditingId(null);
        setDraft(null);
      }
    }
  }

  async function chooseOfficial(habit: CatalogHabit) {
    if (!pickRelevance) {
      setNotice('Escolha a relevância alta, média ou baixa.');
      setNoticeError(true);
      return;
    }
    const result = await run(() => chooseCatalogHabit(habit.id, pickRelevance));
    if (result?.ok) {
      setPickingId(null);
      setPickRelevance(null);
    }
  }

  async function createCustom() {
    if (!customPeriod || !customPillar || !customRelevance) {
      setNotice('Informe o nome, o período, o pilar e a relevância.');
      setNoticeError(true);
      return;
    }
    const result = await run(() =>
      addCustomHabit({
        label: customLabel,
        period: customPeriod,
        pillar: customPillar,
        relevance: customRelevance,
      }),
    );
    if (result?.ok) {
      setCustomLabel('');
      setCustomPeriod(null);
      setCustomPillar(null);
      setCustomRelevance(null);
    }
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const catalogReady = catalog.length > 0;
  const suggestedIds = new Set(suggestedHabits.map((item) => item.id));
  const offered = catalog.filter((item) => suggestedIds.has(item.id));
  const officialCatalog = offered.length > 0 ? offered : catalog;
  const routine = habits.filter((habit) => habit.active);
  const failed = phase === 'ready' && !catalogReady && routine.length === 0 && !personalized;
  const chosenIds = new Set(routine.map((habit) => habit.catalogHabitId).filter((id): id is string => Boolean(id)));

  return (
    <AppScreen>
      <View style={styles.links}>
        <TextButton label="Meu dia" onPress={() => router.navigate('/meu-dia' as Href)} />
      </View>
      <View style={styles.header}>
        <Eyebrow>Rotina</Eyebrow>
        <PageTitle compact>Personalizar hábitos</PageTitle>
        <Meta>A relevância organiza a sua evolução pessoal.</Meta>
        <Meta>Ela não altera o ranking nem o UTime Score.</Meta>
        <Meta>A rotina pode ficar vazia.</Meta>
      </View>

      {notice ? <Text style={noticeError ? styles.noticeError : styles.notice}>{notice}</Text> : null}
      {phase === 'loading' ? <Text style={styles.note}>Carregando sua rotina.</Text> : null}
      {failed ? <Text style={styles.note}>Não foi possível carregar os hábitos.</Text> : null}

      {phase === 'ready' && !failed ? (
        <>
          <Text style={styles.section}>Sua rotina</Text>
          {routine.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.note}>
                {personalized
                  ? 'Nenhum hábito na rotina. Você pode incluir um quando quiser.'
                  : 'Sua rotina personalizada ainda não foi guardada. Os hábitos oficiais da jornada continuam em Hoje.'}
              </Text>
              {!personalized ? (
                <PrimaryButton
                  label={pending ? 'Salvando' : 'Guardar rotina vazia'}
                  onPress={() => {
                    void run(savePersonalizedRoutine);
                  }}
                />
              ) : null}
            </View>
          ) : (
            habitPillars.map((pillar) => {
              const group = routine.filter((habit) => habit.pillar === pillar);
              return (
                <View key={pillar} style={styles.group}>
                  <Text style={styles.groupTitle}>{pillarLabels[pillar]}</Text>
                  {group.length === 0 ? <Text style={styles.note}>Nenhum hábito neste pilar.</Text> : null}
                  {group.map((habit) => {
                    const editing = editingId === habit.id ? draft : null;
                    const confirming = confirmId === habit.id;
                    return (
                      <View key={habit.id} style={styles.row}>
                        <View style={styles.copy}>
                          <Text style={styles.habitName}>{habitTitle(habit, catalog)}</Text>
                          <Text style={styles.habitMeta}>
                            {periodLabels[habit.period]}
                            {habit.relevance ? ` · ${relevanceLabels[habit.relevance]}` : ' · Sem relevância'}
                            {habit.catalogHabitId ? ' · Oficial' : ' · Próprio'}
                          </Text>
                        </View>
                        {editing ? (
                          <View style={styles.editor}>
                            {habit.catalogHabitId ? null : (
                              <TextInput
                                value={editing.label}
                                onChangeText={(value) => setDraft({ ...editing, label: value })}
                                autoCapitalize="sentences"
                                autoCorrect={false}
                                editable={!pending}
                                placeholder="Nome do hábito"
                                placeholderTextColor={ui.faint}
                                style={styles.input}
                              />
                            )}
                            <Text style={styles.field}>Período</Text>
                            <ChoiceChips
                              options={habitPeriods}
                              labels={periodLabels}
                              value={editing.period}
                              onChange={(period) => setDraft({ ...editing, period })}
                            />
                            <Text style={styles.field}>Pilar</Text>
                            <ChoiceChips
                              options={habitPillars}
                              labels={pillarLabels}
                              value={editing.pillar}
                              onChange={(nextPillar) => setDraft({ ...editing, pillar: nextPillar })}
                            />
                            <Text style={styles.field}>Relevância</Text>
                            <ChoiceChips
                              options={habitRelevances}
                              labels={relevanceLabels}
                              value={editing.relevance}
                              onChange={(relevance) => setDraft({ ...editing, relevance })}
                            />
                            <View style={styles.actions}>
                              <Pressable
                                accessibilityRole="button"
                                disabled={pending}
                                onPress={() => {
                                  setEditingId(null);
                                  setDraft(null);
                                }}
                                style={styles.action}>
                                <Text style={styles.actionMuted}>Cancelar</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                disabled={pending}
                                onPress={() => {
                                  void saveEdit(habit);
                                }}
                                style={styles.action}>
                                <Text style={styles.actionLabel}>{pending ? 'Salvando' : 'Salvar'}</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.actions}>
                            <Pressable accessibilityRole="button" onPress={() => beginEdit(habit)} style={styles.action}>
                              <Text style={styles.actionLabel}>Editar</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                if (confirming) {
                                  void removeHabit(habit.id);
                                  return;
                                }
                                setConfirmId(habit.id);
                              }}
                              style={styles.action}>
                              <Text style={styles.actionMuted}>{confirming ? 'Confirmar' : 'Remover'}</Text>
                            </Pressable>
                            {confirming ? (
                              <Pressable accessibilityRole="button" onPress={() => setConfirmId(null)} style={styles.action}>
                                <Text style={styles.actionMuted}>Cancelar</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}

          <Text style={styles.section}>Hábito próprio</Text>
          <TextInput
            value={customLabel}
            onChangeText={setCustomLabel}
            autoCapitalize="sentences"
            autoCorrect={false}
            editable={!pending}
            placeholder="Nome do hábito"
            placeholderTextColor={ui.faint}
            style={styles.input}
          />
          <Text style={styles.field}>Período</Text>
          <ChoiceChips options={habitPeriods} labels={periodLabels} value={customPeriod} onChange={setCustomPeriod} />
          <Text style={styles.field}>Pilar</Text>
          <ChoiceChips options={habitPillars} labels={pillarLabels} value={customPillar} onChange={setCustomPillar} />
          <Text style={styles.field}>Relevância</Text>
          <ChoiceChips
            options={habitRelevances}
            labels={relevanceLabels}
            value={customRelevance}
            onChange={setCustomRelevance}
          />
          <View style={styles.add}>
            <PrimaryButton label={pending ? 'Salvando' : 'Adicionar hábito'} onPress={() => void createCustom()} />
          </View>

          {catalogReady ? (
            <>
              <Text style={styles.section}>Hábitos oficiais</Text>
              {habitPillars.map((pillar) => {
                const group = officialCatalog.filter((habit) => habit.pillar === pillar);
                if (group.length === 0) {
                  return null;
                }
                return (
                  <View key={pillar} style={styles.group}>
                    <Text style={styles.groupTitle}>{pillarLabels[pillar]}</Text>
                    {group.map((habit) => {
                      const chosen = chosenIds.has(habit.id);
                      const picking = pickingId === habit.id;
                      return (
                        <View key={habit.id} style={styles.row}>
                          <View style={styles.copy}>
                            <Text style={styles.habitName}>{habit.label}</Text>
                            <Text style={styles.habitMeta}>{periodLabels[habit.period]}</Text>
                          </View>
                          {chosen ? (
                            <Text style={styles.chosen}>Na sua rotina</Text>
                          ) : picking ? (
                            <View style={styles.editor}>
                              <Text style={styles.field}>Relevância</Text>
                              <ChoiceChips
                                options={habitRelevances}
                                labels={relevanceLabels}
                                value={pickRelevance}
                                onChange={setPickRelevance}
                              />
                              <View style={styles.actions}>
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={pending}
                                  onPress={() => {
                                    setPickingId(null);
                                    setPickRelevance(null);
                                  }}
                                  style={styles.action}>
                                  <Text style={styles.actionMuted}>Cancelar</Text>
                                </Pressable>
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={pending}
                                  onPress={() => void chooseOfficial(habit)}
                                  style={styles.action}>
                                  <Text style={styles.actionLabel}>{pending ? 'Salvando' : 'Adicionar'}</Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                setPickingId(habit.id);
                                setPickRelevance(null);
                              }}
                              style={styles.action}>
                              <Text style={styles.actionLabel}>Escolher</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          ) : null}
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
    gap: 18,
  },
  header: {
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  section: {
    marginTop: 32,
    marginBottom: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.4,
  },
  group: {
    marginTop: 14,
  },
  groupTitle: {
    marginBottom: 4,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
    gap: 8,
  },
  copy: {
    gap: 3,
  },
  habitName: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 21,
  },
  habitMeta: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chosen: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  actionMuted: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  editor: {
    gap: 8,
  },
  field: {
    marginTop: 8,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: ui.champagne,
  },
  chipLabel: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  chipLabelOn: {
    color: ui.champagne,
  },
  input: {
    height: 52,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.background,
    paddingHorizontal: 14,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  add: {
    marginTop: 18,
  },
  empty: {
    gap: 16,
    marginTop: 8,
  },
  note: {
    marginTop: 8,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    marginTop: 16,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeError: {
    marginTop: 16,
    color: colors.danger,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
