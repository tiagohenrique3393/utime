import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, PageTitle, TextButton } from '@/components/app-screen';
import { RadarThreePillars } from '@/components/radar-pillars';
import { fonts, ui } from '@/constants/theme';
import { balanceInsight, currentJourneyDay, dayPillars } from '@/lib/journey-view';
import { useRequireSession } from '@/lib/require-session';
import { useJourneyBoard } from '@/lib/tasks';

export default function PillarsScreen() {
  const signedIn = useRequireSession();
  const journey = useJourneyBoard();
  const readings = dayPillars(journey, currentJourneyDay(journey));

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <AppScreen width="narrow">
      <TextButton label="Jornada" onPress={() => router.navigate('/trinta-dias')} />
      <View style={styles.header}>
        <Eyebrow>Mapa</Eyebrow>
        <PageTitle compact>3 pilares</PageTitle>
      </View>
      <View style={styles.radar}>
        <RadarThreePillars readings={readings} />
      </View>
      <Text style={styles.section}>Onde ajustar agora</Text>
      <Text style={styles.insight}>{balanceInsight(readings)}</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: ui.background,
  },
  header: {
    marginTop: 18,
  },
  radar: {
    marginTop: 28,
  },
  section: {
    marginTop: 36,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  insight: {
    marginTop: 10,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    maxWidth: 420,
  },
});
