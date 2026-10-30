import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { createElement, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { CircleAvatar } from '@/components/circle-avatar';
import { ProfilePlanet } from '@/components/profile-planet';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { publicAvatarUrl } from '@/lib/avatar-store';
import { acceptCircleFriend, addCircleFriend, circleFailureMessage, declineCircleFriend, removeCircleFriend } from '@/lib/circle-api';
import { friendNotice } from '@/lib/circle';
import { fetchPublicProfile, type PublicProfile } from '@/lib/public-profile';
import type { JourneyId } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

const journeyTitles: Record<JourneyId, string> = {
  metime: 'ManTime',
  womantime: 'WomanTime',
};

function Mark({ name }: { name: 'back' | 'more' | 'trophy' | 'star' | 'people' | 'person' | 'lock' | 'plus' }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.nativeMark} />;
  }
  const stroke = {
    fill: 'none',
    stroke: ui.champagneDeep,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'back') {
    return createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true }, createElement('path', { d: 'M14.5 6 8.5 12l6 6', ...stroke, stroke: ui.text }));
  }
  if (name === 'more') {
    return createElement(
      'svg',
      { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('circle', { cx: 6, cy: 12, r: 1.3, fill: ui.text }),
      createElement('circle', { cx: 12, cy: 12, r: 1.3, fill: ui.text }),
      createElement('circle', { cx: 18, cy: 12, r: 1.3, fill: ui.text }),
    );
  }
  if (name === 'trophy') {
    return createElement(
      'svg',
      { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('path', { d: 'M8 4h8v4.2a4 4 0 0 1-8 0V4Z', ...stroke }),
      createElement('path', { d: 'M8 6H5.5A2.5 2.5 0 0 0 8 10', ...stroke }),
      createElement('path', { d: 'M16 6h2.5A2.5 2.5 0 0 1 16 10', ...stroke }),
      createElement('path', { d: 'M12 12.2V16', ...stroke }),
      createElement('path', { d: 'M9 19.5h6', ...stroke }),
    );
  }
  if (name === 'star') {
    return createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true }, createElement('path', { d: 'm12 4 1.8 4.6L18.8 9l-3.6 3.1.9 4.9L12 14.8 7.9 17l.9-4.9L5.2 9l5-0.4L12 4Z', ...stroke }));
  }
  if (name === 'people') {
    return createElement(
      'svg',
      { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('circle', { cx: 9, cy: 9, r: 2.3, ...stroke }),
      createElement('circle', { cx: 16, cy: 10, r: 1.8, ...stroke }),
      createElement('path', { d: 'M4.8 17.5c.6-2.3 2.2-3.4 4.2-3.4s3.6 1.1 4.2 3.4', ...stroke }),
      createElement('path', { d: 'M14 14.4c1.3-.3 2.5.1 3.4 1.3.6.8.8 1.6.8 1.8', ...stroke }),
    );
  }
  if (name === 'person') {
    return createElement(
      'svg',
      { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('circle', { cx: 12, cy: 8, r: 3, ...stroke }),
      createElement('path', { d: 'M5.5 18.5c.8-3 3-4.5 6.5-4.5s5.7 1.5 6.5 4.5', ...stroke }),
    );
  }
  if (name === 'lock') {
    return createElement(
      'svg',
      { width: 14, height: 14, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('rect', { x: 5, y: 10, width: 14, height: 9, rx: 2, ...stroke, stroke: ui.muted }),
      createElement('path', { d: 'M8 10V8a4 4 0 0 1 8 0v2', ...stroke, stroke: ui.muted }),
    );
  }
  return createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement('circle', { cx: 10, cy: 8, r: 3, ...stroke, stroke: '#14120C' }),
    createElement('path', { d: 'M4.8 18c.7-2.6 2.4-4 5.2-4s4.5 1.4 5.2 4', ...stroke, stroke: '#14120C' }),
    createElement('path', { d: 'M17 8v6M14 11h6', ...stroke, stroke: '#14120C' }),
  );
}

export default function PublicProfileScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = typeof params.id === 'string' ? params.id : '';
  const { width } = useWindowDimensions();
  const photoSize = Math.round(Math.min(168, Math.max(132, width * 0.4)));
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [menu, setMenu] = useState(false);
  const acting = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!userId) {
      setState('missing');
      return;
    }
    if (!quiet) {
      setState('loading');
      setNotice('');
    }
    const result = await fetchPublicProfile(userId);
    if (!result.ok) {
      if (quiet) {
        return;
      }
      setProfile(null);
      setState(result.message === 'Perfil não encontrado.' ? 'missing' : 'error');
      setNotice(result.message);
      return;
    }
    setProfile(result.profile);
    setState('ready');
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function act(action: 'add' | 'accept' | 'decline' | 'remove') {
    if (!profile || acting.current || profile.relation === 'self') {
      return;
    }
    const relation = profile.relation;
    acting.current = true;
    setPending(true);
    setNotice('');
    setMenu(false);
    try {
      if (action === 'add') {
        await addCircleFriend(profile.userId);
      } else if (action === 'accept') {
        await acceptCircleFriend(profile.userId);
      } else if (action === 'decline') {
        await declineCircleFriend(profile.userId);
      } else {
        await removeCircleFriend(profile.userId);
      }
      setNotice(friendNotice(action, relation));
      await load(true);
    } catch (error) {
      setNotice(circleFailureMessage(error as { code?: string; message?: string }, 'friend'));
    } finally {
      acting.current = false;
      setPending(false);
    }
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const self = profile?.relation === 'self' || (profile?.userId !== undefined && profile.userId === getSessionUserId());
  const modality = profile?.journey ? journeyTitles[profile.journey] : '';
  const week = profile?.weekRank ? `${profile.weekRank}º` : '—';
  const canRemove = profile?.relation === 'friend' || profile?.relation === 'sent';

  return (
    <AppScreen width="narrow" showNav={false} backgroundColor={page} backdrop={<ProfilePlanet placement="photo" />}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.side}>
          <Mark name="back" />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Perfil público
        </Text>
        {canRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Opções da amizade" onPress={() => setMenu((open) => !open)} style={styles.side}>
            <View style={styles.more}>
              <Mark name="more" />
            </View>
          </Pressable>
        ) : (
          <View style={styles.side} />
        )}
      </View>
      {menu && canRemove ? (
        <Pressable accessibilityRole="button" onPress={() => void act('remove')} style={styles.menu}>
          <Text style={styles.menuLabel}>{profile?.relation === 'friend' ? 'Remover amigo' : 'Cancelar solicitação'}</Text>
        </Pressable>
      ) : null}

      {state === 'loading' ? <Text style={styles.notice}>Carregando perfil…</Text> : null}
      {state === 'missing' ? <Text style={styles.notice}>Perfil não encontrado. Essa conta pode ter sido excluída.</Text> : null}
      {state === 'error' ? <Text style={styles.notice}>{notice || 'Não foi possível carregar o perfil.'}</Text> : null}
      {state === 'error' ? (
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}>
          <Text style={styles.retryLabel}>Tentar de novo</Text>
        </Pressable>
      ) : null}

      {profile ? (
        <View style={styles.body}>
          <View style={styles.photoWrap}>
            <CircleAvatar size={photoSize} glow uri={publicAvatarUrl(profile.avatarPath)} />
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.handle ? <Text style={styles.handle}>{`@${profile.handle}`}</Text> : <Text style={styles.handleMissing}>Nome de usuário ainda não escolhido</Text>}
          {modality ? (
            <View style={styles.capsule}>
              <Text style={styles.capsuleLabel}>{modality}</Text>
            </View>
          ) : null}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Mark name="trophy" />
              <Text style={styles.statValue}>{profile.podiums}</Text>
              <Text style={styles.statLabel}>Pódios</Text>
            </View>
            <View style={styles.stat}>
              <Mark name="star" />
              <Text style={styles.statValue}>{profile.firsts}</Text>
              <Text style={styles.statLabel}>1º lugares</Text>
            </View>
            <View style={styles.stat}>
              <Mark name="people" />
              <Text style={styles.statValue}>{week}</Text>
              <Text style={styles.statLabel}>{profile.weekRank ? 'Ranking (semana)' : 'Fora da semana'}</Text>
            </View>
          </View>

          <View style={styles.about}>
            <View style={styles.aboutTitle}>
              <Mark name="person" />
              <Text style={styles.aboutLabel}>Sobre</Text>
            </View>
            <Text style={styles.aboutCopy}>
              {profile.bio || (self ? 'Você ainda não escreveu uma apresentação.' : 'Esta pessoa ainda não escreveu uma apresentação.')}
            </Text>
          </View>

          {self ? null : profile.relation === 'received' ? (
            <View style={styles.pair}>
              <Pressable accessibilityRole="button" disabled={pending} onPress={() => void act('decline')} style={[styles.secondary, pending && styles.pressed]}>
                <Text style={styles.secondaryLabel}>{pending ? 'Aguarde' : 'Recusar'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={pending} onPress={() => void act('accept')} style={[styles.primary, styles.pairButton, pending && styles.pressed]}>
                <Text style={styles.primaryLabel}>{pending ? 'Aguarde' : 'Aceitar'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={pending || profile.relation === 'friend'}
              onPress={() => void act(profile.relation === 'sent' ? 'remove' : 'add')}
              style={[styles.primary, profile.relation === 'friend' && styles.friendButton, pending && styles.pressed]}>
              {profile.relation === 'none' ? <Mark name="plus" /> : null}
              <Text style={[styles.primaryLabel, profile.relation === 'friend' && styles.friendLabel]}>
                {pending ? 'Aguarde' : profile.relation === 'friend' ? 'Amigos' : profile.relation === 'sent' ? 'Aguardando' : 'Adicionar amigo'}
              </Text>
            </Pressable>
          )}
          {notice && state === 'ready' ? <Text style={styles.notice}>{notice}</Text> : null}

          <View style={styles.privacy}>
            <Mark name="lock" />
            <Text style={styles.privacyCopy}>Apenas informações públicas são exibidas. E-mail e dados da conta ficam privados.</Text>
          </View>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  nativeMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.champagneDeep },
  header: { minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  side: { width: 64, minHeight: 36, justifyContent: 'center' },
  more: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  menu: {
    alignSelf: 'flex-end',
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.35)',
    backgroundColor: 'rgba(12, 12, 12, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuLabel: { color: '#E06B6B', fontFamily: fonts.text, fontSize: 14 },
  notice: {
    marginTop: 18,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retry: { marginTop: 12, alignSelf: 'center' },
  retryLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  body: { alignItems: 'center', marginTop: 18 },
  photoWrap: { marginTop: 8 },
  name: {
    marginTop: 16,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  handle: { marginTop: 4, color: ui.muted, fontFamily: fonts.text, fontSize: 15 },
  handleMissing: { marginTop: 4, color: ui.faint, fontFamily: fonts.text, fontSize: 13 },
  capsule: {
    marginTop: 10,
    minHeight: 26,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  stats: {
    marginTop: 22,
    alignSelf: 'stretch',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.22)',
    backgroundColor: 'rgba(17, 18, 20, 0.78)',
    flexDirection: 'row',
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: ui.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  statLabel: { color: ui.muted, fontFamily: fonts.text, fontSize: 11, textAlign: 'center' },
  about: {
    marginTop: 12,
    alignSelf: 'stretch',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.22)',
    backgroundColor: 'rgba(17, 18, 20, 0.78)',
    padding: 16,
  },
  aboutTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutLabel: { color: ui.champagneDeep, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  aboutCopy: { marginTop: 8, color: ui.text, fontFamily: fonts.text, fontSize: 15, lineHeight: 22 },
  primary: {
    marginTop: 16,
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: ui.champagne,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLabel: { color: '#14120C', fontFamily: fonts.display, fontSize: 16, letterSpacing: 1.1, textTransform: 'uppercase' },
  friendButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(196, 165, 116, 0.7)' },
  friendLabel: { color: ui.text },
  pair: { marginTop: 16, alignSelf: 'stretch', flexDirection: 'row', gap: 10 },
  pairButton: { flex: 1, marginTop: 0 },
  secondary: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: 1.1, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
  privacy: {
    marginTop: 14,
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: 'rgba(17, 18, 20, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  privacyCopy: { flex: 1, color: ui.muted, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 },
});
