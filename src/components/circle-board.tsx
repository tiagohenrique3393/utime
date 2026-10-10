import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircleAvatar } from '@/components/circle-avatar';
import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import { formatCirclePoints, honorLabel, periodLabel, requirementMessage, type CirclePeriod } from '@/lib/circle';
import type { CircleEntry, CirclePerson, CircleState } from '@/lib/circle-api';
import { shareRankingImage } from '@/lib/circle-share';

const kinds: { id: CirclePeriod; label: string }[] = [
  { id: 'semana', label: 'SEMANA' },
  { id: 'mes', label: 'MÊS' },
  { id: 'ano', label: 'ANO' },
];

function Crown() {
  return <Text style={styles.crown}>♛</Text>;
}

function PodiumCard({ entry, place, kind }: { entry: CircleEntry; place: 1 | 2 | 3; kind: CirclePeriod }) {
  return (
    <View style={[styles.podium, place === 1 && styles.podiumFirst]}>
      {place === 1 ? <Crown /> : null}
      <CircleAvatar size={place === 1 ? 54 : 42} />
      <Text numberOfLines={2} style={styles.podiumName}>
        {entry.name}
      </Text>
      <Text style={styles.podiumScore}>{formatCirclePoints(entry.score)} PTS</Text>
      <Text style={styles.podiumMeta}>{`${entry.podiums} ${honorLabel(kind, entry.podiums, 'podium')}`}</Text>
      <Text style={styles.podiumMeta}>{`${entry.firsts} ${honorLabel(kind, entry.firsts, 'first')}`}</Text>
    </View>
  );
}

export function CircleBoard({
  userId,
  state,
  kind,
  start,
  todayStart,
  scope,
  entries,
  faces,
  notice,
  confirmingLeave,
  onKind,
  onShift,
  onScope,
  onEnroll,
  onLeave,
}: {
  userId: string;
  state: CircleState;
  kind: CirclePeriod;
  start: string;
  todayStart: string;
  scope: 'todos' | 'amigos';
  entries: CircleEntry[];
  faces: CirclePerson[];
  notice: string;
  confirmingLeave: boolean;
  onKind: (kind: CirclePeriod) => void;
  onShift: (delta: number) => void;
  onScope: (scope: 'todos' | 'amigos') => void;
  onEnroll: () => void;
  onLeave: () => void;
}) {
  const atCurrent = start === todayStart;
  const mine = entries.find((entry) => entry.userId === userId);
  const first = entries.find((entry) => entry.position === 1);
  const second = entries.find((entry) => entry.position === 2);
  const third = entries.find((entry) => entry.position === 3);
  const podiumIds = new Set([first?.userId, second?.userId, third?.userId].filter((id): id is string => Boolean(id)));
  const rest = scope === 'todos' ? entries.filter((entry) => !podiumIds.has(entry.userId)) : entries;

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            RANKING
          </Text>
          <Text style={styles.subtitle}>DISCIPLINA CONECTA PESSOAS</Text>
        </View>
        <View style={styles.premium}>
          <Crown />
          <Text style={styles.premiumLabel}>PREMIUM</Text>
        </View>
      </View>

      {!state.enrolled ? (
        <View style={styles.join}>
          <Text style={styles.joinTitle}>Participe do ranking</Text>
          <Text style={styles.joinText}>
            A inscrição é voluntária. Os 10 hábitos sugeridos continuam no progresso pessoal. O ranking pede 2 hábitos de alta relevância, 4 de média e 4 de baixa.
          </Text>
          <View style={styles.reqList}>
            <Text style={styles.reqLine}>{`ALTA ${state.alta}/2`}</Text>
            <Text style={styles.reqLine}>{`MÉDIA ${state.media}/4`}</Text>
            <Text style={styles.reqLine}>{`BAIXA ${state.baixa}/4`}</Text>
          </View>
          <Text style={styles.joinText}>{requirementMessage({ alta: state.alta, media: state.media, baixa: state.baixa })}</Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!state.ready}
            onPress={onEnroll}
            style={({ pressed }) => [styles.joinButton, !state.ready && styles.joinButtonOff, pressed && state.ready && styles.pressed]}>
            <Text style={styles.joinButtonLabel}>PARTICIPAR DO RANKING</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.segments}>
            {kinds.map((item) => {
              const selected = item.id === kind;
              return (
                <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onKind(item.id)} style={[styles.segment, selected && styles.segmentOn]}>
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.range}>
            <Pressable accessibilityRole="button" accessibilityLabel="Período anterior" onPress={() => onShift(-1)} style={styles.arrow}>
              <Text style={styles.arrowLabel}>‹</Text>
            </Pressable>
            <Text style={styles.rangeLabel}>{periodLabel(kind, start)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo período" accessibilityState={{ disabled: atCurrent }} disabled={atCurrent} onPress={() => onShift(1)} style={styles.arrow}>
              <Text style={[styles.arrowLabel, atCurrent && styles.arrowOff]}>›</Text>
            </Pressable>
          </View>
          <View style={styles.filters}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: scope === 'todos' }} onPress={() => onScope('todos')} style={[styles.filter, scope === 'todos' && styles.filterOn]}>
              <Text style={[styles.filterLabel, scope === 'todos' && styles.filterLabelOn]}>TODOS</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: scope === 'amigos' }} onPress={() => onScope('amigos')} style={[styles.filter, scope === 'amigos' && styles.filterOn]}>
              <Text style={[styles.filterLabel, scope === 'amigos' && styles.filterLabelOn]}>AMIGOS</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar amigos" onPress={() => router.push('/circulo-amigos' as Href)} style={styles.search}>
              <Text style={styles.searchLabel}>⌕</Text>
            </Pressable>
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {scope === 'todos' && (first || second || third) ? (
            <View style={styles.podiumRow}>
              {second ? <PodiumCard entry={second} place={2} kind={kind} /> : <View style={styles.podiumGap} />}
              {first ? <PodiumCard entry={first} place={1} kind={kind} /> : <View style={styles.podiumGap} />}
              {third ? <PodiumCard entry={third} place={3} kind={kind} /> : <View style={styles.podiumGap} />}
            </View>
          ) : null}

          {entries.length === 0 ? <Text style={styles.empty}>Nenhum participante neste período.</Text> : null}

          {rest.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.headText, styles.colPlace]}>POSIÇÃO</Text>
                <Text style={[styles.headText, styles.colUser]}>USUÁRIO</Text>
                <Text style={[styles.headText, styles.colScore]}>PONTOS</Text>
                <Text style={[styles.headText, styles.colHonor]}>PÓDIO</Text>
                <Text style={[styles.headText, styles.colHonor]}>1º</Text>
              </View>
              {rest.map((entry) => (
                <View key={entry.userId} style={[styles.tableRow, entry.userId === userId && styles.tableSelf]}>
                  <Text style={[styles.place, styles.colPlace]}>{entry.position}</Text>
                  <View style={[styles.user, styles.colUser]}>
                    <CircleAvatar size={28} />
                    <Text numberOfLines={1} style={styles.userName}>
                      {entry.name}
                    </Text>
                  </View>
                  <Text style={[styles.points, styles.colScore]}>{formatCirclePoints(entry.score)}</Text>
                  <View style={[styles.honor, styles.colHonor]}>
                    <GoldStar size={11} />
                    <Text style={styles.honorValue}>{entry.podiums}</Text>
                  </View>
                  <View style={[styles.honor, styles.colHonor]}>
                    <Text style={styles.trophy}>🏆</Text>
                    <Text style={styles.honorValue}>{entry.firsts}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {scope === 'amigos' ? (
            <>
              <View style={styles.friendsCard}>
                <View style={styles.friendsHead}>
                  <Text style={styles.cardTitle}>MEUS AMIGOS NO RANKING</Text>
                  <Text style={styles.friendsCount}>{faces.length}</Text>
                </View>
                <View style={styles.faces}>
                  {faces.slice(0, 5).map((face) => (
                    <CircleAvatar key={face.userId} size={36} />
                  ))}
                  <Pressable accessibilityRole="button" accessibilityLabel="Adicionar amigos" onPress={() => router.push('/circulo-amigos' as Href)} style={styles.addFace}>
                    <Text style={styles.addFaceLabel}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardNote}>Adicionar amigos</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  shareRankingImage(
                    periodLabel(kind, start),
                    entries.map((entry) => ({ position: entry.position, name: entry.name, score: formatCirclePoints(entry.score) })),
                  )
                }
                style={styles.shareCard}>
                <Text style={styles.cardTitle}>COMPARTILHAR RANKING</Text>
                <Text style={styles.cardNote}>Gere uma imagem com os nomes e os pontos exibidos.</Text>
              </Pressable>
            </>
          ) : null}

          {mine ? (
            <View style={styles.mine}>
              <View>
                <Text style={styles.mineLabel}>MINHA POSIÇÃO</Text>
                <Text style={styles.mineValue}>{mine.position}º</Text>
              </View>
              <CircleAvatar size={42} />
              <View style={styles.mineCopy}>
                <Text numberOfLines={1} style={styles.mineName}>
                  {mine.name}
                </Text>
                <Text style={styles.mineScore}>{formatCirclePoints(mine.score)} PTS</Text>
              </View>
            </View>
          ) : null}
          <Pressable accessibilityRole="button" onPress={onLeave} style={styles.leave}>
            <Text style={styles.leaveLabel}>{confirmingLeave ? 'Confirmar saída' : 'Sair do ranking'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: 1.4,
  },
  subtitle: {
    marginTop: 2,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  premium: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.champagne,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumLabel: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1,
  },
  crown: {
    color: ui.champagne,
    fontSize: 12,
    lineHeight: 16,
  },
  segments: {
    marginTop: 18,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.35)',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: 'rgba(232, 201, 155, 0.14)',
  },
  segmentLabel: {
    color: ui.muted,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  segmentLabelOn: {
    color: ui.champagne,
  },
  range: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 22,
  },
  arrowOff: {
    opacity: 0.28,
  },
  rangeLabel: {
    flex: 1,
    textAlign: 'center',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1,
  },
  filters: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filter: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: {
    borderColor: ui.champagne,
  },
  filterLabel: {
    color: ui.muted,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.1,
  },
  filterLabelOn: {
    color: ui.champagne,
  },
  search: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLabel: {
    color: ui.champagne,
    fontSize: 16,
  },
  notice: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  podiumRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  podium: {
    flex: 1,
    minHeight: 168,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.28)',
    backgroundColor: 'rgba(8, 8, 8, 0.92)',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    gap: 4,
  },
  podiumFirst: {
    minHeight: 210,
    borderColor: ui.champagne,
  },
  podiumGap: {
    flex: 1,
  },
  podiumName: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  podiumScore: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 16,
  },
  podiumMeta: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 8,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  empty: {
    marginTop: 22,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  table: {
    marginTop: 16,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  headText: {
    color: ui.faint,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  tableRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 201, 155, 0.12)',
  },
  tableSelf: {
    borderTopColor: 'rgba(232, 201, 155, 0.4)',
  },
  colPlace: {
    width: 42,
  },
  colUser: {
    flex: 1,
  },
  colScore: {
    width: 52,
    textAlign: 'right',
  },
  colHonor: {
    width: 42,
    alignItems: 'center',
  },
  place: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 14,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  points: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 13,
  },
  honor: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  honorValue: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  trophy: {
    fontSize: 11,
  },
  friendsCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.28)',
    padding: 14,
    gap: 10,
  },
  friendsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendsCount: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 16,
  },
  faces: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFaceLabel: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 20,
    lineHeight: 22,
  },
  cardTitle: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  cardNote: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  shareCard: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.45)',
    padding: 14,
    gap: 6,
  },
  mine: {
    marginTop: 16,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.champagne,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mineLabel: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  mineValue: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 22,
  },
  mineCopy: {
    flex: 1,
  },
  mineName: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.6,
  },
  mineScore: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 13,
  },
  leave: {
    marginTop: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  leaveLabel: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  join: {
    marginTop: 28,
    gap: 12,
  },
  joinTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
  },
  joinText: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  reqList: {
    gap: 4,
  },
  reqLine: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.1,
  },
  joinButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ui.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  joinButtonOff: {
    opacity: 0.45,
  },
  joinButtonLabel: {
    color: ui.ink,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.78,
  },
});
