import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  PremiumBackIcon,
  PremiumBarsIcon,
  PremiumCrownIcon,
  PremiumLockIcon,
  PremiumPeopleIcon,
  PremiumTargetIcon,
} from '@/components/premium-icons';
import { fonts, goldFill, ui } from '@/constants/theme';
import type { JourneyId } from '@/lib/profile';
import { getSubscriptionSnapshot, startPremiumPurchase } from '@/lib/subscription';

const page = '#050505';
const card = '#121212';
const cardLine = 'rgba(232, 201, 155, 0.16)';

type Props = {
  journey: JourneyId | null;
  onBack: () => void;
};

function ProgressMini() {
  const bars = [10, 16, 13, 22, 28];
  return (
    <View style={styles.miniChart} accessibilityElementsHidden>
      {bars.map((height, index) => (
        <View key={index} style={[styles.miniBar, { height, opacity: 0.45 + index * 0.12 }]} />
      ))}
    </View>
  );
}

function RankingMini() {
  const rows = [
    { place: '1', width: 42, gold: true },
    { place: '2', width: 30, gold: false },
    { place: '3', width: 22, gold: false },
  ];
  return (
    <View style={styles.rankMini} accessibilityElementsHidden>
      {rows.map((row) => (
        <View key={row.place} style={styles.rankRow}>
          <Text style={[styles.rankPlace, row.gold && styles.rankPlaceGold]}>{row.place}</Text>
          {row.gold ? <PremiumCrownIcon size={9} /> : <View style={styles.rankGap} />}
          <View style={[styles.rankBar, { width: row.width }, row.gold ? styles.rankBarGold : styles.rankBarMute]} />
        </View>
      ))}
    </View>
  );
}

function ChallengesMini({ journey }: { journey: JourneyId | null }) {
  const body =
    journey === 'womantime'
      ? require('@/assets/pillars/corpo-womantime.png')
      : journey === 'metime'
        ? require('@/assets/pillars/corpo-mantime.png')
        : require('@/assets/pillars/mente.png');
  const mind = require('@/assets/pillars/mente.png');
  const spirit = require('@/assets/pillars/espirito.png');
  return (
    <View style={styles.pillarsMini} accessibilityElementsHidden>
      {[body, mind, spirit].map((source, index) => (
        <View key={index} style={styles.pillarCell}>
          <Image source={source} style={styles.pillarImage} contentFit="contain" />
        </View>
      ))}
    </View>
  );
}

function BenefitCard({
  title,
  description,
  icon,
  visual,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  visual: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWell}>{icon}</View>
      <View style={styles.cardRule} />
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{description}</Text>
      </View>
      <View style={styles.cardVisual}>{visual}</View>
    </View>
  );
}

export function PremiumExperience({ journey, onBack }: Props) {
  const { width, height } = useWindowDimensions();
  const compact = height < 740 || width < 360;
  const snapshot = useMemo(() => getSubscriptionSnapshot(), []);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const frameWidth = Math.min(width, width >= 840 ? 430 : width);

  async function onPurchase() {
    if (pending) {
      return;
    }
    setPending(true);
    const result = await startPremiumPurchase();
    setMessage(result.message);
    setPending(false);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.glow} />
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.frame, { maxWidth: frameWidth, paddingHorizontal: compact ? 18 : 22 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={styles.backHit}>
              <PremiumBackIcon size={22} />
            </Pressable>
            <View style={styles.badge}>
              <PremiumCrownIcon size={12} />
              <Text style={styles.badgeText}>PREMIUM</Text>
            </View>
            <View style={styles.backHit} />
          </View>

          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
            EVOLUA SEUS <Text style={styles.titleGold}>HÁBITOS</Text>
            {'\n'}TODOS OS DIAS
          </Text>
          <Text style={[styles.lead, compact && styles.leadCompact]}>
            Desbloqueie recursos para acompanhar hábitos, manter constância e evoluir com mais foco.
          </Text>

          <View style={[styles.cards, compact && styles.cardsCompact]}>
            <BenefitCard
              title="PROGRESSO COMPLETO"
              description="Acompanhe seus hábitos na semana, no mês e no ano."
              icon={<PremiumBarsIcon size={compact ? 16 : 18} />}
              visual={<ProgressMini />}
            />
            <BenefitCard
              title="CÍRCULO"
              description="Veja seu ranking geral e entre amigos."
              icon={<PremiumPeopleIcon size={compact ? 16 : 18} />}
              visual={<RankingMini />}
            />
            <BenefitCard
              title="DESAFIOS"
              description="Crie desafios pessoais nos 3 pilares: Corpo, Mente e Espírito."
              icon={<PremiumTargetIcon size={compact ? 16 : 18} />}
              visual={<ChallengesMini journey={journey} />}
            />
          </View>

          <View style={[styles.priceCard, compact && styles.priceCardCompact]}>
            <Text style={styles.priceLeft}>PLANO ANUAL</Text>
            <View style={styles.priceRule} />
            <Text style={[styles.priceValue, compact && styles.priceValueCompact]}>{snapshot.product.priceLabel}</Text>
            <View style={styles.priceRule} />
            <Text style={styles.priceRight}>{`UMA\nCOBRANÇA\nPOR ANO`}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tornar-me Premium"
            disabled={pending}
            onPress={() => {
              void onPurchase();
            }}
            style={({ pressed }) => [styles.cta, (pressed || pending) && styles.ctaPressed]}>
            <Text style={styles.ctaLabel}>TORNAR-ME PREMIUM</Text>
          </Pressable>

          <View style={styles.secureRow}>
            <PremiumLockIcon size={11} />
            <Text style={styles.secureText}>
              {snapshot.availability === 'coming_soon'
                ? 'Pagamento pela App Store ou Google Play.\nAs assinaturas do UTime Premium estarão disponíveis em breve.\nCancele a renovação quando quiser.'
                : `Pagamento pela ${snapshot.storeLabel}.\nRenovação anual automática. Cancele a renovação quando quiser.`}
            </Text>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.footerSpacer} />
          <View style={styles.footer}>
            {(
              [
                ['Termos de uso', '/termos'],
                ['Política de privacidade', '/privacidade'],
                ['Assinatura', '/assinatura'],
                ['Suporte', '/suporte'],
              ] as const
            ).map(([label, href], index) => (
              <View key={href} style={styles.footerItem}>
                {index > 0 ? <Text style={styles.footerSep}>|</Text> : null}
                <Pressable accessibilityRole="link" onPress={() => router.push(href as Href)}>
                  <Text style={styles.footerLink}>{label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: page },
  glow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 220,
    height: 180,
    borderRadius: 120,
    backgroundColor: 'rgba(232, 201, 155, 0.12)',
    transform: [{ rotate: '18deg' }],
  },
  safe: { flex: 1 },
  frame: { flexGrow: 1, alignSelf: 'center', width: '100%', paddingBottom: 10 },
  topBar: {
    marginTop: 2,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backHit: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  badge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.champagne,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  badgeText: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 18,
    textAlign: 'center',
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.6,
  },
  titleCompact: { marginTop: 12, fontSize: 30, lineHeight: 34 },
  titleGold: { color: ui.champagne },
  lead: {
    marginTop: 10,
    textAlign: 'center',
    color: ui.muted,
    fontFamily: fonts.textLight,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  leadCompact: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  cards: { marginTop: 18, gap: 10 },
  cardsCompact: { marginTop: 12, gap: 8 },
  card: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cardLine,
    backgroundColor: card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cardLine,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0B0B',
  },
  cardRule: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(243,239,232,0.08)' },
  cardCopy: { flex: 1, paddingRight: 4 },
  cardTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  cardText: {
    marginTop: 3,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  cardVisual: { width: 72, alignItems: 'flex-end', justifyContent: 'center' },
  miniChart: { height: 32, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  miniBar: { width: 6, borderRadius: 3, backgroundColor: ui.champagne },
  rankMini: { gap: 3, width: 68 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rankPlace: { width: 10, color: ui.muted, fontFamily: fonts.display, fontSize: 10 },
  rankPlaceGold: { color: ui.champagne },
  rankGap: { width: 9 },
  rankBar: { height: 5, borderRadius: 999 },
  rankBarGold: { backgroundColor: ui.champagne },
  rankBarMute: { backgroundColor: 'rgba(243,239,232,0.22)' },
  pillarsMini: { flexDirection: 'row', gap: 4 },
  pillarCell: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: cardLine,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillarImage: { width: 16, height: 16 },
  priceCard: {
    marginTop: 16,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ui.champagne,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
  },
  priceCardCompact: { marginTop: 12, minHeight: 52 },
  priceLeft: {
    width: 72,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  priceRule: { width: 1, height: 28, backgroundColor: 'rgba(232,201,155,0.35)' },
  priceValue: {
    flex: 1,
    textAlign: 'center',
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 0.4,
  },
  priceValueCompact: { fontSize: 22 },
  priceRight: {
    width: 78,
    textAlign: 'right',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
  },
  cta: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...goldFill,
  },
  ctaPressed: { opacity: 0.88 },
  ctaLabel: {
    color: ui.ink,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
  },
  secureRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  secureText: {
    flexShrink: 1,
    textAlign: 'center',
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 15,
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 17,
  },
  footerSpacer: { flexGrow: 1, minHeight: 16 },
  footer: {
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerSep: { marginHorizontal: 6, color: ui.faint, fontSize: 11 },
  footerLink: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
