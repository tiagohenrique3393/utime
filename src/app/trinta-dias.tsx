import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, PageTitle } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { useRequireSession } from '@/lib/require-session';
import { setTestMode, useJourneyBoard } from '@/lib/tasks';

const entries: { href: '/progresso' | '/pilares' | '/constancia'; label: string; note: string }[] = [
  { href: '/progresso', label: 'Progresso', note: 'Pontuação e evolução' },
  { href: '/pilares', label: 'Mapa dos 3 pilares', note: 'Corpo, mente e espírito' },
  { href: '/constancia', label: 'Constância', note: 'Sequência e calendário' },
];

export default function JourneyHubScreen() {
  const signedIn = useRequireSession();
  const journey = useJourneyBoard();

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <AppScreen width="narrow">
      <PageTitle>Jornada</PageTitle>
      <View style={styles.list}>
        {entries.map((entry) => (
          <Pressable
            key={entry.label}
            accessibilityRole="button"
            accessibilityLabel={`${entry.label}. ${entry.note}`}
            onPress={() => router.push(entry.href as Href)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.copy}>
              <Text style={styles.label}>{entry.label}</Text>
              <Text style={styles.note}>{entry.note}</Text>
            </View>
            <Text style={styles.cue}>→</Text>
          </Pressable>
        ))}
      </View>
      {__DEV__ ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setTestMode(!journey.testMode)}
          style={styles.test}>
          <Text style={styles.testLabel}>{journey.testMode ? 'Modo de teste ativo' : 'Modo de teste'}</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: ui.background,
  },
  list: {
    marginTop: 36,
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
  },
  note: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  cue: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.72,
  },
  test: {
    marginTop: 28,
    minHeight: 44,
    justifyContent: 'center',
  },
  testLabel: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
