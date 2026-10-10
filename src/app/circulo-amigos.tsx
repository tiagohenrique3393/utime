import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen, TextButton } from '@/components/app-screen';
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

  const loadFaces = useCallback(async () => {
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
    try {
      setResults(await searchCircle(value));
      setNotice('');
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    }
  }

  async function toggle(person: CirclePerson) {
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
    }
  }

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<CirclePlanet />}>
      <TextButton label="Ranking" onPress={() => router.replace('/ranking' as Href)} />
      <Text accessibilityRole="header" style={styles.title}>
        ADICIONAR AMIGOS
      </Text>
      <Text style={styles.subtitle}>BUSQUE USUÁRIOS NO RANKING</Text>
      <TextInput
        value={query}
        onChangeText={(value) => void search(value)}
        placeholder="Buscar por nome ou @usuário"
        placeholderTextColor={ui.faint}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.section}>{query.trim().length >= 2 ? 'RESULTADOS' : 'MEUS AMIGOS'}</Text>
      {results.length === 0 ? <Text style={styles.notice}>Nenhuma pessoa encontrada.</Text> : null}
      {results.map((person) => (
        <View key={person.userId} style={styles.row}>
          <CircleAvatar size={40} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.name}>
              {person.name}
            </Text>
            {person.handle ? <Text style={styles.handle}>{`@${person.handle}`}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={() => void toggle(person)} style={[styles.action, person.added && styles.actionOn]}>
            <Text style={[styles.actionLabel, person.added && styles.actionLabelOn]}>{person.added ? 'Adicionado' : '+ Adicionar'}</Text>
          </Pressable>
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: page,
  },
  title: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.8,
  },
  subtitle: {
    marginTop: 4,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  input: {
    marginTop: 18,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.35)',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    paddingHorizontal: 14,
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.champagne,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOn: {
    backgroundColor: 'rgba(232, 201, 155, 0.12)',
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
