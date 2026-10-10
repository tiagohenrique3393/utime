import { router, useFocusEffect } from 'expo-router';
import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, PageTitle } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { fetchRanking, rankingErrorMessage, type RankingEntry } from '@/lib/ranking';
import { flushJourneyPush } from '@/lib/tasks';

type LoadState = 'loading' | 'ready' | 'error';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Crown() {
  if (Platform.OS !== 'web') {
    return <View style={styles.crownFallback} />;
  }
  return (
    <View accessibilityElementsHidden>
      {node(
        'svg',
        { width: 16, height: 12, viewBox: '0 0 16 12' },
        node('path', {
          d: 'M1.5 9.5 L3.2 3.2 L8 6.4 L12.8 1.8 L14.5 9.5 Z',
          fill: 'none',
          stroke: '#E8C99B',
          strokeWidth: 1,
          strokeLinejoin: 'round',
        }),
      )}
    </View>
  );
}

function RankRow({ entry, self }: { entry: RankingEntry; self: boolean }) {
  return (
    <View
      accessibilityLabel={`${entry.position}º, ${entry.name}, ${entry.score} pontos${self ? ', você' : ''}${entry.position === 1 ? ', primeiro colocado' : ''}`}
      accessibilityState={{ selected: self }}
      style={[styles.row, entry.position <= 3 && styles.rowPodium, self && styles.rowSelf]}>
      <View style={styles.place}>
        {entry.position === 1 ? <Crown /> : null}
        <Text style={[styles.position, entry.position <= 3 && styles.positionPodium]}>{entry.position}º</Text>
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {entry.name}
      </Text>
      <Text style={styles.score}>{entry.score}</Text>
    </View>
  );
}

export function LegacyRanking() {
  const signedIn = getSessionUserId() !== null;
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [notice, setNotice] = useState('');
  const activeRef = useRef(true);

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/');
    }
  }, []);

  const load = useCallback(async () => {
    const userId = getSessionUserId();
    if (!userId) {
      return;
    }
    setLoadState('loading');
    setNotice('');
    try {
      await flushJourneyPush();
      if (!activeRef.current) {
        return;
      }
      const next = await fetchRanking();
      if (!activeRef.current) {
        return;
      }
      setEntries(next);
      setLoadState('ready');
    } catch (error) {
      if (!activeRef.current) {
        return;
      }
      const details = error as { code?: string; message?: string };
      setEntries([]);
      setNotice(rankingErrorMessage(details));
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      void load();
      return () => {
        activeRef.current = false;
      };
    }, [load]),
  );

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const userId = getSessionUserId();
  const self = entries.find((entry) => entry.userId === userId);
  const podium = entries.filter((entry) => entry.position <= 3);
  const rest = entries.filter((entry) => entry.position > 3);

  return (
    <AppScreen width="narrow">
      <Eyebrow>Círculo UTime</Eyebrow>
      <PageTitle compact>Ranking semanal</PageTitle>

      {loadState === 'loading' ? <Text style={styles.status}>Carregando o ranking.</Text> : null}

      {loadState === 'error' ? (
        <View style={styles.errorBlock}>
          <Text style={styles.status}>{notice}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <Text style={styles.retryLabel}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}

      {loadState === 'ready' && entries.length === 0 ? (
        <Text style={styles.status}>Nenhuma conta no ranking ainda.</Text>
      ) : null}

      {loadState === 'ready' && self ? (
        <View style={styles.mine}>
          <Text style={styles.mineLabel}>Minha posição</Text>
          <Text style={styles.mineValue}>
            {self.position}º · {self.score}
          </Text>
        </View>
      ) : null}

      {loadState === 'ready' && entries.length > 0 && !self ? (
        <Text style={styles.status}>Sua conta ainda não aparece no ranking.</Text>
      ) : null}

      {loadState === 'ready' && podium.length > 0 ? (
        <View style={styles.list}>
          {podium.map((entry) => (
            <RankRow key={entry.userId} entry={entry} self={entry.userId === userId} />
          ))}
        </View>
      ) : null}

      {loadState === 'ready' && rest.length > 0 ? (
        <View style={styles.rest}>
          {rest.map((entry) => (
            <RankRow key={entry.userId} entry={entry} self={entry.userId === userId} />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  status: {
    marginTop: 28,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
  },
  errorBlock: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  retry: {
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: ui.champagne,
  },
  retryLabel: {
    color: ui.ink,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mine: {
    marginTop: 28,
    gap: 4,
  },
  mineLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  mineValue: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
  },
  list: {
    marginTop: 28,
  },
  rest: {
    marginTop: 8,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  rowPodium: {
    minHeight: 64,
  },
  rowSelf: {
    borderBottomColor: ui.line,
  },
  place: {
    minWidth: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  position: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  positionPodium: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 22,
  },
  name: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  score: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  crownFallback: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: ui.champagne,
    transform: [{ rotate: '45deg' }],
  },
  pressed: {
    opacity: 0.75,
  },
});
