import { supabase } from '../../utils/supabase';

export type HabitPeriod = 'manha' | 'tarde' | 'noite';
export type HabitPillar = 'corpo' | 'mente' | 'espirito';
export type HabitRelevance = 'alta' | 'media' | 'baixa';

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
};

let relevanceAvailable: boolean | null = null;

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

function isMissingRelevance(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false;
  }
  return `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase().includes('relevance');
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
  };
}

function nextSortOrder() {
  return habits.reduce((max, habit) => Math.max(max, habit.sortOrder), 0) + 1;
}

async function readUserHabits(userId: string): Promise<{ data: HabitRow[] | null; error: QueryError }> {
  if (relevanceAvailable !== false) {
    const result = await supabase
      .from('user_habits')
      .select('id,catalog_habit_id,custom_label,period,pillar,sort_order,active,relevance')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (!result.error) {
      relevanceAvailable = true;
      return { data: (result.data ?? []) as HabitRow[], error: null };
    }
    if (!isMissingRelevance(result.error)) {
      return { data: null, error: result.error };
    }
    relevanceAvailable = false;
  }
  const fallback = await supabase
    .from('user_habits')
    .select('id,catalog_habit_id,custom_label,period,pillar,sort_order,active')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  return { data: (fallback.data ?? null) as HabitRow[] | null, error: fallback.error };
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
  const send = async (includeRelevance: boolean) => {
    const payload = { ...values };
    if (!includeRelevance) {
      delete payload.relevance;
    }
    if (operation === 'insert' && includeRelevance) {
      return supabase
        .from('user_habits')
        .insert(payload)
        .select('id,catalog_habit_id,custom_label,period,pillar,sort_order,active,relevance')
        .single();
    }
    if (operation === 'insert') {
      return supabase
        .from('user_habits')
        .insert(payload)
        .select('id,catalog_habit_id,custom_label,period,pillar,sort_order,active')
        .single();
    }
    if (includeRelevance) {
      return supabase
        .from('user_habits')
        .update(payload)
        .eq('id', habitId ?? '')
        .eq('user_id', userId)
        .select('id,catalog_habit_id,custom_label,period,pillar,sort_order,active,relevance')
        .single();
    }
    return supabase
      .from('user_habits')
      .update(payload)
      .eq('id', habitId ?? '')
      .eq('user_id', userId)
      .select('id,catalog_habit_id,custom_label,period,pillar,sort_order,active')
      .single();
  };
  if (relevanceAvailable === false) {
    const saved = await send(false);
    return { data: (saved.data ?? null) as HabitRow | null, error: saved.error };
  }
  const result = await send(true);
  if (result.error && isMissingRelevance(result.error)) {
    relevanceAvailable = false;
    const saved = await send(false);
    return { data: (saved.data ?? null) as HabitRow | null, error: saved.error };
  }
  if (!result.error) {
    relevanceAvailable = true;
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
  const existing = habits.find((habit) => habit.catalogHabitId === catalogHabitId);
  if (existing?.active) {
    return { ok: true, message: 'Esse hábito já está na sua rotina.' };
  }
  if (existing) {
    const restored = await updateUserHabit(existing.id, {
      active: true,
      period: source.period,
      pillar: source.pillar,
      relevance,
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
    period: source.period,
    pillar: source.pillar,
    sort_order: nextSortOrder(),
    active: true,
    relevance,
  });
  if (error || !data) {
    return { ok: false, message: 'Não foi possível escolher esse hábito.' };
  }
  const created = habitFromRow(data as HabitRow);
  if (!created) {
    return { ok: false, message: 'Não foi possível escolher esse hábito.' };
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
  const relevance = input.relevance ?? null;
  if (relevance !== null && !isRelevance(relevance)) {
    return { ok: false, message: 'Escolha a relevância alta, média ou baixa.' };
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
    relevance,
  });
  if (error || !data) {
    return { ok: false, message: 'Não foi possível adicionar esse hábito.' };
  }
  const created = habitFromRow(data as HabitRow);
  if (!created) {
    return { ok: false, message: 'Não foi possível adicionar esse hábito.' };
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
  const updated = habitFromRow(data as HabitRow);
  if (!updated) {
    return { ok: false, message: 'Não foi possível editar esse hábito.' };
  }
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

export function habitTitle(habit: UserHabit, catalogHabits: readonly CatalogHabit[]) {
  if (habit.customLabel) {
    return habit.customLabel;
  }
  return catalogHabits.find((item) => item.id === habit.catalogHabitId)?.label ?? 'Hábito';
}
