/** Referência comercial BR aprovada para o layout. Lojas podem sobrescrever depois. */
export const PREMIUM_ANNUAL_REFERENCE = {
  id: 'utime_premium_annual',
  title: 'Plano anual',
  priceLabel: 'R$ 139,90',
  cadenceLabel: 'UMA COBRANÇA POR ANO',
  currencyHint: 'BRL',
} as const;

export type SubscriptionAvailability = 'coming_soon' | 'store_ready';

export type SubscriptionSnapshot = {
  availability: SubscriptionAvailability;
  product: typeof PREMIUM_ANNUAL_REFERENCE;
  storeLabel: string;
  message: string;
};

export function storeLabelForPlatform(os: string) {
  if (os === 'ios') {
    return 'App Store';
  }
  if (os === 'android') {
    return 'Google Play';
  }
  return 'App Store ou Google Play';
}

/** Stub preparado para RevenueCat — sem SDK nem cobrança nesta etapa. */
export function buildSubscriptionSnapshot(os: string): SubscriptionSnapshot {
  return {
    availability: 'coming_soon',
    product: PREMIUM_ANNUAL_REFERENCE,
    storeLabel: storeLabelForPlatform(os),
    message: 'As assinaturas do UTime Premium estarão disponíveis em breve.',
  };
}

export type PurchaseResult = {
  ok: false;
  message: string;
};

export function purchaseUnavailable(snapshot: SubscriptionSnapshot): PurchaseResult {
  return { ok: false, message: snapshot.message };
}

export function restoreUnavailable(): PurchaseResult {
  return {
    ok: false,
    message: 'A restauração de compras estará disponível quando as assinaturas forem ativadas nas lojas.',
  };
}

export const REVENUECAT_PENDING = [
  'Contas Apple Developer e Google Play Console',
  'Produtos de assinatura anual configurados nas lojas',
  'Projeto RevenueCat (apps iOS/Android) e API keys públicas',
  'SDK compatível com Expo/dev client (sem secretos no app)',
  'Webhook autenticado → Supabase para autorizar Premium no servidor',
  'Identificador imutável = auth.users.id do Supabase',
] as const;
