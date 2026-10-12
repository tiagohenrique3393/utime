import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CircleAvatar } from '@/components/circle-avatar';
import { CircleMark } from '@/components/circle-icons';
import { circlePalette as palette } from '@/components/circle-palette';
import { fonts } from '@/constants/theme';
import { BONUS_CAP, DAY_CAP, essentialPoints, essentialSlots, formatCirclePoints, honorLabel, periodLabel, requirementMessage, type CirclePeriod } from '@/lib/circle';
import type { CircleEntry, CirclePerson, CircleState } from '@/lib/circle-api';
import { shareRankingImage } from '@/lib/circle-share';

const kinds: { id: CirclePeriod; label: string }[] = [
  { id: 'semana', label: 'SEMANA' },
  { id: 'mes', label: 'MÊS' },
  { id: 'ano', label: 'ANO' },
];

function PodiumCard({ entry, place, kind }: { entry: CircleEntry; place: 1 | 2 | 3; kind: CirclePeriod }) {
  const first = place === 1;
  return (
    <View style={[styles.podium, first && styles.podiumFirst]}>
      <Text style={[styles.podiumPlace, first && styles.podiumPlaceFirst]}>{place}º</Text>
      <View style={styles.podiumAvatar}>
        {first ? <CircleMark name="crown" size={26} /> : null}
        <CircleAvatar size={first ? 62 : 46} glow={first} />
      </View>
      <Text numberOfLines={2} style={styles.podiumName}>
        {entry.name}
      </Text>
      <Text style={[styles.podiumScore, first && styles.podiumScoreFirst]}>
        {formatCirclePoints(entry.score)}
        <Text style={styles.podiumPts}> PTS</Text>
      </Text>
      <View style={styles.honorRow}>
        <CircleMark name="star" size={13} />
        <Text style={styles.podiumCount}>{entry.podiums}</Text>
        <Text style={styles.podiumMeta}>{honorLabel(kind, entry.podiums, 'podium')}</Text>
      </View>
      <View style={styles.honorRow}>
        <CircleMark name="trophy" size={13} />
        <Text style={styles.podiumCount}>{entry.firsts}</Text>
        <Text style={styles.podiumMeta}>{honorLabel(kind, entry.firsts, 'first')}</Text>
      </View>
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const atCurrent = start === todayStart;
  const mine = entries.find((entry) => entry.userId === userId);
  const first = entries.find((entry) => entry.position === 1);
  const second = entries.find((entry) => entry.position === 2);
  const third = entries.find((entry) => entry.position === 3);
  const podiumIds = new Set([first?.userId, second?.userId, third?.userId].filter((id): id is string => Boolean(id)));
  const rest = scope === 'todos' ? entries.filter((entry) => !podiumIds.has(entry.userId)) : entries;
  const shownPodium = [second, first, third].filter(Boolean).length;

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
              {second ? <PodiumCard entry={second} place={2} kind={kind} /> : null}
              {first ? <PodiumCard entry={first} place={1} kind={kind} /> : null}
              {third ? <PodiumCard entry={third} place={3} kind={kind} /> : null}
            </View>
          ) : null}

          {entries.length === 0 && !notice ? (
            <Text style={styles.empty}>{scope === 'amigos' ? 'Nenhum amigo neste período.' : 'Nenhum participante neste período.'}</Text>
          ) : null}

          {rest.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.headText, styles.colPlace]}>POSIÇÃO</Text>
                <Text style={[styles.headText, styles.colUser]}>USUÁRIO</Text>
                <Text style={[styles.headText, styles.colScore]}>PONTOS</Text>
                <Text style={[styles.headText, styles.colHonor]}>PÓDIO</Text>
                <Text style={[styles.headText, styles.colHonor]}>1º</Text>
              </View>
              {rest.map((entry) => {
                const leader = scope === 'amigos' && entry.position === 1;
                return (
                  <View key={entry.userId} style={[styles.tableRow, leader && styles.tableLeader, entry.userId === userId && styles.tableSelf]}>
                    <View style={[styles.placeCell, styles.colPlace]}>
                      {leader ? <CircleMark name="crown" size={12} /> : null}
                      <Text style={[styles.place, leader && styles.placeLeader]}>{entry.position}</Text>
                    </View>
                    <View style={[styles.user, styles.colUser]}>
                      <CircleAvatar size={28} />
                      <Text numberOfLines={1} style={styles.userName}>
                        {entry.name}
                      </Text>
                    </View>
                    <Text style={[styles.points, styles.colScore, leader && styles.pointsLeader]}>{formatCirclePoints(entry.score)}</Text>
                    <View style={[styles.honor, styles.colHonor]}>
                      <CircleMark name="star" size={11} />
                      <Text style={styles.honorValue}>{entry.podiums}</Text>
                    </View>
                    <View style={[styles.honor, styles.colHonor]}>
                      <CircleMark name="trophy" size={11} />
                      <Text style={styles.honorValue}>{entry.firsts}</Text>
                    </View>
                  </View>
                );
              })}
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
                  {faces.slice(0, 4).map((face) => (
                    <CircleAvatar key={face.userId} size={36} />
                  ))}
                  {faces.length === 0 ? <Text style={styles.cardNote}>Nenhum amigo confirmado.</Text> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel="Adicionar amigos" onPress={() => router.push('/circulo-amigos' as Href)} style={styles.addFaceWrap}>
                    <View style={styles.addFace}>
                      <CircleMark name="plus" size={16} />
                    </View>
                    <Text style={styles.addFaceCaption}>Adicionar amigos</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const saved = shareRankingImage(
                    periodLabel(kind, start),
                    entries.map((entry) => ({
                      position: entry.position,
                      name: entry.name,
                      score: formatCirclePoints(entry.score),
                      podiums: entry.podiums,
                      firsts: entry.firsts,
                    })),
                  );
                  setShareNote(saved ? '' : 'A imagem do ranking é gerada na versão web.');
                }}
                style={styles.shareCard}>
                <CircleMark name="share" size={22} />
                <View style={styles.shareCopy}>
                  <Text style={styles.cardTitle}>COMPARTILHAR RANKING</Text>
                  <Text style={styles.cardNote}>Gere uma imagem para compartilhar o seu ranking de amigos.</Text>
                </View>
                <CircleMark name="chevron" size={18} />
              </Pressable>
              {shareNote ? <Text style={styles.notice}>{shareNote}</Text> : null}
            </>
          ) : null}

          {mine ? (
            <View style={styles.mine}>
              <View>
                <Text style={styles.mineLabel}>MINHA POSIÇÃO</Text>
                <Text style={styles.mineValue}>{mine.position}º</Text>
              </View>
              <CircleAvatar size={42} glow />
              <View style={styles.mineCopy}>
                <Text numberOfLines={1} style={styles.mineName}>
                  {mine.name}
                </Text>
              </View>
              <Text style={styles.mineScore}>{formatCirclePoints(mine.score)} PTS</Text>
              <CircleMark name="chevron" size={16} />
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
  subtitle: { marginTop: 2, color: palette.champagne, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1.5 },
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
  segmentLabelOn: { color: palette.champagne },
  range: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  rangeLabel: { flex: 1, textAlign: 'center', color: palette.text, fontFamily: fonts.text, fontSize: 12, letterSpacing: 1.1 },
  info: {
    width: 24,
    height: 24,
    marginLeft: 4,
    borderRadius: 12,
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
  filterLabelOn: { color: palette.champagne },
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
  podiumRow: { marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  podiumSparse: { gap: 12 },
  podium: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    maxWidth: 176,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 12,
  },
  podiumFirst: {
    borderColor: palette.champagne,
    backgroundColor: '#100e0b',
    paddingTop: 14,
    paddingBottom: 16,
    boxShadow: '0 0 22px rgba(232, 200, 142, 0.32)',
  },
  podiumPlace: { color: palette.champagne, fontFamily: fonts.display, fontSize: 18, lineHeight: 20 },
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
  podiumScore: { marginTop: 2, color: palette.champagne, fontFamily: fonts.textMedium, fontSize: 16 },
  podiumScoreFirst: { fontSize: 20 },
  podiumPts: { fontSize: 11, letterSpacing: 0.4 },
  honorRow: { marginTop: 6, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  podiumCount: { color: palette.champagne, fontFamily: fonts.textMedium, fontSize: 13, minWidth: 12 },
  podiumMeta: { flex: 1, color: palette.muted, fontFamily: fonts.display, fontSize: 8, lineHeight: 10, letterSpacing: 0.2 },
  empty: { marginTop: 22, color: palette.muted, fontFamily: fonts.text, fontSize: 14 },
  table: { marginTop: 16 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  headText: { color: palette.faint, fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.6 },
  tableRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(214, 181, 122, 0.14)' },
  tableSelf: { borderTopColor: 'rgba(232, 200, 142, 0.4)' },
  tableLeader: {
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 200, 142, 0.06)',
    marginVertical: 4,
    paddingHorizontal: 6,
    boxShadow: '0 0 12px rgba(232, 200, 142, 0.14)',
  },
  colPlace: { width: 52 },
  colUser: { flex: 1 },
  colScore: { width: 48, textAlign: 'right' },
  colHonor: { width: 46, alignItems: 'center', textAlign: 'center' },
  placeCell: { alignItems: 'center', justifyContent: 'center' },
  place: { color: palette.champagne, fontFamily: fonts.textMedium, fontSize: 14 },
  placeLeader: { fontSize: 16 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { flex: 1, color: palette.text, fontFamily: fonts.text, fontSize: 13 },
  points: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 13 },
  pointsLeader: { color: palette.champagne },
  honor: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  honorValue: { color: palette.text, fontFamily: fonts.text, fontSize: 12 },
  friendsCard: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: palette.line, padding: 14, gap: 10 },
  friendsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  friendsCount: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 22 },
  faces: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addFaceWrap: { width: 72, alignItems: 'center', gap: 4 },
  addFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFaceCaption: { color: palette.muted, fontFamily: fonts.text, fontSize: 9, lineHeight: 11, textAlign: 'center' },
  cardTitle: { color: palette.champagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.8 },
  cardNote: { color: palette.muted, fontFamily: fonts.text, fontSize: 12, lineHeight: 16 },
  shareCard: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 0 16px rgba(232, 200, 142, 0.12)',
  },
  shareCopy: { flex: 1, gap: 2 },
  mine: {
    marginTop: 16,
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.champagne,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 0 16px rgba(232, 200, 142, 0.16)',
  },
  mineLabel: { color: palette.champagne, fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.8 },
  mineValue: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 22 },
  mineCopy: { flex: 1 },
  mineName: { color: palette.text, fontFamily: fonts.textMedium, fontSize: 13, textTransform: 'uppercase' },
  mineScore: { color: palette.champagne, fontFamily: fonts.textMedium, fontSize: 13 },
  leave: { marginTop: 12, minHeight: 36, justifyContent: 'center' },
  leaveLabel: { color: palette.muted, fontFamily: fonts.text, fontSize: 12 },
  join: { marginTop: 28, gap: 12 },
  joinTitle: { color: palette.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  joinText: { color: palette.muted, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  reqList: { gap: 4 },
  reqLine: { color: palette.champagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.1 },
  joinButton: { minHeight: 48, borderRadius: 999, backgroundColor: palette.champagne, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  joinButtonOff: { opacity: 0.45 },
  joinButtonLabel: { color: palette.ink, fontFamily: fonts.textMedium, fontSize: 13, letterSpacing: 1 },
  pressed: { opacity: 0.78 },
});
