let sessionUserId: string | null = null;

export function getSessionUserId() {
  return sessionUserId;
}

export function setSessionUserId(userId: string | null) {
  sessionUserId = userId;
}
