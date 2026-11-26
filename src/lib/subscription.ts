import { Platform } from 'react-native';

import {
  PREMIUM_ANNUAL_REFERENCE,
  REVENUECAT_PENDING,
  buildSubscriptionSnapshot,
  purchaseUnavailable,
  restoreUnavailable,
  storeLabelForPlatform,
  type PurchaseResult,
  type SubscriptionSnapshot,
} from '@/lib/subscription-catalog';

export {
  PREMIUM_ANNUAL_REFERENCE,
  REVENUECAT_PENDING,
  type PurchaseResult,
  type SubscriptionSnapshot,
};

export function storePaymentLabel() {
  return storeLabelForPlatform(Platform.OS);
}

export function getSubscriptionSnapshot(): SubscriptionSnapshot {
  return buildSubscriptionSnapshot(Platform.OS);
}

export async function startPremiumPurchase(): Promise<PurchaseResult> {
  return purchaseUnavailable(getSubscriptionSnapshot());
}

export async function restorePremiumPurchases(): Promise<PurchaseResult> {
  return restoreUnavailable();
}
