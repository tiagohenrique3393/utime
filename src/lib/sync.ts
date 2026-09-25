import { supabase } from '../../utils/supabase';
import {
  getProfileOwner,
  getProfileRevision,
  profileHasContent,
  pushProfile,
  replaceProfile,
  type GoalId,
  type Profile,
} from '@/lib/profile';
import {
  getJourneyRevision,
  getTaskOwner,
  journeyHasContent,
  pushJourney,
  replaceJourney,
  type RemoteDay,
} from '@/lib/tasks';

const HYDRATE_TIMEOUT_MS = 8000;

type ProfileRow = {
  first_name: string | null;
  journey: string | null;
  goals: string[] | null;
  onboarding_completed: boolean | null;
};

type DayRow = {
  day_number: number;
  completed_task_ids: string[] | null;
  started: boolean | null;
};

type StateRow = {
  test_mode: boolean | null;
};

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isGoalId(value: string): value is GoalId {
  return value === 'disciplina' || value === 'corpo' || value === 'mente' || value === 'espirito' || value === 'rotina';
}

function profileFromRow(row: ProfileRow): Profile {
  return {
    firstName: row.first_name ?? '',
    journey: row.journey === 'metime' || row.journey === 'womantime' ? row.journey : null,
    goals: Array.isArray(row.goals) ? row.goals.filter(isGoalId) : [],
    completed: Boolean(row.onboarding_completed),
  };
}

export async function hydrateAccount(userId: string) {
  const profileRevision = getProfileRevision();
  const journeyRevision = getJourneyRevision();

  try {
    const [profileResult, daysResult, stateResult] = await withTimeout(
      Promise.all([
        supabase
          .from('profiles')
          .select('first_name,journey,goals,onboarding_completed')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('journey_days')
          .select('day_number,completed_task_ids,started')
          .eq('user_id', userId),
        supabase.from('journey_state').select('test_mode').eq('user_id', userId).maybeSingle(),
      ]),
      HYDRATE_TIMEOUT_MS,
    );

    if (getProfileOwner() !== userId || getTaskOwner() !== userId) {
      return;
    }
    if (profileResult.error || daysResult.error || stateResult.error) {
      return;
    }

    const remoteProfile = profileResult.data as ProfileRow | null;
    const remoteDays = (daysResult.data ?? []) as DayRow[];
    const remoteState = stateResult.data as StateRow | null;
    const hasRemoteProfile = remoteProfile !== null;
    const hasRemoteJourney = remoteDays.length > 0 || remoteState !== null;

    if (!hasRemoteProfile && profileRevision === getProfileRevision() && profileHasContent()) {
      await pushProfile(userId);
    } else if (hasRemoteProfile && profileRevision === getProfileRevision()) {
      replaceProfile(userId, profileFromRow(remoteProfile));
    }

    if (!hasRemoteJourney && journeyRevision === getJourneyRevision() && journeyHasContent()) {
      await pushJourney(userId);
    } else if (hasRemoteJourney && journeyRevision === getJourneyRevision()) {
      const days: RemoteDay[] = remoteDays.map((day) => ({
        day: day.day_number,
        ids: Array.isArray(day.completed_task_ids) ? day.completed_task_ids : [],
        started: day.started === true,
      }));
      replaceJourney(userId, days, remoteState?.test_mode === true);
    }
  } catch {
    // Sem as tabelas, ou sem rede, o aplicativo continua com os dados deste aparelho.
  }
}
