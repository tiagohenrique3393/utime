import { supabase } from '../../utils/supabase';

export type JourneyId = 'metime' | 'womantime';

export type GoalId = 'disciplina' | 'corpo' | 'mente' | 'espirito' | 'rotina';

export type Profile = {
  firstName: string;
  journey: JourneyId | null;
  goals: GoalId[];
  completed: boolean;
};

const STORAGE_KEY = 'youtime.preview.profile';
const goalIds = new Set<GoalId>(['disciplina', 'corpo', 'mente', 'espirito', 'rotina']);
let ownerId: string | null = null;
let profileRevision = 0;
let profilePushAgain = false;
let profilePush: Promise<void> | null = null;

function profileKey() {
  return ownerId ? `youtime.profile.${ownerId}` : STORAGE_KEY;
}

const emptyProfile: Profile = {
  firstName: '',
  journey: null,
  goals: [],
  completed: false,
};

let profile: Profile = { ...emptyProfile, goals: [] };
let lastProfilePushOk = true;
const profileListeners = new Set<() => void>();

function emitProfile() {
  profileListeners.forEach((listener) => listener());
}

export function subscribeProfile(listener: () => void) {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
}

export function getProfileSnapshot() {
  return profile;
}

function isGoalId(value: string): value is GoalId {
  return goalIds.has(value as GoalId);
}

function copyProfile(next: Profile): Profile {
  return {
    firstName: typeof next.firstName === 'string' ? next.firstName : '',
    journey: next.journey === 'metime' || next.journey === 'womantime' ? next.journey : null,
    goals: Array.isArray(next.goals) ? next.goals.filter(isGoalId) : [],
    completed: Boolean(next.completed),
  };
}

function writeProfileLocal() {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(profileKey(), JSON.stringify(profile));
  } catch {
    // A prévia nativa guarda o perfil só na memória da sessão.
  }
}

async function upsertProfile(userId: string, next: Profile) {
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      first_name: next.firstName,
      journey: next.journey,
      goals: next.goals,
      onboarding_completed: next.completed,
    },
    { onConflict: 'user_id' },
  );
  return !error;
}

function scheduleProfilePush() {
  const userId = ownerId;
  if (!userId) {
    return;
  }
  profilePushAgain = true;
  if (!profilePush) {
    profilePush = runProfilePush(userId).finally(() => {
      profilePush = null;
    });
  }
}

async function runProfilePush(userId: string) {
  while (profilePushAgain && ownerId === userId) {
    profilePushAgain = false;
    const next = copyProfile(profile);
    lastProfilePushOk = await upsertProfile(userId, next);
  }
}

function persistProfile() {
  writeProfileLocal();
  scheduleProfilePush();
}

function readProfileRaw() {
  const key = profileKey();
  if (typeof localStorage !== 'undefined') {
    const local = localStorage.getItem(key);
    if (local) {
      return local;
    }
  }
  if (!ownerId && typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(key);
  }
  return null;
}

function sameProfile(left: Profile, right: Profile) {
  return (
    left.firstName === right.firstName &&
    left.journey === right.journey &&
    left.completed === right.completed &&
    left.goals.length === right.goals.length &&
    left.goals.every((goal, index) => goal === right.goals[index])
  );
}

function restoreProfile() {
  try {
    const raw = readProfileRaw();
    if (!raw) {
      return;
    }
    const next = copyProfile(JSON.parse(raw) as Profile);
    if (!sameProfile(profile, next)) {
      profile = next;
    }
  } catch {
    profile = { ...emptyProfile, goals: [] };
  }
}

restoreProfile();

export function getProfileOwner() {
  return ownerId;
}

export function getProfileRevision() {
  return profileRevision;
}

export function profileHasContent(next: Profile = profile) {
  return next.firstName.trim().length > 0 || next.journey !== null || next.goals.length > 0 || next.completed;
}

export function setProfileOwner(userId: string | null) {
  if (ownerId === userId) {
    return;
  }
  ownerId = userId;
  profileRevision = 0;
  profile = { ...emptyProfile, goals: [] };
  restoreProfile();
  emitProfile();
}

export function loadProfile(): Profile {
  restoreProfile();
  return copyProfile(profile);
}

export function saveProfile(next: Profile) {
  profileRevision += 1;
  profile = copyProfile(next);
  persistProfile();
  emitProfile();
}

export async function updateProfileName(firstName: string) {
  const userId = ownerId;
  const trimmed = firstName.trim();
  if (!userId || trimmed.length === 0) {
    return false;
  }
  const previous = copyProfile(profile);
  if (previous.firstName === trimmed) {
    return true;
  }
  profileRevision += 1;
  profile = copyProfile({ ...previous, firstName: trimmed });
  writeProfileLocal();
  emitProfile();
  scheduleProfilePush();
  await (profilePush ?? Promise.resolve());
  if (lastProfilePushOk && ownerId === userId) {
    return true;
  }
  if (ownerId === userId) {
    profileRevision += 1;
    profile = previous;
    writeProfileLocal();
    emitProfile();
  }
  return false;
}

export function replaceProfile(userId: string, next: Profile) {
  if (ownerId !== userId) {
    return;
  }
  profile = copyProfile(next);
  writeProfileLocal();
  emitProfile();
}

export function pushProfile(userId: string) {
  if (ownerId !== userId) {
    return Promise.resolve();
  }
  scheduleProfilePush();
  return profilePush ?? Promise.resolve();
}

export function isOnboardingComplete() {
  const current = loadProfile();
  return current.completed && current.firstName.trim().length > 0;
}
