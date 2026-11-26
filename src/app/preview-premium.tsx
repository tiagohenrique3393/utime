import { router, useLocalSearchParams } from 'expo-router';

import { PremiumExperience } from '@/components/premium-experience';
import type { JourneyId } from '@/lib/profile';

function parseJourney(raw: string | string[] | undefined): JourneyId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'womantime' ? 'womantime' : 'metime';
}

/** Pré-visualização visual da tela Premium (Man/Woman Time) sem exigir sessão. */
export default function PreviewPremiumScreen() {
  const params = useLocalSearchParams<{ journey?: string }>();
  return (
    <PremiumExperience
      journey={parseJourney(params.journey)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
