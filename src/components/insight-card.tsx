import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';

const gold = '#E6C14A';

function glyph(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Lightbulb() {
  if (Platform.OS !== 'web') {
    return <View style={styles.bulbFallback} />;
  }
  return glyph(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
    glyph('path', {
      d: 'M8 1.6a4.4 4.4 0 0 0-2.6 7.9c.3.24.5.55.5.9v.6h4.2v-.6c0-.35.2-.66.5-.9A4.4 4.4 0 0 0 8 1.6z',
      stroke: gold,
      strokeWidth: 1.2,
      strokeLinejoin: 'round',
      style: { filter: 'drop-shadow(0 0 3px rgba(230,193,74,0.7))' },
    }),
    glyph('path', {
      d: 'M6.2 12.6h3.6M6.6 14h2.8',
      stroke: gold,
      strokeWidth: 1.2,
      strokeLinecap: 'round',
    }),
  );
}

/** Cartão de insight: borda ouro fina, lâmpada e `INSIGHT:` em ouro (sem duplicar no corpo). */
export function InsightCard({ message }: { message: string }) {
  const body = message.replace(/^INSIGHT:\s*/i, '').trim();
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.row}>
        <Lightbulb />
        <Text style={styles.text}>
          <Text style={styles.lead}>INSIGHT: </Text>
          <Text style={styles.body}>{body}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.45)',
    backgroundColor: 'rgba(10,10,10,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulbFallback: {
    width: 14,
    height: 14,
    marginTop: 2,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: gold,
  },
  text: { flex: 1, minWidth: 0 },
  lead: {
    color: gold,
    fontFamily: fonts.display,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
});
