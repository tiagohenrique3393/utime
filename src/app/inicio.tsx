import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { colors, fonts } from '@/constants/theme';
import { getSessionUserId, signOut } from '@/lib/accounts';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { pillarStats, pillars, progressPercent, useCompletedTaskIds } from '@/lib/tasks';

const LOGO_ASPECT = 685 / 243;

export default function ProvisionalHomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const logoWidth = isWide ? 65 : 54;
  const firstName = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot).firstName.trim();
  const greeting = firstName ? `Olá, ${firstName}.` : 'Olá.';
  const completed = useCompletedTaskIds();
  const percent = progressPercent(completed.length);
  const signedIn = getSessionUserId() !== null;

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView
        edges={signedIn ? ['top', 'left', 'right'] : ['top', 'right', 'bottom', 'left']}
        style={[styles.safe, isWide && styles.safeWide]}>
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
              {pillars.map((pillar) => {
                const stats = pillarStats(completed, pillar.id);
                return (
                  <Pressable
                    key={pillar.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${pillar.label}, ${stats.percent}%, ${stats.done} de ${stats.total}`}
                    onPress={() => router.push(`/pilar/${pillar.id}` as Href)}
                    style={({ pressed }) => [
                      styles.pillar,
                      isWide && styles.pillarWide,
                      pressed && styles.buttonPressed,
                    ]}>
                    <View style={styles.pillarHeader}>
                      <View style={styles.stem} />
                      <Text style={styles.pillarLabel}>{pillar.label}</Text>
                      <Text style={styles.pillarPercent}>{stats.percent}%</Text>
                    </View>
                    <View style={[styles.track, styles.pillarTrack]}>
                      <View style={[styles.fill, { width: `${stats.percent}%` }]} />
                    </View>
                    <Text style={styles.pillarCount}>
                      {stats.done} de {stats.total}
                    </Text>
                  </Pressable>
                );
              })}
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
            <Text style={styles.motto}>A vida que você quer é construída nos dias comuns.</Text>
            {signedIn ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/perfil')}
                style={({ pressed }) => [styles.signOut, pressed && styles.buttonPressed]}>
                <Text style={styles.signOutLabel}>Perfil</Text>
              </Pressable>
            ) : null}
            {signedIn ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleSignOut}
                style={({ pressed }) => [styles.signOut, pressed && styles.buttonPressed]}>
                <Text style={styles.signOutLabel}>Sair</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      {signedIn ? <BottomNav /> : null}
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pillarWide: {
    flex: 1,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stem: {
    width: 1,
    height: 18,
    backgroundColor: colors.gold,
  },
  pillarLabel: {
    flex: 1,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  pillarPercent: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  pillarTrack: {
    marginTop: 14,
  },
  pillarCount: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
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
    backgroundColor: colors.track,
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
    color: colors.onPrimary,
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
  motto: {
    marginTop: 28,
    color: colors.muted,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  signOut: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  signOutLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
});
