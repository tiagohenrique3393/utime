import {
  PREMIUM_ANNUAL_REFERENCE,
  REVENUECAT_PENDING,
  buildSubscriptionSnapshot,
  purchaseUnavailable,
  restoreUnavailable,
  storeLabelForPlatform,
} from '@/lib/subscription-catalog';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function assertMatch(value: string, pattern: RegExp, label: string) {
  if (!pattern.test(value)) {
    throw new Error(`${label}: "${value}" não casa com ${pattern}`);
  }
}

assertEqual(storeLabelForPlatform('ios'), 'App Store', 'ios');
assertEqual(storeLabelForPlatform('android'), 'Google Play', 'android');
assertEqual(storeLabelForPlatform('web'), 'App Store ou Google Play', 'web');

const snapshot = buildSubscriptionSnapshot('web');
assertEqual(snapshot.availability, 'coming_soon', 'disponibilidade');
assertEqual(snapshot.product.priceLabel, 'R$ 139,90', 'preço de referência');
assertEqual(snapshot.product.id, PREMIUM_ANNUAL_REFERENCE.id, 'id do produto');
assertMatch(snapshot.message, /disponíveis em breve/i, 'mensagem');
if (REVENUECAT_PENDING.length < 4) {
  throw new Error('pendências RevenueCat insuficientes');
}

const purchase = purchaseUnavailable(snapshot);
assertEqual(purchase.ok, false, 'compra não inicia');
assertMatch(purchase.message, /disponíveis em breve/i, 'mensagem da compra');

const restore = restoreUnavailable();
assertEqual(restore.ok, false, 'restauração não concede');
assertMatch(restore.message, /restauração/i, 'mensagem da restauração');

console.log('subscription ok');
