import { useLocalSearchParams } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';

import { PremiumExperience } from '@/components/premium-experience';
import { leavePremiumScreen } from '@/lib/premium-nav';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';

export default function PremiumRoute() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ voltar?: string }>();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);

  if (!signedIn) {
    return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
  }

  return (
    <PremiumExperience
      journey={profile.journey}
      onBack={() => leavePremiumScreen(params.voltar)}
    />
  );
}
