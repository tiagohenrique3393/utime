import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { CircleMark } from '@/components/circle-icons';
import { circlePalette as palette } from '@/components/circle-palette';
import { CirclePlanet } from '@/components/circle-planet';
import { fonts } from '@/constants/theme';
import { achievementTotals, formatCirclePoints, periodLabel, type CirclePeriod } from '@/lib/circle';
import { circleErrorMessage, fetchCircleHistory, type CircleHonor } from '@/lib/circle-api';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';
const kinds: { id: CirclePeriod; label: string }[] = [
  { id: 'semana', label: 'SEMANA' },
  { id: 'mes', label: 'MÊS' },
  { id: 'ano', label: 'ANO' },
];

function closedLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export default function CircleHistoryScreen() {
  const signedIn = useRequireSession();
  const [kind, setKind] = useState<CirclePeriod>('mes');
  const [rows, setRows] = useState<CircleHonor[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextKind: CirclePeriod) => {
    setLoading(true);
    try {
      setRows(await fetchCircleHistory(nextKind));
      setNotice('');
    } catch (error) {
      setRows([]);
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(kind);
    }, [kind, load]),
  );

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  const totals = achievementTotals(rows.map((row) => ({ rank: row.position, score: row.score })));

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<CirclePlanet />}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao ranking" onPress={() => router.replace('/ranking' as Href)} style={styles.back}>
          <CircleMark name="chevronLeft" size={22} />
        </Pressable>
        <View style={styles.headCopy}>
          <Text accessibilityRole="header" style={styles.title}>HISTÓRICO DE CONQUISTAS</Text>
          <Text style={styles.subtitle}>RESULTADOS DEFINITIVOS</Text>
        </View>
        <View style={styles.back} />
      </View>
      <View style={styles.segments}>
        {kinds.map((item) => {
          const selected = item.id === kind;
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setKind(item.id)} style={[styles.segment, selected && styles.segmentOn]}>
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totals.podiums}</Text>
          <Text style={styles.statLabel}>PÓDIOS</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totals.firsts}</Text>
          <Text style={styles.statLabel}>1º LUGAR</Text>
        </View>
      </View>
      {loading ? <Text style={styles.notice}>Carregando conquistas.</Text> : null}
      {notice ? (
        <View>
          <Text style={styles.notice}>{notice}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load(kind)} style={styles.retry}>
            <Text style={styles.retryLabel}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !notice && rows.length === 0 ? <Text style={styles.empty}>Suas conquistas aparecerão aqui quando você concluir suas primeiras competições.</Text> : null}
      {rows.map((row) => {
        const podium = row.position <= 3 && row.score > 0;
        const first = row.position === 1 && row.score > 0;
        return (
          <View key={`${row.kind}-${row.start}`} style={styles.row}>
            <View style={styles.mark}>{podium ? <CircleMark name={first ? 'crown' : 'trophy'} size={18} /> : null}</View>
            <View style={styles.copy}>
              <Text style={styles.period}>{periodLabel(row.kind, row.start)}</Text>
              <Text style={styles.place}>{`${row.position}º lugar`}</Text>
              {row.closedAt ? <Text style={styles.closed}>{`Encerrado em ${closedLabel(row.closedAt)}`}</Text> : null}
            </View>
            <Text style={styles.score}>{`${formatCirclePoints(row.score)} pontos`}</Text>
          </View>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, backgroundColor: page },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headCopy: { flex: 1, alignItems: 'center' },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 22, letterSpacing: 0.6, textAlign: 'center' },
  subtitle: { marginTop: 4, color: palette.textChampagne, fontFamily: fonts.display, fontSize: 11, letterSpacing: 1.1, textAlign: 'center' },
  segments: {
    marginTop: 18,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: 'rgba(8, 8, 10, 0.72)',
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { borderWidth: 1, borderColor: palette.champagne, backgroundColor: '#14120F' },
  segmentLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.1 },
  segmentLabelOn: { color: palette.textChampagne },
  stats: { marginTop: 16, flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#09090B',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { color: palette.textChampagne, fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  statLabel: { marginTop: 2, color: palette.muted, fontFamily: fonts.display, fontSize: 11, letterSpacing: 1 },
  notice: { marginTop: 14, color: palette.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  retry: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  retryLabel: { color: palette.textChampagne, fontFamily: fonts.text, fontSize: 13 },
  empty: { marginTop: 18, color: palette.muted, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  row: {
    marginTop: 8,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214, 181, 122, 0.28)',
    backgroundColor: '#09090B',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mark: { width: 22, alignItems: 'center' },
  copy: { flex: 1 },
  period: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 14 },
  place: { marginTop: 2, color: palette.textChampagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.4 },
  closed: { marginTop: 2, color: palette.faint, fontFamily: fonts.text, fontSize: 11 },
  score: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 13 },
});
