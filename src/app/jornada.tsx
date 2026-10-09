import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ui } from '@/constants/theme';
import { parseDateKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

export default function RoutineScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ data?: string | string[] }>();
  const selectedDate = parseDateKey(params.data);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    const href = selectedDate ? `/meu-dia?data=${selectedDate}` : '/meu-dia';
    router.replace(href as Href);
  }, [selectedDate, signedIn]);

  return <View style={{ flex: 1, backgroundColor: ui.background }} />;
}
