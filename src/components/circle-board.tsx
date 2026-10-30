import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircleAvatar } from '@/components/circle-avatar';
import { getOwnAvatarPath, isOwnAvatarReady, subscribeOwnAvatar } from '@/lib/avatar';
import { publicAvatarUrl } from '@/lib/avatar-store';
import { CircleMark } from '@/components/circle-icons';
import { circlePalette as palette } from '@/components/circle-palette';
import { fonts } from '@/constants/theme';
import { BONUS_CAP, DAY_CAP, essentialPoints, essentialSlots, formatCirclePoints, honorLabel, periodLabel, requirementMessage, type CirclePeriod } from '@/lib/circle';
import type { CircleEntry, CirclePerson, CircleState } from '@/lib/circle-api';
import { ordinalPlace, podiumSlots, showsPodiumTrophy, visibleRanking } from '@/lib/circle-rank';

const kinds: { id: CirclePeriod; label: string }[] = [
  { id: 'semana', label: 'SEMANA' },
  { id: 'mes', label: 'MÊS' },
  { id: 'ano', label: 'ANO' },
];

function PodiumCard({ entry, place, kind, uri }: { entry: CircleEntry; place: 1 | 2 | 3; kind: CirclePeriod; uri: string | null }) {
  const first = place === 1;
  return (
    <View style={[styles.podium, first && styles.podiumFirst]}>
      <Text style={[styles.podiumPlace, first && styles.podiumPlaceFirst]}>{place}º</Text>
      <View style={styles.podiumAvatar}>
        {first ? <CircleMark name="crown" size={26} /> : null}
        <CircleAvatar size={first ? 62 : 46} glow={first} uri={uri} />
      </View>
      <Text numberOfLines={2} style={styles.podiumName}>
        {entry.name}
      </Text>
      <Text style={[styles.podiumScore, first && styles.podiumScoreFirst]}>
        {formatCirclePoints(entry.score)}
        <Text style={styles.podiumPts}> PTS</Text>
      </Text>
      {showsPodiumTrophy(entry.podiums) ? (
        <View style={styles.honorStack}>
          <View style={styles.honorLine}>
            <CircleMark name="trophy" size={14} />
            <Text style={styles.podiumCount}>{entry.podiums}</Text>
          </View>
          <Text style={styles.podiumMeta}>{honorLabel(kind, entry.podiums, 'podium')}</Text>
        </View>
      ) : null}
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
  onBindLoadMore,
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
  onBindLoadMore?: (loadMore: () => void) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [limit, setLimit] = useState(20);
  const pageKey = `${scope}|${kind}|${start}|${entries.map((entry) => entry.userId).join(',')}`;
  const [pageKeySeen, setPageKeySeen] = useState(pageKey);
  if (pageKeySeen !== pageKey) {
    setPageKeySeen(pageKey);
    setLimit(20);
  }
  const [ownPath, setOwnPath] = useState(getOwnAvatarPath());
  const [ownReady, setOwnReady] = useState(isOwnAvatarReady());
  useEffect(
    () =>
      subscribeOwnAvatar(() => {
        setOwnPath(getOwnAvatarPath());
        setOwnReady(isOwnAvatarReady());
      }),
    [],
  );
  function photoFor(entryUserId: string, path: string | null | undefined) {
    const chosen = ownReady && entryUserId === userId ? ownPath : path;
    return publicAvatarUrl(chosen);
  }
  const atCurrent = start === todayStart;
  const { first, second, third } = podiumSlots(entries);
  const rows = visibleRanking(entries, limit, userId);
  const shownPodium = [second, first, third].filter(Boolean).length;
  useEffect(() => {
    onBindLoadMore?.(() => {
      setLimit((current) => (current < entries.length ? current + 20 : current));
    });
  });

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
          <CircleMark name="crown" size={12} color={palette.ink} />
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
          {!state.ready ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Personalizar hábitos"
              onPress={() => router.push('/personalizar-habitos' as Href)}
              style={styles.adjust}>
              <Text style={styles.adjustLabel}>PERSONALIZAR HÁBITOS</Text>
            </Pressable>
          ) : null}
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
              <CircleMark name="chevronLeft" size={18} />
            </Pressable>
            <Text style={styles.rangeLabel}>{periodLabel(kind, start)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo período" accessibilityState={{ disabled: atCurrent }} disabled={atCurrent} onPress={() => onShift(1)} style={styles.arrow}>
              <CircleMark name="chevron" size={18} color={atCurrent ? palette.faint : palette.champagne} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Como a pontuação do período é calculada" onPress={() => setInfoOpen((open) => !open)} style={styles.info}>
              <CircleMark name="info" size={16} />
            </Pressable>
          </View>
          {infoOpen ? (
            <Text style={styles.infoCopy}>
              {`${essentialSlots.alta} hábitos de alta valem ${essentialPoints.alta} pontos, ${essentialSlots.media} de média valem ${essentialPoints.media} e ${essentialSlots.baixa} de baixa valem ${essentialPoints.baixa}. O bônus diário chega a ${BONUS_CAP} e o limite do dia é ${DAY_CAP}, no horário de Brasília.`}
            </Text>
          ) : null}
          <View style={styles.filters}>
            <View style={styles.scopeTabs}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: scope === 'todos' }} onPress={() => onScope('todos')} style={[styles.filter, scope === 'todos' && styles.filterOn]}>
                <Text style={[styles.filterLabel, scope === 'todos' && styles.filterLabelOn]}>TODOS</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: scope === 'amigos' }} onPress={() => onScope('amigos')} style={[styles.filter, scope === 'amigos' && styles.filterOn]}>
                <Text style={[styles.filterLabel, scope === 'amigos' && styles.filterLabelOn]}>AMIGOS</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar amigos" onPress={() => router.push('/circulo-amigos' as Href)} style={styles.search}>
              <CircleMark name="search" size={16} />
            </Pressable>
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {scope === 'todos' && shownPodium > 0 ? (
            <View style={[styles.podiumRow, shownPodium < 3 && styles.podiumSparse]}>
              {second ? <PodiumCard entry={second} place={2} kind={kind} uri={photoFor(second.userId, second.avatarPath)} /> : null}
              {first ? <PodiumCard entry={first} place={1} kind={kind} uri={photoFor(first.userId, first.avatarPath)} /> : null}
              {third ? <PodiumCard entry={third} place={3} kind={kind} uri={photoFor(third.userId, third.avatarPath)} /> : null}
            </View>
          ) : null}

          {entries.length === 0 && !notice && scope === 'todos' ? <Text style={styles.empty}>Nenhum participante neste período.</Text> : null}
          {entries.length === 0 && !notice && scope === 'amigos' && faces.length > 0 ? <Text style={styles.empty}>Nenhum amigo neste período.</Text> : null}

          {rows.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.headText, styles.colPlace]}>POSIÇÃO</Text>
                <Text style={[styles.headText, styles.colUser]}>USUÁRIO</Text>
                <Text style={[styles.headText, styles.colScore]}>PONTOS</Text>
                <Text style={[styles.headText, styles.colHonor]}>PÓDIO</Text>
              </View>
              {rows.map((entry) => {
                const self = entry.userId === userId;
                return (
                  <View key={entry.userId} style={[styles.tableRow, self && styles.tableSelf]}>
                    <View style={[styles.placeCell, styles.colPlace]}>
                      {entry.position === 1 ? <CircleMark name="crown" size={13} /> : null}
                      <Text style={[styles.place, self && styles.placeSelf]}>{ordinalPlace(entry.position)}</Text>
                    </View>
                    <View style={[styles.user, styles.colUser]}>
                      <CircleAvatar size={28} uri={photoFor(entry.userId, entry.avatarPath)} />
                      <Text numberOfLines={1} style={styles.userName}>
                        {entry.name}
                      </Text>
                    </View>
                    <Text style={[styles.points, styles.colScore, self && styles.pointsSelf]}>{`${formatCirclePoints(entry.score)} PTS`}</Text>
                    <View style={[styles.honor, styles.colHonor]}>
                      {showsPodiumTrophy(entry.podiums) ? (
                        <>
                          <CircleMark name="trophy" size={13} />
                          <Text style={styles.honorValue}>{entry.podiums}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {scope === 'amigos' ? (
            <View style={styles.friendsCard}>
              <Pressable accessibilityRole="button" accessibilityLabel="Adicionar amigos" onPress={() => router.push('/circulo-amigos' as Href)} style={styles.friendsHead}>
                <Text style={styles.cardTitle}>MEUS AMIGOS NO RANKING</Text>
                <View style={styles.friendsCountWrap}>
                  <Text style={styles.friendsCount}>{faces.length}</Text>
                  <CircleMark name="chevron" size={16} />
                </View>
              </Pressable>
              <View style={styles.friendsBody}>
                <Pressable accessibilityRole="button" accessibilityLabel="Adicionar amigos" onPress={() => router.push('/circulo-amigos' as Href)} style={styles.addSide}>
                  <View style={styles.addFace}>
                    <CircleMark name="plus" size={16} />
                  </View>
                  <Text style={styles.addFaceCaption}>Adicionar amigos</Text>
                </Pressable>
                <View style={styles.friendsDivider} />
                <View style={styles.inviteSide}>
                  <CircleMark name="group" size={34} />
                  <Text style={styles.cardNote}>Convide amigos para competir e evoluir juntos.</Text>
                </View>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  title: { color: palette.text, fontFamily: fonts.display, fontSize: 42, lineHeight: 44, letterSpacing: 2.4 },
  subtitle: { marginTop: 2, color: palette.textChampagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1.5 },
  premium: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: palette.champagne,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumLabel: { color: palette.ink, fontFamily: fonts.display, fontSize: 11, letterSpacing: 0.8 },
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
  segmentOn: { borderWidth: 1, borderColor: palette.champagne, backgroundColor: '#14120F', boxShadow: '0 0 14px rgba(232, 200, 142, 0.28)' },
  segmentLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.1 },
  segmentLabelOn: { color: palette.textChampagne },
  range: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeLabel: { flex: 1, textAlign: 'center', color: palette.text, fontFamily: fonts.text, fontSize: 12, letterSpacing: 1.1 },
  info: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { marginTop: 8, color: palette.muted, fontFamily: fonts.text, fontSize: 12, lineHeight: 17 },
  filters: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeTabs: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: 'rgba(8, 8, 10, 0.72)',
    padding: 4,
    gap: 4,
  },
  filter: { flex: 1, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterOn: { borderWidth: 1, borderColor: palette.champagne, backgroundColor: '#14120F', boxShadow: '0 0 14px rgba(232, 200, 142, 0.28)' },
  filterLabel: { color: palette.muted, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.1 },
  filterLabelOn: { color: palette.textChampagne },
  search: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: palette.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { marginTop: 12, color: palette.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  podiumRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  podiumSparse: { gap: 10 },
  podium: {
    width: '30%',
    maxWidth: 132,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214, 181, 122, 0.34)',
    backgroundColor: 'rgba(7, 7, 9, 0.58)',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 16,
  },
  podiumFirst: {
    width: '40%',
    maxWidth: 176,
    zIndex: 2,
    marginHorizontal: -8,
    borderColor: palette.champagne,
    backgroundColor: 'rgba(14, 12, 9, 0.82)',
    paddingTop: 16,
    paddingBottom: 18,
    boxShadow: '0 0 28px rgba(232, 200, 142, 0.42)',
  },
  podiumPlace: { color: palette.textChampagne, fontFamily: fonts.display, fontSize: 18, lineHeight: 20 },
  podiumPlaceFirst: { fontSize: 22 },
  podiumAvatar: { alignItems: 'center', marginTop: 4, marginBottom: 6, gap: 2 },
  podiumName: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  podiumScore: { marginTop: 2, color: palette.textChampagne, fontFamily: fonts.textMedium, fontSize: 16 },
  podiumScoreFirst: { fontSize: 20 },
  podiumPts: { fontSize: 11, letterSpacing: 0.4 },
  honorStack: { marginTop: 8, alignItems: 'center', gap: 2 },
  honorLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  podiumCount: { color: palette.textChampagne, fontFamily: fonts.textMedium, fontSize: 13 },
  podiumMeta: { color: palette.muted, fontFamily: fonts.display, fontSize: 8, lineHeight: 10, letterSpacing: 0.3, textAlign: 'center' },
  empty: { marginTop: 22, color: palette.muted, fontFamily: fonts.text, fontSize: 14 },
  table: { marginTop: 16 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  headText: { color: palette.faint, fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.6 },
  tableRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(214, 181, 122, 0.12)' },
  tableSelf: {
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 200, 142, 0.05)',
    marginVertical: 4,
    paddingHorizontal: 8,
    boxShadow: '0 0 14px rgba(232, 200, 142, 0.16)',
  },
  colPlace: { width: 54 },
  colUser: { flex: 1 },
  colScore: { width: 72, textAlign: 'right' },
  colHonor: { width: 52, alignItems: 'center', textAlign: 'center' },
  placeCell: { alignItems: 'center', justifyContent: 'center' },
  place: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 16 },
  placeSelf: { color: palette.textChampagne },
  user: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { flex: 1, color: palette.text, fontFamily: fonts.text, fontSize: 13 },
  points: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 13 },
  pointsSelf: { color: palette.textChampagne },
  honor: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  honorValue: { color: palette.text, fontFamily: fonts.text, fontSize: 12 },
  friendsCard: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  friendsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  friendsCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  friendsCount: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 20 },
  friendsBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addSide: { width: 108, alignItems: 'center', gap: 6 },
  addFace: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: palette.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFaceCaption: { color: palette.muted, fontFamily: fonts.text, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  friendsDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(214, 181, 122, 0.2)' },
  inviteSide: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  cardTitle: { flex: 1, color: palette.textChampagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.6 },
  cardNote: { color: palette.muted, fontFamily: fonts.text, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  leave: { marginTop: 12, minHeight: 36, justifyContent: 'center' },
  leaveLabel: { color: palette.muted, fontFamily: fonts.text, fontSize: 12 },
  join: { marginTop: 28, gap: 12 },
  joinTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  joinText: { color: palette.muted, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  reqList: { gap: 4 },
  reqLine: { color: palette.textChampagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.1 },
  joinButton: { minHeight: 48, borderRadius: 999, backgroundColor: palette.champagne, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  joinButtonOff: { opacity: 0.45 },
  adjust: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: palette.champagne, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  adjustLabel: { color: palette.textChampagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1 },
  joinButtonLabel: { color: palette.ink, fontFamily: fonts.textMedium, fontSize: 13, letterSpacing: 1 },
  pressed: { opacity: 0.78 },
});
