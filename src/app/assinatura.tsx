import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LegalScreen } from '@/components/legal-screen';
import { PremiumChevronIcon, PremiumCrownIcon } from '@/components/premium-icons';
import { fonts, ui } from '@/constants/theme';
import { useAccountPlan } from '@/lib/account-plan';
import { useSessionUserId } from '@/lib/session-user';
import { getSubscriptionSnapshot, restorePremiumPurchases } from '@/lib/subscription';

const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';
const APPLE_REFUND = 'https://reportaproblem.apple.com/';
const GOOGLE_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';
const GOOGLE_REFUND = 'https://support.google.com/googleplay/answer/2479637';

type Row = {
  title: string;
  description: string;
  onPress: () => void;
};

async function openOfficial(url: string, fallback: string, setMessage: (value: string) => void) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      setMessage(fallback);
      return;
    }
    await Linking.openURL(url);
  } catch {
    setMessage(fallback);
  }
}

export default function AssinaturaScreen() {
  const signedIn = useSessionUserId() !== null;
  const access = useAccountPlan();
  const plan = signedIn ? access.plan : 'free';
  const snapshot = getSubscriptionSnapshot();
  const [message, setMessage] = useState('');
  const storeReady = snapshot.availability === 'store_ready';

  const rows: Row[] = [
    {
      title: 'GERENCIAR ASSINATURA',
      description: 'Consulte e gerencie sua assinatura na plataforma em que realizou a compra.',
      onPress: () => {
        if (!storeReady) {
          setMessage('O gerenciamento pela loja estará disponível quando as assinaturas forem ativadas. Canais oficiais: App Store e Google Play.');
          return;
        }
        const url = Platform.OS === 'android' ? GOOGLE_SUBSCRIPTIONS : APPLE_SUBSCRIPTIONS;
        void openOfficial(url, 'Abra as assinaturas na App Store ou no Google Play da conta usada na compra.', setMessage);
      },
    },
    {
      title: 'RESTAURAR COMPRA',
      description: 'Recupere o acesso de uma assinatura válida.',
      onPress: () => {
        void restorePremiumPurchases().then((result) => setMessage(result.message));
      },
    },
    {
      title: 'CANCELAR RENOVAÇÃO',
      description: 'Evite a próxima cobrança anual.',
      onPress: () => {
        if (!storeReady) {
          setMessage('O cancelamento da renovação será feito na loja de origem, quando houver assinatura ativa.');
          return;
        }
        const url = Platform.OS === 'android' ? GOOGLE_SUBSCRIPTIONS : APPLE_SUBSCRIPTIONS;
        void openOfficial(url, 'Cancele a renovação nas assinaturas da App Store ou do Google Play.', setMessage);
      },
    },
    {
      title: 'SOLICITAR REEMBOLSO',
      description: 'Consulte as opções de reembolso da plataforma em que realizou a compra.',
      onPress: () => {
        if (Platform.OS === 'ios') {
          void openOfficial(APPLE_REFUND, 'Use reportaproblem.apple.com para solicitar reembolso na App Store.', setMessage);
          return;
        }
        if (Platform.OS === 'android') {
          void openOfficial(GOOGLE_REFUND, 'Use a Ajuda do Google Play para solicitar reembolso.', setMessage);
          return;
        }
        setMessage(
          'Reembolsos: App Store (reportaproblem.apple.com) ou Ajuda do Google Play. A aprovação depende da loja. Assinaturas do UTime ainda não estão ativas.',
        );
      },
    },
  ];

  return (
    <LegalScreen title="ASSINATURA">
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <PremiumCrownIcon size={12} />
          <Text style={styles.heroBadgeText}>UTIME PREMIUM</Text>
        </View>
        <Text style={styles.price}>{snapshot.product.priceLabel} / ano</Text>
        <Text style={styles.cadence}>Uma cobrança anual.</Text>
        {plan === 'premium' ? (
          <Text style={styles.active}>
            Seu acesso Premium está ativo. Enquanto não houver assinatura de loja vinculada a esta conta, não há cobrança, vencimento anual nem cancelamento de renovação para gerenciar aqui.
          </Text>
        ) : plan === 'unknown' ? (
          <Text style={styles.active}>Confirmando seu plano…</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push((signedIn ? '/premium?voltar=/assinatura' : '/preview-premium') as Href)}
            style={styles.offer}>
            <Text style={styles.offerLabel}>Ver UTime Premium</Text>
          </Pressable>
        )}
      </View>

      {snapshot.availability === 'coming_soon' ? (
        <Text style={styles.pending}>{snapshot.message}</Text>
      ) : null}

      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable key={row.title} accessibilityRole="button" onPress={row.onPress} style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowText}>{row.description}</Text>
            </View>
            <PremiumChevronIcon />
          </Pressable>
        ))}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.footnote}>
        Cancelar a renovação não gera automaticamente um reembolso. Seus direitos legais permanecem garantidos.
      </Text>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: '#121212',
    padding: 16,
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBadgeText: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  price: {
    marginTop: 10,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 28,
  },
  cadence: {
    marginTop: 4,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  active: {
    marginTop: 12,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 19,
  },
  offer: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.champagne,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  offerLabel: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  pending: {
    marginTop: 14,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 19,
  },
  list: { marginTop: 16, gap: 10 },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.lineSoft,
    backgroundColor: '#101010',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCopy: { flex: 1 },
  rowTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.7,
  },
  rowText: {
    marginTop: 4,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 17,
  },
  message: {
    marginTop: 14,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    marginTop: 18,
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 17,
  },
});
