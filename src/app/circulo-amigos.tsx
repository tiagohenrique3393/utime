import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { CircleAvatar } from '@/components/circle-avatar';
import { CirclePlanet } from '@/components/circle-planet';
import { fonts, ui } from '@/constants/theme';
import {
  addCircleFriend,
  circleErrorMessage,
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

  const loadFaces = useCallback(async () => {
    setLoading(true);
    try {
      const faces = await fetchCircleFaces();
      setResults((current) => {
        if (query.trim().length >= 2) {
          return current;
        }
        return faces.map((face) => ({ ...face, added: true }));
      });
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
      setResults(await searchCircle(value));
      setNotice('');
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
          <Text style={styles.backLabel}>‹</Text>
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
        <Text style={styles.searchMark}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={(value) => void search(value)}
          placeholder="Buscar por nome ou @usuário"
          placeholderTextColor={ui.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.section}>{query.trim().length >= 2 ? 'RESULTADOS' : 'MEUS AMIGOS'}</Text>
      {loading ? <Text style={styles.notice}>Buscando…</Text> : null}
      {!loading && results.length === 0 ? <Text style={styles.notice}>Nenhuma pessoa encontrada.</Text> : null}
      {results.map((person) => {
        const pending = pendingId === person.userId;
        return (
        <View key={person.userId} style={styles.row}>
          <CircleAvatar size={40} />
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
            <Text style={[styles.actionLabel, person.added && styles.actionLabelOn]}>{pending ? '…' : person.added ? '✓ Adicionado' : '+ Adicionar'}</Text>
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
  backLabel: {
    color: ui.champagne,
    fontSize: 28,
    lineHeight: 30,
  },
  headCopy: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    color: ui.champagne,
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
    borderColor: 'rgba(232, 201, 155, 0.28)',
    backgroundColor: '#121212',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchMark: {
    color: ui.champagne,
    fontSize: 16,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  section: {
    marginTop: 18,
    color: ui.muted,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  notice: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 201, 155, 0.12)',
  },
  copy: {
    flex: 1,
  },
  name: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 15,
  },
  handle: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  action: {
    minHeight: 34,
    minWidth: 112,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.champagne,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(232, 201, 155, 0.18)',
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
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  actionLabelOn: {
    color: ui.text,
  },
});
