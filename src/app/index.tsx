import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';
import { consumeRecoveryRedirect, hasPendingRecovery } from '@/lib/session';

const LOGO_ASPECT = 685 / 243;

const pillars = [
  { key: 'corpo', label: 'Corpo', icon: 'body' },
  { key: 'mente', label: 'Mente', icon: 'mind' },
  { key: 'espirito', label: 'Espírito', icon: 'spirit' },
] as const;

function PillarIcon({ name }: { name: (typeof pillars)[number]['icon'] }) {
  if (name === 'body') {
    return (
      <View style={iconStyles.body}>
        <View style={iconStyles.head} />
        <View style={iconStyles.shoulders} />
      </View>
    );
  }

  if (name === 'mind') {
    return (
      <View style={iconStyles.mind}>
        <View style={iconStyles.mindDot} />
      </View>
    );
  }

  return <View style={iconStyles.spirit} />;
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const logoWidth = width < 360 ? 69 : isWide ? 109 : 85;
  const resumeSession = getSessionUserId() !== null || hasPendingRecovery();

  useEffect(() => {
    if (consumeRecoveryRedirect()) {
      router.replace('/redefinir-senha');
      return;
    }
    if (getSessionUserId()) {
      router.replace(isOnboardingComplete() ? '/inicio' : '/boas-vindas');
    }
  }, []);

  if (resumeSession) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <View style={styles.header}>
              <Image
                accessibilityLabel="YouTime"
                source={require('@/assets/youtime-logo.png')}
                style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT }}
                contentFit="contain"
              />
              <Text style={[styles.tagline, isWide && styles.taglineWide]}>Seu tempo. Sua evolução.</Text>
              <View style={styles.rule} />
            </View>

            <View style={[styles.cards, isWide && styles.cardsWide]}>
              {pillars.map((pillar) => (
                <View key={pillar.key} style={[styles.card, isWide ? styles.cardWide : styles.cardCompact]}>
                  <View style={styles.iconWell}>
                    <PillarIcon name={pillar.icon} />
                  </View>
                  <Text style={[styles.cardLabel, isWide && styles.cardLabelWide]}>{pillar.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/cadastro')}
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
    color: colors.onPrimary,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});

const iconStyles = StyleSheet.create({
  body: {
    alignItems: 'center',
  },
  head: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.25,
    borderColor: colors.gold,
  },
  shoulders: {
    width: 16,
    height: 7,
    marginTop: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.25,
    borderBottomWidth: 0,
    borderColor: colors.gold,
  },
  mind: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.25,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mindDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  spirit: {
    width: 11,
    height: 11,
    borderWidth: 1.25,
    borderColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
});
