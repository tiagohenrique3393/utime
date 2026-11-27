import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HydrationDrop } from '@/components/hydration-drop';
import { fonts, ui } from '@/constants/theme';
import { formatHydrationPercent, hydrationFill, hydrationPercent, type HydrationDay } from '@/lib/hydration';
import { formatHydrationAmount } from '@/lib/hydration-volume';
import { reminderArt, type ReminderArt } from '@/lib/reminder-art';
import type { HabitPillar } from '@/lib/habit-catalog';

const pillarArt: Record<ReminderArt, number> = {
  mantime: require('@/assets/pillars/corpo-mantime.png'),
  womantime: require('@/assets/pillars/corpo-womantime.png'),
  mente: require('@/assets/pillars/mente.png'),
  espirito: require('@/assets/pillars/espirito.png'),
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
      <View style={styles.half} accessibilityRole="summary">
        <Text style={styles.kicker}>Hidratação</Text>
        <View style={styles.hydroBody}>
          <HydrationDrop progress={fill} size={40} />
          <View style={styles.hydroCopy}>
            <Text style={styles.percent}>{goal == null ? '—' : formatHydrationPercent(percent)}</Text>
            <Text style={styles.volume}>
              {goal == null
                ? formatHydrationAmount(consumed)
                : `${formatHydrationAmount(consumed)} / ${formatHydrationAmount(goal)}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={habitTitle || 'Próximo hábito'}
        onPress={onOpenHabit}
        style={({ pressed }) => [styles.half, styles.habitHalf, pressed && styles.pressed]}>
        <Text style={styles.kicker}>Próximo hábito</Text>
        <View style={styles.habitBody}>
          {art ? (
            <View style={styles.thumb}>
              <Image source={pillarArt[art]} contentFit="cover" style={styles.thumbImage} />
            </View>
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}
          <View style={styles.habitCopy}>
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
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(225, 180, 95, 0.28)',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  half: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  habitHalf: {
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 12,
    backgroundColor: 'rgba(230, 193, 74, 0.55)',
  },
  kicker: {
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
  },
  hydroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  percent: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 18,
    lineHeight: 22,
  },
  volume: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  habitBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.45)',
    backgroundColor: '#0A0A0A',
  },
  thumbEmpty: {
    backgroundColor: 'rgba(232, 201, 155, 0.08)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  habitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
