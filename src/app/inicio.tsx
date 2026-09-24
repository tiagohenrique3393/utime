import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { loadProfile } from '@/lib/profile';
import { progressPercent, useCompletedTaskIds } from '@/lib/tasks';

const LOGO_ASPECT = 873 / 530;

const pillars = [
  { key: 'corpo', label: 'Corpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'espirito', label: 'Espírito' },
] as const;

export default function ProvisionalHomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const logoWidth = isWide ? 112 : 92;
  const firstName = loadProfile().firstName.trim();
  const greeting = firstName ? `Olá, ${firstName}.` : 'Olá.';
  const completed = useCompletedTaskIds();
  const percent = progressPercent(completed.length);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Image
              accessibilityLabel="YouTime"
              source={require('@/assets/youtime-logo.png')}
              style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT, alignSelf: 'center' }}
              contentFit="contain"
            />

            <Text accessibilityRole="header" style={styles.greeting}>
              {greeting}
            </Text>
            <Text style={styles.lead}>Seu tempo começa agora.</Text>
            <View style={styles.rule} />

            <View style={[styles.pillars, isWide && styles.pillarsWide]}>
              {pillars.map((pillar) => (
                <View key={pillar.key} style={[styles.pillar, isWide && styles.pillarWide]}>
                  <View style={styles.stem} />
                  <Text style={styles.pillarLabel}>{pillar.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso de hoje</Text>
                <Text style={styles.progressValue}>{percent}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/jornada')}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonLabel}>Ver tarefas de hoje</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/trinta-dias' as Href)}
              style={({ pressed }) => [styles.secondary, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryLabel}>Meus 30 dias</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  safeWide: {
    paddingHorizontal: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  columnWide: {
    maxWidth: 720,
  },
  greeting: {
    marginTop: 18,
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
  },
  lead: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  rule: {
    alignSelf: 'center',
    width: 36,
    height: 1,
    marginTop: 20,
    marginBottom: 28,
    backgroundColor: colors.line,
  },
  pillars: {
    gap: 12,
  },
  pillarsWide: {
    flexDirection: 'row',
  },
  pillar: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  pillarWide: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 140,
    gap: 14,
  },
  stem: {
    width: 1,
    height: 28,
    backgroundColor: colors.gold,
  },
  pillarLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  progressCard: {
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  progressTitle: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  progressValue: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(244, 240, 232, 0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  button: {
    height: 58,
    marginTop: 28,
    borderRadius: 16,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonLabel: {
    color: colors.background,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondary: {
    height: 58,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
