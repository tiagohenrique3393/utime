import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';

import { DesafiosExperience, type DesafiosScreenView } from '@/components/desafios-experience';
import {
  acknowledgeChallenge,
  checkInChallenge,
  loadChallengeContract,
  loadChallengeState,
  replaceChallenge,
  saveChallengeDraft,
  signChallenge,
  type ActiveChallenge,
  type ChallengeSnapshot,
} from '@/lib/desafios-api';
import { emptyCommitments, type ChallengeDraft, type ChallengePillar, type SignatureStroke } from '@/lib/desafios';
import { useAccountPlan } from '@/lib/account-plan';
import { todayKey } from '@/lib/habit-day';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';

const blank: ChallengeSnapshot = {
  plan: 'unavailable',
  today: todayKey(),
  firstName: '',
  draft: { durationDays: null, commitments: emptyCommitments() },
  active: null,
  notice: null,
  counts: { concluded: 0, rescinded: 0 },
  history: [],
  message: '',
};

function newKey() {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  const bytes = new Uint8Array(16);
  cryptoRef.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((item) => item.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function DesafiosScreen() {
  const signedIn = useRequireSession();
  const access = useAccountPlan();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const [snapshot, setSnapshot] = useState<ChallengeSnapshot>(blank);
  const [view, setView] = useState<DesafiosScreenView>('home');
  const [document, setDocument] = useState<ActiveChallenge | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const stack = useRef<DesafiosScreenView[]>(['home']);
  const signKey = useRef(newKey());

  const load = useCallback(async () => {
    const next = await loadChallengeState();
    setSnapshot({ ...next, today: next.today || todayKey(), firstName: next.firstName || profile.firstName });
    if (next.message) {
      setMessage(next.message);
    }
  }, [profile.firstName]);

  useFocusEffect(useCallback(() => {
    if (!signedIn || access.plan !== 'premium') {
      return;
    }
    setNoticeHidden(false);
    void load();
  }, [signedIn, access, load]));

  function open(next: DesafiosScreenView) {
    if (next === 'contract') {
      signKey.current = newKey();
    }
    stack.current = [...stack.current, next];
    setView(next);
  }

  function back() {
    if (stack.current.length > 1) {
      stack.current = stack.current.slice(0, -1);
      setView(stack.current[stack.current.length - 1] ?? 'home');
      return;
    }
    router.navigate('/inicio');
  }

  async function onDraft(draft: ChallengeDraft) {
    setSnapshot((current) => ({ ...current, draft }));
    const error = await saveChallengeDraft(draft);
    if (error) {
      setMessage(error);
    }
  }

  async function onSign(input: { mode: 'touch' | 'typed'; name: string; strokes: SignatureStroke[] }) {
    if (!snapshot.draft.durationDays || pending) {
      return;
    }
    setPending(true);
    const result = await signChallenge({
      clientKey: signKey.current,
      durationDays: snapshot.draft.durationDays,
      commitments: snapshot.draft.commitments,
      signatureMode: input.mode,
      signatureText: input.name,
      signatureStrokes: input.strokes,
    });
    setPending(false);
    if (result.message) {
      setMessage(result.message);
      return;
    }
    setMessage('');
    await load();
    stack.current = ['home', 'track'];
    setView('track');
  }

  async function onCheckIn(pillar: ChallengePillar) {
    if (!snapshot.active || pending) {
      return;
    }
    setPending(true);
    const error = await checkInChallenge(snapshot.active.id, pillar);
    setPending(false);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage('');
    await load();
  }

  async function onAcknowledge() {
    if (!snapshot.notice || pending) {
      return;
    }
    setPending(true);
    const error = await acknowledgeChallenge(snapshot.notice.id);
    setPending(false);
    if (error) {
      setMessage(error);
      return;
    }
    setNoticeHidden(true);
    setMessage('');
    await load();
  }

  async function onReplace() {
    if (!snapshot.active || pending) {
      return;
    }
    setPending(true);
    const error = await replaceChallenge(snapshot.active.id);
    setPending(false);
    if (error) {
      setMessage(error);
      return;
    }
    const draft = { durationDays: snapshot.active.durationDays, commitments: snapshot.active.commitments };
    setMessage('');
    await load();
    setSnapshot((current) => ({ ...current, draft, active: null }));
    await saveChallengeDraft(draft);
    open('edit');
  }

  async function onOpenDocument(id: string) {
    setPending(true);
    const result = await loadChallengeContract(id);
    setPending(false);
    if (!result.contract) {
      setMessage(result.message);
      return;
    }
    setDocument(result.contract);
    open('document');
  }

  if (!signedIn) {
    return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
  }

  return (
    <DesafiosExperience
      snapshot={snapshot}
      access={access.plan}
      notice={access.notice}
      journey={profile.journey}
      view={view}
      document={document}
      noticeVisible={Boolean(snapshot.notice) && !noticeHidden}
      message={message}
      pending={pending}
      onBack={back}
      onView={open}
      onDraft={(draft) => { void onDraft(draft); }}
      onSign={(input) => { void onSign(input); }}
      onCheckIn={(pillar) => { void onCheckIn(pillar); }}
      onAcknowledge={() => { void onAcknowledge(); }}
      onHideNotice={() => setNoticeHidden(true)}
      onReplace={() => { void onReplace(); }}
      onOpenDocument={(id) => { void onOpenDocument(id); }}
    />
  );
}
