import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';

const pillars = [
  {
    key: 'corpo',
    label: 'Corpo',
    symbol: { ios: 'person', android: 'person', web: 'person' },
  },
  {
    key: 'mente',
    label: 'Mente',
    symbol: { ios: 'brain', android: 'psychology', web: 'psychology' },
  },
  {
    key: 'espirito',
    label: 'Espírito',
    symbol: { ios: 'figure.mind.and.body', android: 'self_improvement', web: 'self_improvement' },
  },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const titleSize = width < 360 ? 40 : isWide ? 60 : 48;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <View style={styles.header}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 4 }]}>
                YouTime
              </Text>
              <Text style={[styles.tagline, isWide && styles.taglineWide]}>Seu tempo. Sua evolução.</Text>
              <View style={styles.rule} />
            </View>

            <View style={[styles.cards, isWide && styles.cardsWide]}>
              {pillars.map((pillar) => (
                <View key={pillar.key} style={[styles.card, isWide ? styles.cardWide : styles.cardCompact]}>
                  <View style={styles.iconWell}>
                    <SymbolView name={pillar.symbol} tintColor={colors.gold} size={22} />
                  </View>
                  <Text style={[styles.cardLabel, isWide && styles.cardLabelWide]}>{pillar.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonLabel}>Começar minha jornada</Text>
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
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  columnWide: {
    maxWidth: 760,
    paddingTop: 28,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    color: colors.ivory,
    fontFamily: fonts.display,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  taglineWide: {
    fontSize: 18,
    lineHeight: 26,
  },
  rule: {
    width: 36,
    height: 1,
    marginTop: 20,
    backgroundColor: colors.line,
  },
  cards: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 12,
    marginVertical: 28,
  },
  cardsWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    marginVertical: 36,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
  },
  cardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  cardWide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    minHeight: 176,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  cardLabelWide: {
    fontSize: 18,
  },
  button: {
    height: 58,
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
});
