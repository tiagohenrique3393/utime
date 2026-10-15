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
import {
  addCircleFriend,
  applyAvatars,
  circleErrorMessage,
  fetchAvatarMap,
  fetchCircleFaces,
  removeCircleFriend,
  searchCircle,
  type CirclePerson,
} from '@/lib/circle-api';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

export default function AddFriendsScreen() {
  const signedIn = useRequireSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CirclePerson[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [ownPath, setOwnPath] = useState(getOwnAvatarPath());
  const [ownReady, setOwnReady] = useState(isOwnAvatarReady());
  const paintGeneration = useRef(0);

  useEffect(
    () =>
      subscribeOwnAvatar(() => {
        setOwnPath(getOwnAvatarPath());
        setOwnReady(isOwnAvatarReady());
      }),
    [],
  );

  const loadFaces = useCallback(async () => {
    if (query.trim().length >= 2) {
      return;
    }
    setLoading(true);
    try {
      const faces = await fetchCircleFaces();
      const generation = paintGeneration.current + 1;
      paintGeneration.current = generation;
      setResults(faces.map((face) => ({ ...face, added: true })));
      const paths = await fetchAvatarMap(faces.map((face) => face.userId));
      if (!paths || paintGeneration.current !== generation) {
        return;
      }
      setResults((current) => applyAvatars(current, paths));
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      void loadFaces();
    }, [loadFaces]),
  );

  async function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      await loadFaces();
      return;
    }
    setLoading(true);
    try {
      const found = await searchCircle(value);
      const generation = paintGeneration.current + 1;
      paintGeneration.current = generation;
      setResults(found);
      setNotice('');
      const paths = await fetchAvatarMap(found.map((person) => person.userId));
      if (paths && paintGeneration.current === generation) {
        setResults((current) => applyAvatars(current, paths));
      }
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    } finally {
      setLoading(false);
    }
  }

  async function toggle(person: CirclePerson) {
    setPendingId(person.userId);
    try {
      if (person.added) {
        await removeCircleFriend(person.userId);
      } else {
        await addCircleFriend(person.userId);
      }
      setResults((current) => current.map((item) => (item.userId === person.userId ? { ...item, added: !item.added } : item)));
      setNotice('');
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    } finally {
      setPendingId(null);
    }
  }

  if (!signedIn) {
    return <View style={styles.blocked} />;
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
          <Text style={styles.subtitle}>BUSQUE USUÁRIOS NO RANKING</Text>
        </View>
        <View style={styles.back} />
      </View>
      <View style={styles.search}>
        <CircleMark name="search" size={16} />
        <TextInput
          value={query}
          onChangeText={(value) => void search(value)}
          placeholder="Buscar por nome ou @usuário"
          placeholderTextColor={palette.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.section}>{query.trim().length >= 2 ? 'RESULTADOS' : 'MEUS AMIGOS'}</Text>
      {loading ? <Text style={styles.notice}>Buscando…</Text> : null}
      {!loading && !notice && results.length === 0 ? <Text style={styles.notice}>Nenhuma pessoa encontrada.</Text> : null}
      {results.map((person) => {
        const pending = pendingId === person.userId;
        return (
        <View key={person.userId} style={styles.row}>
          <CircleAvatar
            size={40}
            uri={publicAvatarUrl(ownReady && person.userId === getSessionUserId() ? ownPath : person.avatarPath)}
          />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.name}>
              {person.name}
            </Text>
            {person.handle ? <Text style={styles.handle}>{`@${person.handle}`}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending, selected: person.added === true }}
            disabled={pending}
            onPress={() => void toggle(person)}
            style={[styles.action, person.added && styles.actionOn, pending && styles.actionPending]}>
            {pending ? null : <CircleMark name={person.added ? 'check' : 'plus'} size={13} color={person.added ? palette.text : palette.champagne} />}
            <Text style={[styles.actionLabel, person.added && styles.actionLabelOn]}>{pending ? '…' : person.added ? 'Adicionado' : 'Adicionar'}</Text>
          </Pressable>
        </View>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: page,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headCopy: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    color: palette.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  search: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#121212',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: palette.text,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  section: {
    marginTop: 18,
    color: palette.muted,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  notice: {
    marginTop: 12,
    color: palette.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
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
  copy: {
    flex: 1,
  },
  name: {
    color: palette.text,
    fontFamily: fonts.textMedium,
    fontSize: 15,
  },
  handle: {
    color: palette.muted,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  action: {
    minHeight: 34,
    minWidth: 112,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.champagne,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    boxShadow: '0 0 10px rgba(232, 200, 142, 0.18)',
  },
  actionOn: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  actionPending: {
    opacity: 0.55,
  },
  actionLabel: {
    color: palette.textChampagne,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  actionLabelOn: {
    color: palette.text,
  },
});
