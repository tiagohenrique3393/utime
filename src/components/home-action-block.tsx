import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HydrationDrop } from '@/components/hydration-drop';
import { fonts, ui } from '@/constants/theme';
import { formatHydrationPercent, hydrationFill, hydrationPercent, type HydrationDay } from '@/lib/hydration';
import { formatHydrationAmount } from '@/lib/hydration-volume';
import { reminderArt, type ReminderArt } from '@/lib/reminder-art';
import type { HabitPillar } from '@/lib/habit-catalog';

const bubbles = require('@/assets/hydration-bubbles.jpg');

const pillarArt: Record<ReminderArt, number> = {
  mantime: require('@/assets/pillars/corpo-mantime.png'),
  womantime: require('@/assets/pillars/corpo-womantime.png'),
  mente: require('@/assets/pillars/mente.png'),
  espirito: require('@/assets/pillars/espirito.png'),
};

const pillarLabel: Record<HabitPillar, string> = {
  corpo: 'Corpo',
  mente: 'Mente',
  espirito: 'Espírito',
};

export function HomeActionBlock({
  hydration,
  habitTitle,
  habitDetail,
  habitPillar,
  journey,
  completed,
  onOpenHabit,
}: {
  hydration: HydrationDay | null;
  habitTitle: string;
  habitDetail: string;
  habitPillar: HabitPillar | null;
  journey: string | null;
  completed: boolean;
  onOpenHabit?: () => void;
}) {
  const consumed = hydration?.consumedMl ?? 0;
  const goal = hydration?.goalMl ?? null;
  const percent = goal != null ? hydrationPercent(consumed, goal) : 0;
  const fill = hydrationFill(consumed, goal);
  const art = reminderArt(habitPillar, journey);

  return (
    <View style={styles.row}>
      <View style={styles.hydroHalf} accessibilityRole="summary">
        <Image source={bubbles} contentFit="cover" style={styles.hydroBg} />
        <View style={styles.hydroWash} />
        <Text style={styles.hydroKicker}>Hidratação</Text>
        <View style={styles.hydroBody}>
          <HydrationDrop progress={fill} size={52} />
          <View style={styles.hydroCopy}>
            <Text style={styles.percent}>{goal == null ? '—' : formatHydrationPercent(percent)}</Text>
            <Text style={styles.volume}>
              {goal == null
                ? formatHydrationAmount(consumed)
                : `${formatHydrationAmount(consumed)} / ${formatHydrationAmount(goal)}`}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(fill) }}
              style={styles.rail}>
              {fill > 0 ? <View style={[styles.fill, { width: `${fill}%` }]} /> : null}
              <View style={styles.railShine} pointerEvents="none" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={habitTitle || 'Próximo hábito'}
        onPress={onOpenHabit}
        style={({ pressed }) => [styles.habitHalf, pressed && styles.pressed]}>
        <Text style={styles.habitKicker}>Próximo hábito</Text>
        <View style={styles.habitBody}>
          {art ? (
            <View style={styles.thumb}>
              <Image source={pillarArt[art]} contentFit="cover" style={styles.thumbImage} />
              <View style={styles.thumbGlow} />
            </View>
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}
          <View style={styles.habitCopy}>
            {habitPillar ? <Text style={styles.pillarName}>{pillarLabel[habitPillar]}</Text> : null}
            <Text numberOfLines={2} style={[styles.habitTitle, completed && styles.habitDone]}>
              {habitTitle}
            </Text>
            {habitDetail ? <Text style={styles.habitDetail}>{habitDetail}</Text> : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 14,
    minHeight: 108,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(225, 180, 95, 0.34)',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  hydroHalf: {
    flex: 1.05,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(12, 42, 72, 0.72)',
  },
  hydroBg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.42,
  },
  hydroWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 40, 72, 0.55)',
  },
  habitHalf: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    marginVertical: 14,
    backgroundColor: 'rgba(230, 193, 74, 0.62)',
  },
  hydroKicker: {
    color: '#9AD4FF',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    zIndex: 1,
  },
  habitKicker: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hydroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  hydroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  percent: {
    color: '#B7E4FF',
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 0.4,
  },
  volume: {
    color: '#D6ECFA',
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 15,
  },
  rail: {
    marginTop: 4,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 28, 48, 0.85)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(154, 212, 255, 0.35)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4AA8E8',
  },
  railShine: {
    position: 'absolute',
    top: 1,
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  habitBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 201, 155, 0.55)',
    backgroundColor: '#0A0A0A',
  },
  thumbEmpty: {
    backgroundColor: 'rgba(232, 201, 155, 0.08)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 201, 74, 0.18)',
  },
  habitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pillarName: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  habitTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  habitDone: {
    color: ui.textChampagne,
  },
  habitDetail: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chevron: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.86,
  },
});
