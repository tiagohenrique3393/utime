import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';
import { habitRelevances, type HabitRelevance } from '@/lib/habit-catalog';
import { relevanceLabels } from '@/lib/habit-relevance';

export function HabitRelevanceChoices({
  value,
  onChange,
  title = 'Relevância do hábito',
  habitLabel,
  unclassified = false,
}: {
  value: HabitRelevance | null;
  onChange: (value: HabitRelevance) => void;
  title?: string;
  habitLabel?: string;
  unclassified?: boolean;
}) {
  return (
    <View>
      {title ? <Text style={styles.field}>{title}</Text> : null}
      {unclassified ? <Text style={styles.pending}>Sem classificação</Text> : null}
      <View accessibilityRole="radiogroup" style={styles.filters}>
        {habitRelevances.map((item) => {
          const selected = value === item;
          const name = habitLabel ? `${habitLabel}, ${relevanceLabels[item]}` : relevanceLabels[item];
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              hitSlop={6}
              onPress={() => onChange(item)}
              style={[styles.filter, selected && styles.filterOn]}>
              <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>{relevanceLabels[item]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 8,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pending: {
    marginTop: 4,
    color: '#A39E96',
    fontFamily: fonts.text,
    fontSize: 12,
  },
  filters: {
    marginTop: 8,
    gap: 8,
  },
  filter: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,200,142,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: {
    backgroundColor: ui.champagneDeep,
    borderColor: ui.champagneDeep,
  },
  filterLabel: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  filterLabelOn: {
    color: '#141210',
  },
});
