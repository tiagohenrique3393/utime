import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';

const pillars = [
  { key: 'corpo', label: 'Corpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'espirito', label: 'Espírito' },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const titleSize = Math.min(84, Math.max(52, width * 0.15));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.glow} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.composition}>
          <Text accessibilityRole="header" style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.02 }]}>
            YouTime
          </Text>

          <View style={styles.rule} />

          <View style={styles.pillars}>
            {pillars.map((pillar) => (
              <View key={pillar.key} style={styles.pillar}>
                <View style={styles.stem} />
                <Text style={styles.pillarLabel}>{pillar.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
    top: '22%',
    left: '50%',
    width: 320,
    height: 320,
    marginLeft: -160,
    borderRadius: 160,
    backgroundColor: colors.goldSoft,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  composition: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  title: {
    color: colors.ivory,
    fontFamily: fonts.display,
    letterSpacing: -1,
    textAlign: 'center',
  },
  rule: {
    width: 36,
    height: 1,
    marginTop: 22,
    marginBottom: 36,
    backgroundColor: colors.line,
  },
  pillars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  pillar: {
    alignItems: 'center',
    flex: 1,
  },
  stem: {
    width: 1,
    height: 40,
    marginBottom: 16,
    backgroundColor: colors.gold,
  },
  pillarLabel: {
    color: colors.muted,
    fontFamily: fonts.textMedium,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
