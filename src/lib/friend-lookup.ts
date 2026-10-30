import { handleIssue, normalizeHandle } from '@/lib/username';

export type ExactFriendLookup = { kind: 'handle'; value: string } | { kind: 'email'; value: string } | { kind: 'invalid' };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function exactFriendLookup(raw: string): ExactFriendLookup {
  const value = raw.trim();
  if (!value || value.length > 254) {
    return { kind: 'invalid' };
  }
  if (value.startsWith('@')) {
    const handle = normalizeHandle(value);
    if (handleIssue(handle)) {
      return { kind: 'invalid' };
    }
    return { kind: 'handle', value: handle };
  }
  if (!emailPattern.test(value)) {
    return { kind: 'invalid' };
  }
  return { kind: 'email', value: value.toLowerCase() };
}
