export type JourneyId = 'metime' | 'womantime';

export type GoalId = 'disciplina' | 'corpo' | 'mente' | 'espirito' | 'rotina';

export type Profile = {
  firstName: string;
  journey: JourneyId | null;
  goals: GoalId[];
  completed: boolean;
};

const STORAGE_KEY = 'youtime.preview.profile';
let ownerId: string | null = null;

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

function persistProfile() {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(profileKey(), JSON.stringify(profile));
  } catch {
    // A prévia nativa guarda o perfil só na memória da sessão.
  }
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

function restoreProfile() {
  try {
    const raw = readProfileRaw();
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as Profile;
    profile = {
      firstName: typeof parsed.firstName === 'string' ? parsed.firstName : '',
      journey: parsed.journey === 'metime' || parsed.journey === 'womantime' ? parsed.journey : null,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      completed: Boolean(parsed.completed),
    };
  } catch {
    profile = { ...emptyProfile, goals: [] };
  }
}

restoreProfile();

export function setProfileOwner(userId: string | null) {
  if (ownerId === userId) {
    return;
  }
  ownerId = userId;
  profile = { ...emptyProfile, goals: [] };
  restoreProfile();
}

export function loadProfile(): Profile {
  restoreProfile();
  return { ...profile, goals: [...profile.goals] };
}

export function saveProfile(next: Profile) {
  profile = { ...next, goals: [...next.goals] };
  persistProfile();
}

export function isOnboardingComplete() {
  return loadProfile().completed && loadProfile().firstName.trim().length > 0;
}
