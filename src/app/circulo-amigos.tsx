import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { CircleAvatar } from '@/components/circle-avatar';
import { CircleMark } from '@/components/circle-icons';
import { circlePalette as palette } from '@/components/circle-palette';
import { CirclePlanet } from '@/components/circle-planet';
import { fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { getOwnAvatarPath, isOwnAvatarReady, subscribeOwnAvatar } from '@/lib/avatar';
import { publicAvatarUrl } from '@/lib/avatar-store';
import { friendNotice } from '@/lib/circle';
import {
  acceptCircleFriend,
  addCircleFriend,
  applyAvatars,
  circleFailureMessage,
  declineCircleFriend,
  fetchAvatarMap,
  fetchCircleFaces,
  removeCircleFriend,
  searchCircle,
  type CirclePerson,
} from '@/lib/circle-api';
import { exactFriendLookup } from '@/lib/friend-lookup';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

function FriendActions({
  person,
  pending,
  onAct,
}: {
  person: CirclePerson;
  pending: boolean;
  onAct: (action: 'add' | 'accept' | 'decline' | 'remove') => void;
}) {
  if (person.relation === 'received') {
    return (
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={pending} onPress={() => onAct('decline')} style={[styles.action, styles.actionCompact, pending && styles.actionPending]}>
          <Text style={styles.actionLabel}>Recusar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={pending} onPress={() => onAct('accept')} style={[styles.action, styles.actionCompact, pending && styles.actionPending]}>
          <Text style={styles.actionLabel}>{pending ? '…' : 'Aceitar'}</Text>
        </Pressable>
      </View>
    );
  }
  const action = person.relation === 'friend' || person.relation === 'sent' ? 'remove' : 'add';
  const label = person.relation === 'friend' ? 'Desfazer' : person.relation === 'sent' ? 'Cancelar' : 'Adicionar';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: pending, selected: person.relation === 'friend' }}
      disabled={pending}
      onPress={() => onAct(action)}
      style={[styles.action, person.relation === 'friend' && styles.actionOn, pending && styles.actionPending]}>
      {pending || person.relation !== 'none' ? null : <CircleMark name="plus" size={13} color={palette.champagne} />}
      <Text style={[styles.actionLabel, person.relation === 'friend' && styles.actionLabelOn]}>{pending ? '…' : label}</Text>
    </Pressable>
  );
}

function PersonRow({
  person,
  pending,
  ownPath,
  ownReady,
  onAct,
}: {
  person: CirclePerson;
  pending: boolean;
  ownPath: string | null;
  ownReady: boolean;
  onAct: (person: CirclePerson, action: 'add' | 'accept' | 'decline' | 'remove') => void;
}) {
  const photo = ownReady && person.userId === getSessionUserId() ? ownPath : person.avatarPath;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${person.name}`}
        onPress={() => router.push(`/perfil-publico?id=${person.userId}` as Href)}
        style={styles.person}>
        <CircleAvatar size={40} uri={publicAvatarUrl(photo)} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {person.name}
          </Text>
          {person.handle ? <Text style={styles.handle}>{`@${person.handle}`}</Text> : null}
        </View>
      </Pressable>
      <FriendActions person={person} pending={pending} onAct={(action) => onAct(person, action)} />
    </View>
  );
}

export default function AddFriendsScreen() {
  const signedIn = useRequireSession();
  const [draft, setDraft] = useState('');
  const [people, setPeople] = useState<CirclePerson[]>([]);
  const [found, setFound] = useState<CirclePerson[] | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [ownPath, setOwnPath] = useState(getOwnAvatarPath());
  const [ownReady, setOwnReady] = useState(isOwnAvatarReady());
  const paintGeneration = useRef(0);
  const acting = useRef(false);

  useEffect(
    () =>
      subscribeOwnAvatar(() => {
        setOwnPath(getOwnAvatarPath());
        setOwnReady(isOwnAvatarReady());
      }),
    [],
  );

  const loadFaces = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const faces = await fetchCircleFaces();
      const generation = paintGeneration.current + 1;
      paintGeneration.current = generation;
      setPeople(faces);
      const paths = await fetchAvatarMap(faces.map((face) => face.userId));
      if (!paths || paintGeneration.current !== generation) {
        return;
      }
      setPeople((current) => applyAvatars(current, paths));
    } catch (error) {
      if (!silent) {
        setNotice(circleFailureMessage(error as { code?: string; message?: string }, 'friends'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFaces();
    }, [loadFaces]),
  );

  async function search() {
    const lookup = exactFriendLookup(draft);
    if (lookup.kind === 'invalid') {
      setFound(null);
      setNotice('Informe o @ completo ou o e-mail completo.');
      return;
    }
    setSearching(true);
    setNotice('');
    try {
      const rows = await searchCircle(lookup.kind === 'email' ? lookup.value : `@${lookup.value}`);
      const mine = getSessionUserId();
      const visible = rows.filter((person) => person.userId !== mine);
      const generation = paintGeneration.current + 1;
      paintGeneration.current = generation;
      setFound(visible);
      const paths = await fetchAvatarMap(visible.map((person) => person.userId));
      if (paths && paintGeneration.current === generation) {
        setFound((current) => (current ? applyAvatars(current, paths) : current));
      }
      if (visible.length === 0) {
        setNotice('Nenhuma pessoa encontrada.');
      }
    } catch (error) {
      setFound(null);
      setNotice(circleFailureMessage(error as { code?: string; message?: string }, 'friends'));
    } finally {
      setSearching(false);
    }
  }

  async function act(person: CirclePerson, action: 'add' | 'accept' | 'decline' | 'remove') {
    if (acting.current) {
      return;
    }
    acting.current = true;
    setPendingId(person.userId);
    setNotice('');
    try {
      if (action === 'accept') {
        await acceptCircleFriend(person.userId);
      } else if (action === 'decline') {
        await declineCircleFriend(person.userId);
      } else if (action === 'remove') {
        await removeCircleFriend(person.userId);
      } else {
        await addCircleFriend(person.userId);
      }
      setNotice(friendNotice(action, person.relation));
      await loadFaces(true);
      const lookup = exactFriendLookup(draft);
      if (found && lookup.kind !== 'invalid') {
        try {
          const rows = await searchCircle(lookup.kind === 'email' ? lookup.value : `@${lookup.value}`);
          const mine = getSessionUserId();
          setFound(rows.filter((item) => item.userId !== mine));
        } catch {
          setFound(null);
        }
      }
    } catch (error) {
      setNotice(circleFailureMessage(error as { code?: string; message?: string }, 'friend'));
    } finally {
      acting.current = false;
      setPendingId(null);
    }
  }

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  const received = people.filter((person) => person.relation === 'received');
  const sent = people.filter((person) => person.relation === 'sent');
  const friends = people.filter((person) => person.relation === 'friend');

  function section(title: string, rows: CirclePerson[], empty: string) {
    return (
      <View>
        <Text style={styles.section}>{title}</Text>
        {rows.length === 0 ? <Text style={styles.notice}>{empty}</Text> : null}
        {rows.map((person) => (
          <PersonRow
            key={`${title}-${person.userId}`}
            person={person}
            pending={pendingId === person.userId}
            ownPath={ownPath}
            ownReady={ownReady}
            onAct={(item, action) => void act(item, action)}
          />
        ))}
      </View>
    );
  }

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<CirclePlanet />}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao ranking" onPress={() => router.replace('/ranking' as Href)} style={styles.back}>
          <CircleMark name="chevronLeft" size={22} />
        </Pressable>
        <View style={styles.headCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            ADICIONAR AMIGOS
          </Text>
          <Text style={styles.subtitle}>@ COMPLETO OU E-MAIL COMPLETO</Text>
        </View>
        <View style={styles.back} />
      </View>
      <View style={styles.search}>
        <CircleMark name="search" size={16} />
        <TextInput
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            setFound(null);
          }}
          onSubmitEditing={() => void search()}
          placeholder="@usuario ou e-mail completo"
          placeholderTextColor={palette.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" disabled={searching} onPress={() => void search()} style={styles.searchButton}>
          <Text style={styles.searchLabel}>{searching ? '…' : 'Buscar'}</Text>
        </Pressable>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {loading ? <Text style={styles.notice}>Carregando amigos…</Text> : null}
      {found ? section('RESULTADO', found, 'Nenhuma pessoa encontrada.') : null}
      {section('SOLICITAÇÕES RECEBIDAS', received, 'Nenhuma solicitação recebida.')}
      {sent.length > 0 ? section('SOLICITAÇÕES ENVIADAS', sent, '') : null}
      {section('MEUS AMIGOS', friends, 'Você ainda não tem amigos confirmados.')}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, backgroundColor: page },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headCopy: { flex: 1, alignItems: 'center' },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: 0.8, textAlign: 'center' },
  subtitle: { marginTop: 4, color: palette.textChampagne, fontFamily: fonts.display, fontSize: 11, letterSpacing: 1.1, textAlign: 'center' },
  search: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#121212',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
  },
  input: { flex: 1, minHeight: 44, color: palette.text, fontFamily: fonts.text, fontSize: 14 },
  searchButton: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.champagne },
  searchLabel: { color: '#14120C', fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  section: { marginTop: 18, color: palette.muted, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1.2 },
  notice: { marginTop: 12, color: palette.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  row: {
    marginTop: 8,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214, 181, 122, 0.42)',
    backgroundColor: '#09090B',
    paddingHorizontal: 10,
    boxShadow: '0 0 14px rgba(232, 200, 142, 0.08)',
  },
  person: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1 },
  name: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 15 },
  handle: { color: palette.muted, fontFamily: fonts.text, fontSize: 12 },
  action: {
    minHeight: 34,
    minWidth: 96,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.champagne,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionCompact: { minWidth: 76 },
  actionOn: { borderColor: 'transparent', backgroundColor: 'transparent' },
  actionPending: { opacity: 0.55 },
  actionLabel: { color: palette.textChampagne, fontFamily: fonts.text, fontSize: 12 },
  actionLabelOn: { color: palette.text },
  actionRow: { flexDirection: 'row', gap: 6 },
});
