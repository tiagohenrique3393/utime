import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import {
  formatWater,
  hydrationProgress,
  loadHydration,
  saveHydration,
  type HydrationDay,
} from '@/lib/hydration';

const additions = [200, 250, 500];

export function HydrationMeter({
  userId,
  dateKey,
  onSaved,
}: {
  userId: string;
  dateKey: string;
  onSaved: () => void;
}) {
  const [day, setDay] = useState<HydrationDay>({ goalMl: null, consumedMl: 0 });
  const [goalText, setGoalText] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void loadHydration(userId, dateKey).then((result) => {
      if (!active) {
        return;
      }
      setDay(result.day);
      setGoalText(result.day.goalMl == null ? '' : String(result.day.goalMl));
      setNotice(result.ok ? '' : result.message);
    });
    return () => {
      active = false;
    };
  }, [dateKey, userId]);

  async function commit(next: HydrationDay) {
    if (pending) {
      return;
    }
    setPending(true);
    const saved = await saveHydration(userId, dateKey, next);
    setPending(false);
    if (!saved.ok) {
      setNotice(saved.message);
      return;
    }
    setDay(saved.day);
    setGoalText(saved.day.goalMl == null ? '' : String(saved.day.goalMl));
    setNotice(saved.message);
    onSaved();
  }

  function saveGoal() {
    const trimmed = goalText.trim();
    if (trimmed.length === 0) {
      void commit({ ...day, goalMl: null });
      return;
    }
    if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0) {
      setNotice('Informe a meta em mililitros.');
      return;
    }
    void commit({ ...day, goalMl: Number(trimmed) });
  }

  const progress = hydrationProgress(day.consumedMl, day.goalMl);

  return (
    <View style={styles.wrap}>
      <Text style={styles.amount}>{formatWater(day.consumedMl)}</Text>
      <Text style={styles.meta}>{day.goalMl == null ? 'Defina sua meta diária' : `Meta ${formatWater(day.goalMl)}`}</Text>
      <Track percent={progress} />
      <View style={styles.goalRow}>
        <TextInput
          value={goalText}
          onChangeText={(value) => {
            setGoalText(value.replace(/[^\d]/g, ''));
            setNotice('');
          }}
          onSubmitEditing={saveGoal}
          keyboardType="number-pad"
          inputMode="numeric"
          editable={!pending}
          placeholder="Meta em ml"
          placeholderTextColor={ui.faint}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" disabled={pending} onPress={saveGoal} style={styles.goalAction}>
          <Text style={styles.goalActionLabel}>{pending ? 'Salvando' : 'Salvar meta'}</Text>
        </Pressable>
      </View>
      <View style={styles.adds}>
        {additions.map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            disabled={pending}
            onPress={() => void commit({ ...day, consumedMl: day.consumedMl + amount })}
            style={styles.add}>
            <Text style={styles.addLabel}>{`+ ${amount} ml`}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={pending || day.consumedMl === 0}
          onPress={() => void commit({ ...day, consumedMl: Math.max(0, day.consumedMl - 200) })}
          style={styles.add}>
          <Text style={styles.addLabel}>− 200 ml</Text>
        </Pressable>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  amount: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
    paddingHorizontal: 12,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  goalAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  goalActionLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  adds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  add: {
    minHeight: 36,
    justifyContent: 'center',
  },
  addLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  notice: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
