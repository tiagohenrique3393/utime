import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { PillarRing } from '@/components/pillar-ring';
import { fonts } from '@/constants/theme';
import { formatDailyPercent } from '@/lib/habit-day';
import { getProgressColor, progressBandColor } from '@/lib/progress-color';
import type { PillarId } from '@/lib/tasks';

const corpoMale = require('@/assets/pillars/corpo-mantime.png');
const corpoFemale = require('@/assets/pillars/corpo-womantime.png');
const menteFigure = require('@/assets/pillars/mente.png');
const espiritoFigure = require('@/assets/pillars/espirito.png');

function figureFor(id: PillarId, feminine: boolean) {
  if (id === 'corpo') {
    return feminine ? corpoFemale : corpoMale;
  }
  if (id === 'mente') {
    return menteFigure;
  }
  return espiritoFigure;
}

export function PillarCard({
  id,
  label,
  percent,
  feminine = false,
}: {
  id: PillarId;
  label: string;
  percent: number;
  feminine?: boolean;
}) {
  const { width } = useWindowDimensions();
  const tablet = width >= 760;
  const finite = Number.isFinite(percent) ? percent : 0;
  const gutter = width >= 840 ? 64 : 44;
  const content = Math.min(Math.max(width - gutter, 240), 1120);
  const slot = (content - 20) / 3;
  const dial = Math.max(48, Math.min(tablet ? 96 : 78, Math.floor(slot - 24)));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatDailyPercent(finite)}. Ver hábitos`}
      onPress={() => router.push(`/pilar/${id}` as Href)}
      style={({ pressed }) => [styles.card, tablet ? styles.cardTablet : styles.cardPhone, pressed && styles.pressed]}>
      <PillarRing size={dial} percent={finite} marker={id}>
        <Image source={figureFor(id, feminine)} contentFit="cover" style={styles.portraitImage} />
      </PillarRing>
      <Text style={[styles.name, tablet && styles.nameTablet]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, tablet && styles.valueTablet, { color: progressBandColor[getProgressColor(finite)] }]}>
        {formatDailyPercent(finite)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '31%',
    maxWidth: '32.4%',
    minWidth: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.08)',
    backgroundColor: 'rgba(8, 8, 8, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPhone: {
    minHeight: 168,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
    gap: 4,
  },
  cardTablet: {
    minHeight: 198,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    color: '#F7F4EC',
    fontFamily: fonts.display,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  nameTablet: {
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 1.8,
  },
  value: {
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 16,
  },
  valueTablet: {
    fontSize: 15,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.84,
  },
});
