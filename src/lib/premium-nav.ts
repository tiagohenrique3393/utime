import { router, type Href } from 'expo-router';

import { premiumPath, sanitizePremiumReturn } from '@/lib/premium-return';

export { sanitizePremiumReturn };

export function premiumHref(returnTo: string): Href {
  return premiumPath(returnTo) as Href;
}

export function openPremiumScreen(returnTo: string) {
  router.push(premiumHref(returnTo));
}

export function leavePremiumScreen(returnTo: string | string[] | undefined) {
  const target = sanitizePremiumReturn(returnTo);
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(target as Href);
}
