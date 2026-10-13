import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { circlePalette as ink } from '@/components/circle-palette';
import { BulbIcon, ChevronIcon, PillarGlyph, TargetIcon } from '@/components/pillar-icons';
import { fonts } from '@/constants/theme';
import { isPercent, shownPercent, type PillarId } from '@/lib/pillar-balance';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function MiniRing({ percent, size }: { percent: number | null; size: number }) {
  const active = isPercent(percent);
  const clamped = active ? Math.min(100, Math.max(0, percent)) : 0;
  if (Platform.OS !== 'web') {
    return <View style={[styles.miniFallback, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  const stroke = 3;
  const radius = size / 2 - stroke;
  const center = size / 2;
  const turn = 2 * Math.PI * radius;
  const offset = turn * (1 - clamped / 100);
  return node(
    'svg',
    { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': true },
    node('circle', { cx: center, cy: center, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.12)', strokeWidth: stroke * 0.7 }),
    active
      ? node('circle', {
          cx: center,
          cy: center,
          r: radius,
          fill: 'none',
          stroke: ink.champagne,
          strokeWidth: stroke,
          strokeLinecap: 'round',
          strokeDasharray: `${turn} ${turn}`,
          strokeDashoffset: offset,
          transform: `rotate(-90 ${center} ${center})`,
        })
      : null,
  );
}

export function InsightFocusCard({
  insightTitle,
  focusTitle,
  insight,
  focus,
  stacked,
}: {
  insightTitle: string;
  focusTitle: string;
  insight: string;
  focus: string;
  stacked: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.split, stacked && styles.splitStack]}>
        <View style={styles.column}>
          <View style={styles.kickerRow}>
            <BulbIcon />
            <Text style={styles.kicker}>{insightTitle}</Text>
          </View>
          <Text style={styles.copy}>{insight}</Text>
        </View>
        <View style={[styles.divider, stacked && styles.dividerRow]} />
        <View style={styles.focusSide}>
          <View style={styles.column}>
            <View style={styles.kickerRow}>
              <TargetIcon />
              <Text style={styles.kicker}>{focusTitle}</Text>
            </View>
            <Text style={styles.copy}>{focus}</Text>
          </View>
          <View style={styles.chevron}>
            <ChevronIcon />
          </View>
        </View>
      </View>
    </View>
  );
}

export function EquilibriumCard({ percent, stacked }: { percent: number | null; stacked: boolean }) {
  return (
    <View style={styles.card}>
      <View style={[styles.balance, stacked && styles.splitStack]}>
        <View style={styles.balanceMain}>
          <MiniRing percent={percent} size={46} />
          <View style={styles.balanceText}>
            <Text style={styles.kicker}>Seu equilíbrio geral</Text>
            <Text style={styles.balanceValue}>{shownPercent(percent)}</Text>
          </View>
        </View>
        <View style={[styles.divider, stacked && styles.dividerRow]} />
        <Text style={[styles.copy, styles.balanceNote]}>Média dos três pilares: Corpo, Mente e Espírito.</Text>
      </View>
    </View>
  );
}

const adjustOrder: { id: PillarId; glyph: 'corpo' | 'mente' | 'espirito' }[] = [
  { id: 'corpo', glyph: 'corpo' },
  { id: 'mente', glyph: 'mente' },
  { id: 'espirito', glyph: 'espirito' },
];

export function AdjustCard({ lines }: { lines: Record<PillarId, string> }) {
  return (
    <View style={styles.card}>
      <Text style={styles.adjustTitle}>Onde ajustar agora</Text>
      <View style={styles.adjustRow}>
        {adjustOrder.map((item) => (
          <View key={item.id} style={styles.adjustItem}>
            <View style={styles.adjustIcon}>
              <PillarGlyph kind={item.glyph} />
            </View>
            <View style={styles.adjustCopyWrap}>
              <Text style={styles.adjustName}>{item.id === 'espirito' ? 'Espírito' : item.id === 'mente' ? 'Mente' : 'Corpo'}</Text>
              <Text style={styles.adjustCopy}>{lines[item.id]}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,181,122,0.55)',
    backgroundColor: 'rgba(8,8,10,0.78)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  splitStack: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    flex: 1,
    color: ink.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  focusSide: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    justifyContent: 'center',
  },
  copy: {
    marginTop: 8,
    color: ink.text,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(214,181,122,0.28)',
  },
  dividerRow: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  balanceText: {
    minWidth: 86,
  },
  balanceValue: {
    marginTop: 2,
    color: ink.text,
    fontFamily: fonts.textMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  balanceNote: {
    flex: 1,
    marginTop: 0,
  },
  miniFallback: {
    borderWidth: 2,
    borderColor: ink.champagne,
  },
  adjustTitle: {
    color: ink.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  adjustItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  adjustIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(232,200,142,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustCopyWrap: {
    flex: 1,
    minWidth: 0,
  },
  adjustName: {
    color: ink.text,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  adjustCopy: {
    marginTop: 2,
    color: ink.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
  },
});
