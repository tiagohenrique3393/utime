import { supabase } from '../../utils/supabase';
import { normalizeHabitText } from '@/lib/habit-classify';
import { matchingCustomHabit, requireHabitRelevance, type HabitRelevance } from '@/lib/habit-relevance';

export { matchingCustomHabit, requireHabitRelevance };

export type HabitPeriod = 'manha' | 'tarde' | 'noite';
export type HabitPillar = 'corpo' | 'mente' | 'espirito';
export type { HabitRelevance };

export type CatalogHabit = {
  id: string;
  period: HabitPeriod;
  pillar: HabitPillar;
  label: string;
  sortOrder: number;
};

export type UserHabit = {
  id: string;
  catalogHabitId: string | null;
  customLabel: string | null;
  period: HabitPeriod;
  pillar: HabitPillar;
  sortOrder: number;
  active: boolean;
  relevance: HabitRelevance | null;
  minutes: number | null;
};

export type HabitResult = {
  ok: boolean;
  message: string;
};

export const habitPillars: readonly HabitPillar[] = ['corpo', 'mente', 'espirito'];
export const habitPeriods: readonly HabitPeriod[] = ['manha', 'tarde', 'noite'];
export const habitRelevances: readonly HabitRelevance[] = ['alta', 'media', 'baixa'];

export const pillarLabels: Record<HabitPillar, string> = {
  corpo: 'Corpo',
  mente: 'Mente',
  espirito: 'Espírito',
};

export const periodLabels: Record<HabitPeriod, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

export const relevanceLabels: Record<HabitRelevance, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

type CatalogRow = {
  id: string;
  period: string;
  pillar: string;
  label: string;
  sort_order: number;
};

type RoutineRow = {
  personalized: boolean | null;
};

type HabitRow = {
  id: string;
  catalog_habit_id: string | null;
  custom_label: string | null;
  period: string;
  pillar: string;
  sort_order: number;
  active: boolean | null;
  relevance?: string | null;
  minutes?: number | null;
};

let relevanceAvailable: boolean | null = null;
let minutesAvailable: boolean | null = null;

type QueryError = { message?: string; code?: string } | null;

const periods = new Set<HabitPeriod>(['manha', 'tarde', 'noite']);
const pillars = new Set<HabitPillar>(['corpo', 'mente', 'espirito']);
const relevances = new Set<HabitRelevance>(['alta', 'media', 'baixa']);

let ownerId: string | null = null;
let revision = 0;
let catalog: readonly CatalogHabit[] = [];
let habits: readonly UserHabit[] = [];
let personalized = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeHabitRoutine(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setHabitOwner(userId: string | null) {
  if (ownerId === userId) {
    return;
  }
  ownerId = userId;
  revision += 1;
  habits = [];
  personalized = false;
  emit();
}

export function getCatalogHabits() {
  return catalog;
}

export function getUserHabits() {
  return habits;
}

export function isHabitRoutinePersonalized() {
  return personalized;
}

function isPeriod(value: string): value is HabitPeriod {
  return periods.has(value as HabitPeriod);
}

function isPillar(value: string): value is HabitPillar {
  return pillars.has(value as HabitPillar);
}

function isRelevance(value: string): value is HabitRelevance {
  return relevances.has(value as HabitRelevance);
}

function relevanceFromValue(value: string | null | undefined): HabitRelevance | null {
  return value && isRelevance(value) ? value : null;
}

function isMissingColumn(error: { message?: string; code?: string } | null, column: string) {
  if (!error) {
    return false;
  }
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return text.includes(column) && (text.includes('column') || text.includes('schema cache') || text.includes('could not find'));
}

function catalogFromRow(row: CatalogRow): CatalogHabit | null {
  if (!isPeriod(row.period) || !isPillar(row.pillar) || row.label.trim().length === 0) {
    return null;
  }
  return {
    id: row.id,
    period: row.period,
    pillar: row.pillar,
    label: row.label,
    sortOrder: row.sort_order,
  };
}

function habitFromRow(row: HabitRow): UserHabit | null {
  if (!isPeriod(row.period) || !isPillar(row.pillar)) {
    return null;
  }
  const catalogHabitId = row.catalog_habit_id;
  const customLabel = row.custom_label?.trim() || null;
  if (catalogHabitId && customLabel) {
    return null;
  }
  if (!catalogHabitId && !customLabel) {
    return null;
  }
  return {
    id: row.id,
    catalogHabitId,
    customLabel,
    period: row.period,
    pillar: row.pillar,
    sortOrder: row.sort_order,
    active: row.active !== false,
    relevance: relevanceFromValue(row.relevance),
    minutes: typeof row.minutes === 'number' && row.minutes >= 0 ? Math.round(row.minutes) : null,
  };
}

function nextSortOrder() {
  return habits.reduce((max, habit) => Math.max(max, habit.sortOrder), 0) + 1;
}

function habitColumns() {
  const columns = ['id', 'catalog_habit_id', 'custom_label', 'period', 'pillar', 'sort_order', 'active'];
  if (relevanceAvailable !== false) {
    columns.push('relevance');
  }
  if (minutesAvailable !== false) {
    columns.push('minutes');
  }
  return columns.join(',');
}

async function readUserHabits(userId: string): Promise<{ data: HabitRow[] | null; error: QueryError }> {
  const result = await supabase.from('user_habits').select(habitColumns()).eq('user_id', userId).order('sort_order', { ascending: true });
  if (!result.error) {
    if (habitColumns().includes('relevance')) {
      relevanceAvailable = true;
    }
    if (habitColumns().includes('minutes')) {
      minutesAvailable = true;
    }
    return { data: (result.data ?? []) as unknown as HabitRow[], error: null };
  }
  if (minutesAvailable !== false && isMissingColumn(result.error, 'minutes')) {
    minutesAvailable = false;
    return readUserHabits(userId);
  }
  if (relevanceAvailable !== false && isMissingColumn(result.error, 'relevance')) {
    relevanceAvailable = false;
    return readUserHabits(userId);
  }
  return { data: null, error: result.error };
}

async function writeUserHabit(
  operation: 'insert' | 'update',
  values: Record<string, string | number | boolean | null>,
  habitId?: string,
): Promise<{ data: HabitRow | null; error: QueryError }> {
  const userId = ownerId;
  if (!userId) {
    return { data: null, error: { message: 'missing owner' } };
  }
  if (minutesAvailable === false) {
    delete values.minutes;
  }
  const send = async (includeRelevance: boolean) => {
    const payload = { ...values };
    if (!includeRelevance) {
      delete payload.relevance;
    }
    if (minutesAvailable === false) {
      delete payload.minutes;
    }
    if (operation === 'insert' && includeRelevance) {
      return supabase
        .from('user_habits')
        .insert(payload)
        .select(habitColumns())
        .single();
    }
    if (operation === 'insert') {
      return supabase.from('user_habits').insert(payload).select(habitColumns()).single();
    }
    if (includeRelevance) {
      return supabase.from('user_habits').update(payload).eq('id', habitId ?? '').eq('user_id', userId).select(habitColumns()).single();
    }
    return supabase.from('user_habits').update(payload).eq('id', habitId ?? '').eq('user_id', userId).select(habitColumns()).single();
  };
  if (relevanceAvailable === false) {
    const saved = await send(false);
    return { data: (saved.data ?? null) as HabitRow | null, error: saved.error };
  }
  const result = await send(true);
  if (result.error && isMissingColumn(result.error, 'minutes')) {
    minutesAvailable = false;
    delete values.minutes;
    const saved = await send(true);
    return { data: (saved.data ?? null) as HabitRow | null, error: saved.error };
  }
  if (result.error && isMissingColumn(result.error, 'relevance')) {
    relevanceAvailable = false;
    const saved = await send(false);
    return { data: (saved.data ?? null) as HabitRow | null, error: saved.error };
  }
  if (!result.error) {
    relevanceAvailable = true;
    if (Object.prototype.hasOwnProperty.call(values, 'minutes')) {
      minutesAvailable = true;
    }
  }
  return { data: (result.data ?? null) as HabitRow | null, error: result.error };
}

export async function hydrateHabitRoutine(userId: string) {
  const stamp = revision;
  try {
    const [catalogResult, routineResult, habitsResult] = await Promise.all([
      supabase.from('habit_catalog').select('id,period,pillar,label,sort_order').order('sort_order', { ascending: true }),
      supabase.from('habit_routines').select('personalized').eq('user_id', userId).maybeSingle(),
      readUserHabits(userId),
    ]);
    if (ownerId !== userId || stamp !== revision) {
      return;
    }
    if (catalogResult.error || routineResult.error || habitsResult.error) {
      return;
    }
    const nextCatalog = ((catalogResult.data ?? []) as CatalogRow[])
      .map(catalogFromRow)
      .filter((item): item is CatalogHabit => item !== null);
    const nextHabits = ((habitsResult.data ?? []) as HabitRow[])
      .map(habitFromRow)
      .filter((item): item is UserHabit => item !== null)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
    catalog = nextCatalog;
    habits = nextHabits;
    personalized = (routineResult.data as RoutineRow | null)?.personalized === true;
    emit();
  } catch {
    // Sem as tabelas novas, a jornada oficial continua como está.
  }
}

async function markPersonalized(userId: string) {
  const { error } = await supabase.from('habit_routines').upsert(
    { user_id: userId, personalized: true },
    { onConflict: 'user_id' },
  );
  return !error;
}

export async function chooseCatalogHabit(
  catalogHabitId: string,
  relevance: HabitRelevance | null = null,
  period?: HabitPeriod,
): Promise<HabitResult> {
  const userId = ownerId;
  if (!userId) {
    return { ok: false, message: 'Entre na sua conta para escolher um hábito.' };
  }
  const source = catalog.find((item) => item.id === catalogHabitId);
  if (!source) {
    return { ok: false, message: 'Esse hábito não está no catálogo.' };
  }
  if (relevance !== null && !isRelevance(relevance)) {
    return { ok: false, message: 'Escolha a relevância alta, média ou baixa.' };
  }
  const nextPeriod = period && isPeriod(period) ? period : source.period;
  const existing = habits.find((habit) => habit.catalogHabitId === catalogHabitId);
  if (existing?.active) {
    if (period && existing.period !== nextPeriod) {
      return updateUserHabit(existing.id, { period: nextPeriod });
    }
    return { ok: true, message: 'Esse hábito já está na sua rotina.' };
  }
  const required = requireHabitRelevance(relevance);
  if (!required.ok) {
    return { ok: false, message: required.message };
  }
  if (existing) {
    const restored = await updateUserHabit(existing.id, {
      active: true,
      period: nextPeriod,
      pillar: source.pillar,
      relevance: required.relevance,
    });
    if (!restored.ok || ownerId !== userId) {
      return { ok: false, message: 'Não foi possível escolher esse hábito.' };
    }
    if (!personalized) {
      const marked = await markPersonalized(userId);
      if (!marked || ownerId !== userId) {
        return { ok: false, message: 'Não foi possível salvar a sua rotina.' };
      }
      personalized = true;
      emit();
    }
    return { ok: true, message: 'Hábito adicionado à sua rotina.' };
  }
  revision += 1;
  const { data, error } = await writeUserHabit('insert', {
    user_id: userId,
    catalog_habit_id: catalogHabitId,
    custom_label: null,
    period: nextPeriod,
    pillar: source.pillar,
    sort_order: nextSortOrder(),
    active: true,
    relevance: required.relevance,
  });
  if (error || !data) {
    return { ok: false, message: 'Não foi possível escolher esse hábito.' };
  }
  const created = habitFromRow(data as HabitRow);
  if (!created || created.relevance !== required.relevance) {
    if (created) {
      await supabase.from('user_habits').delete().eq('id', created.id).eq('user_id', userId);
    }
    return { ok: false, message: 'Não foi possível salvar a relevância do hábito.' };
  }
  const marked = await markPersonalized(userId);
  if (!marked) {
    await supabase.from('user_habits').delete().eq('id', created.id).eq('user_id', userId);
    return { ok: false, message: 'Não foi possível salvar a sua rotina.' };
  }
  if (ownerId !== userId) {
    return { ok: false, message: 'A sessão mudou antes de salvar o hábito.' };
  }
  habits = [...habits, created].sort((left, right) => left.sortOrder - right.sortOrder);
  personalized = true;
  emit();
  return { ok: true, message: 'Hábito adicionado à sua rotina.' };
}

export async function ensureCatalogHabit(input: {
  id: string;
  period: HabitPeriod;
  pillar: HabitPillar;
  relevance?: HabitRelevance | null;
}): Promise<{ ok: boolean; habitId: string | null; message: string }> {
  const userId = ownerId;
  if (!userId) {
    return { ok: false, habitId: null, message: 'Entre na sua conta para registrar o hábito.' };
  }
  if (!isPeriod(input.period) || !isPillar(input.pillar)) {
    return { ok: false, habitId: null, message: 'Esse hábito não está no catálogo.' };
  }
  const existing = habits.find((habit) => habit.catalogHabitId === input.id);
  if (existing?.active) {
    if (existing.relevance == null && input.relevance) {
      await updateUserHabit(existing.id, { relevance: input.relevance });
    }
    return { ok: true, habitId: existing.id, message: '' };
  }
  if (existing) {
    const restored = await updateUserHabit(existing.id, {
      active: true,
      period: input.period,
      pillar: input.pillar,
      relevance: existing.relevance,
    });
    if (!restored.ok || ownerId !== userId) {
      return { ok: false, habitId: null, message: 'Não foi possível registrar o hábito.' };
    }
    return { ok: true, habitId: existing.id, message: '' };
  }
  const required = requireHabitRelevance(input.relevance ?? null);
  if (!required.ok) {
    return { ok: false, habitId: null, message: required.message };
  }
  revision += 1;
  const { data, error } = await writeUserHabit('insert', {
    user_id: userId,
    catalog_habit_id: input.id,
    custom_label: null,
    period: input.period,
    pillar: input.pillar,
    sort_order: nextSortOrder(),
    active: true,
    relevance: required.relevance,
  });
  if (error || !data) {
    const code = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
    const missingCatalog = code.includes('23503') || code.includes('foreign key') || code.includes('habit_catalog');
    return {
      ok: false,
      habitId: null,
      message: missingCatalog
        ? 'Não foi possível gravar. Este hábito ainda não está no catálogo.'
        : 'Não foi possível registrar o hábito.',
    };
  }
  const created = habitFromRow(data as HabitRow);
  if (!created || created.relevance !== required.relevance || ownerId !== userId) {
    if (created) {
      await supabase.from('user_habits').delete().eq('id', created.id).eq('user_id', userId);
    }
    return { ok: false, habitId: null, message: 'Não foi possível salvar a relevância do hábito.' };
  }
  habits = [...habits, created].sort((left, right) => left.sortOrder - right.sortOrder);
  emit();
  return { ok: true, habitId: created.id, message: '' };
}

export async function addCustomHabit(input: {
  label: string;
  period: HabitPeriod;
  pillar: HabitPillar;
  relevance?: HabitRelevance | null;
}): Promise<HabitResult> {
  const userId = ownerId;
  const label = input.label.trim();
  if (!userId) {
    return { ok: false, message: 'Entre na sua conta para adicionar um hábito.' };
  }
  if (label.length === 0 || !isPeriod(input.period) || !isPillar(input.pillar)) {
    return { ok: false, message: 'Informe o nome, o período e o pilar do hábito.' };
  }
  const required = requireHabitRelevance(input.relevance ?? null);
  if (!required.ok) {
    return { ok: false, message: required.message };
  }
  const key = normalizeHabitText(label);
  const sameName = habits.find((habit) => normalizeHabitText(habitTitle(habit, catalog)) === key);
  if (sameName?.active) {
    return { ok: false, message: 'Esse hábito já está na sua rotina.' };
  }
  const inactiveCustom = matchingCustomHabit(habits, label);
  if (inactiveCustom && !inactiveCustom.active) {
    return updateUserHabit(inactiveCustom.id, {
      active: true,
      label,
      period: input.period,
      pillar: input.pillar,
      relevance: required.relevance,
    });
  }
  revision += 1;
  const { data, error } = await writeUserHabit('insert', {
    user_id: userId,
    catalog_habit_id: null,
    custom_label: label,
    period: input.period,
    pillar: input.pillar,
    sort_order: nextSortOrder(),
    active: true,
    relevance: required.relevance,
  });
  if (error || !data) {
    return { ok: false, message: 'Não foi possível adicionar esse hábito.' };
  }
  const created = habitFromRow(data as HabitRow);
  if (!created || created.relevance !== required.relevance) {
    if (created) {
      await supabase.from('user_habits').delete().eq('id', created.id).eq('user_id', userId);
    }
    return { ok: false, message: 'Não foi possível salvar a relevância do hábito.' };
  }
  const marked = await markPersonalized(userId);
  if (!marked) {
    await supabase.from('user_habits').delete().eq('id', created.id).eq('user_id', userId);
    return { ok: false, message: 'Não foi possível salvar a sua rotina.' };
  }
  if (ownerId !== userId) {
    return { ok: false, message: 'A sessão mudou antes de salvar o hábito.' };
  }
  habits = [...habits, created].sort((left, right) => left.sortOrder - right.sortOrder);
  personalized = true;
  emit();
  return { ok: true, message: 'Hábito adicionado à sua rotina.' };
}

export async function updateUserHabit(
  habitId: string,
  patch: {
    label?: string;
    period?: HabitPeriod;
    pillar?: HabitPillar;
    sortOrder?: number;
    active?: boolean;
    relevance?: HabitRelevance | null;
    minutes?: number | null;
  },
): Promise<HabitResult> {
  const userId = ownerId;
  const current = habits.find((habit) => habit.id === habitId);
  if (!userId || !current) {
    return { ok: false, message: 'Não foi possível editar esse hábito.' };
  }
  const nextPeriod = patch.period ?? current.period;
  const nextPillar = patch.pillar ?? current.pillar;
  const nextRelevance = patch.relevance === undefined ? current.relevance : patch.relevance;
  if (!isPeriod(nextPeriod) || !isPillar(nextPillar)) {
    return { ok: false, message: 'Informe um período e um pilar válidos.' };
  }
  if (nextRelevance !== null && !isRelevance(nextRelevance)) {
    return { ok: false, message: 'Escolha a relevância alta, média ou baixa.' };
  }
  const changes: Record<string, string | number | boolean | null> = {
    period: nextPeriod,
    pillar: nextPillar,
    sort_order: patch.sortOrder ?? current.sortOrder,
    active: patch.active ?? current.active,
    relevance: nextRelevance,
  };
  if (patch.minutes !== undefined) {
    const minutes = patch.minutes;
    if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440)) {
      return { ok: false, message: 'Informe uma duração entre 0 e 1440 minutos.' };
    }
    changes.minutes = minutes === null ? null : Math.round(minutes);
  }
  if (current.catalogHabitId) {
    changes.custom_label = null;
  } else if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (label.length === 0) {
      return { ok: false, message: 'Informe o nome do hábito.' };
    }
    changes.custom_label = label;
  }
  revision += 1;
  const { data, error } = await writeUserHabit('update', changes, habitId);
  if (error || !data || ownerId !== userId) {
    return { ok: false, message: 'Não foi possível editar esse hábito.' };
  }
  const savedHabit = habitFromRow(data as HabitRow);
  if (!savedHabit) {
    return { ok: false, message: 'Não foi possível editar esse hábito.' };
  }
  const updated =
    patch.minutes !== undefined && minutesAvailable === false
      ? { ...savedHabit, minutes: patch.minutes === null ? null : Math.round(patch.minutes) }
      : savedHabit;
  habits = habits
    .map((habit) => (habit.id === habitId ? updated : habit))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  emit();
  return { ok: true, message: 'Hábito atualizado.' };
}

export async function removeUserHabit(habitId: string): Promise<HabitResult> {
  const current = habits.find((habit) => habit.id === habitId && habit.active);
  if (!current) {
    return { ok: false, message: 'Não foi possível remover esse hábito.' };
  }
  const removed = await updateUserHabit(habitId, { active: false });
  if (!removed.ok) {
    return { ok: false, message: 'Não foi possível remover esse hábito.' };
  }
  return { ok: true, message: 'Hábito removido da sua rotina.' };
}

export async function savePersonalizedRoutine(): Promise<HabitResult> {
  const userId = ownerId;
  if (!userId) {
    return { ok: false, message: 'Entre na sua conta para salvar a rotina.' };
  }
  revision += 1;
  const marked = await markPersonalized(userId);
  if (!marked || ownerId !== userId) {
    return { ok: false, message: 'Não foi possível salvar a sua rotina.' };
  }
  personalized = true;
  emit();
  return { ok: true, message: 'Rotina personalizada salva.' };
}

export async function reorderPeriodHabits(period: HabitPeriod, orderedIds: readonly string[]): Promise<HabitResult> {
  const group = habits.filter((habit) => habit.active && habit.period === period);
  if (group.length !== orderedIds.length || orderedIds.some((id) => !group.some((habit) => habit.id === id))) {
    return { ok: false, message: 'Não foi possível reordenar esses hábitos.' };
  }
  const orders = group.map((habit) => habit.sortOrder).sort((left, right) => left - right);
  for (let index = 0; index < orderedIds.length; index += 1) {
    const habit = group.find((item) => item.id === orderedIds[index]);
    if (!habit || habit.sortOrder === orders[index]) {
      continue;
    }
    const saved = await updateUserHabit(habit.id, { sortOrder: orders[index] });
    if (!saved.ok) {
      return saved;
    }
  }
  return { ok: true, message: 'Ordem salva.' };
}

export function habitTitle(habit: UserHabit, catalogHabits: readonly CatalogHabit[]) {
  if (habit.customLabel) {
    return habit.customLabel;
  }
  return catalogHabits.find((item) => item.id === habit.catalogHabitId)?.label ?? 'Hábito';
}
