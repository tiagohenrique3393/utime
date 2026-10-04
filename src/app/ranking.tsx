import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { colors, fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { fetchRanking, rankingErrorMessage, type RankingEntry } from '@/lib/ranking';
import { pushJourney } from '@/lib/tasks';

type LoadState = 'loading' | 'ready' | 'error';

export default function RankingScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const signedIn = getSessionUserId() !== null;
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [notice, setNotice] = useState('');
  const activeRef = useRef(true);

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/entrar');
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
      await pushJourney(userId);
    } catch {
      // The list still reads the scores already stored for each account.
    }
    if (!activeRef.current) {
      return;
    }
    try {
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
    return <View style={styles.screen} />;
  }

  const self = entries.find((entry) => entry.userId === getSessionUserId());

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))}
              style={styles.back}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Comunidade</Text>
            <Text accessibilityRole="header" style={[styles.title, isWide && styles.titleWide]}>
              Ranking
            </Text>
            <Text style={styles.lead}>
              Pontuação competitiva entre as contas. A porcentagem da rotina continua em Progresso.
            </Text>

            {loadState === 'loading' ? <Text style={styles.status}>Carregando o ranking.</Text> : null}

            {loadState === 'error' ? (
              <View style={styles.card}>
                <Text style={styles.notice}>{notice}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void load()}
                  style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                  <Text style={styles.retryLabel}>Tentar de novo</Text>
                </Pressable>
              </View>
            ) : null}

            {loadState === 'ready' && self ? (
              <View style={styles.summary}>
                <Text style={styles.summaryLabel}>Sua posição</Text>
                <Text style={styles.summaryValue}>
                  {self.position}º · {self.score} pts
                </Text>
              </View>
            ) : null}

            {loadState === 'ready' && entries.length === 0 ? (
              <Text style={styles.status}>Nenhuma conta no ranking ainda.</Text>
            ) : null}

            {loadState === 'ready' && entries.length > 0 && !self ? (
              <Text style={styles.status}>Sua conta ainda não aparece no ranking.</Text>
            ) : null}

            {loadState === 'ready' && entries.length > 0 ? (
              <View style={styles.list}>
                {entries.map((entry) => {
                  const isSelf = entry.userId === getSessionUserId();
                  return (
                    <View
                      key={entry.userId}
                      accessibilityLabel={`${entry.position}º, ${entry.name}, ${entry.score} pontos${isSelf ? ', você' : ''}`}
                      accessibilityState={{ selected: isSelf }}
                      style={[styles.row, isSelf && styles.rowSelf]}>
                      <Text style={[styles.position, isSelf && styles.onSelf]}>{entry.position}</Text>
                      <Text numberOfLines={1} style={[styles.name, isSelf && styles.onSelf]}>
                        {entry.name}
                      </Text>
                      <Text style={[styles.score, isSelf && styles.onSelf]}>{entry.score} pts</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  safeWide: {
    paddingHorizontal: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 28,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  columnWide: {
    maxWidth: 720,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  eyebrow: {
    marginTop: 12,
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
  },
  titleWide: {
    fontSize: 48,
    lineHeight: 52,
  },
  lead: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  status: {
    marginTop: 28,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  summary: {
    marginTop: 28,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  summaryValue: {
    marginTop: 6,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 22,
  },
  card: {
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  notice: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  retry: {
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: colors.ivory,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryLabel: {
    color: colors.onPrimary,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  list: {
    marginTop: 22,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowSelf: {
    borderColor: colors.ivory,
    backgroundColor: colors.ivory,
  },
  position: {
    width: 28,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  name: {
    flex: 1,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  score: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  onSelf: {
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.84,
  },
});
