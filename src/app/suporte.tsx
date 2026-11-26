import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LegalScreen } from '@/components/legal-screen';
import { PremiumChevronIcon, PremiumSupportIcon } from '@/components/premium-icons';
import { fonts, goldFill, ui } from '@/constants/theme';

const CATEGORIES = [
  'Minha conta',
  'Hábitos e progresso',
  'Assinatura Premium',
  'Reportar um problema',
  'Privacidade e dados',
  'Outras dúvidas',
] as const;

export default function SuporteScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  function requestHelp(category: string) {
    setSelected(category);
    setNotice(
      'O canal oficial de atendimento ainda não está configurado neste ambiente. A estrutura da solicitação fica pronta; informe o e-mail ou integração de suporte para ativar o envio.',
    );
  }

  return (
    <LegalScreen
      title="SUPORTE"
      eyebrow={
        <View style={styles.hero}>
          <PremiumSupportIcon size={22} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>COMO PODEMOS AJUDAR?</Text>
            <Text style={styles.heroText}>Estamos aqui para ajudar você na sua jornada.</Text>
          </View>
        </View>
      }>
      <View style={styles.list}>
        {CATEGORIES.map((category) => (
          <Pressable key={category} accessibilityRole="button" onPress={() => requestHelp(category)} style={[styles.row, selected === category && styles.rowOn]}>
            <Text style={styles.rowLabel}>{category}</Text>
            <PremiumChevronIcon />
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => requestHelp(selected || 'Outras dúvidas')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
        <Text style={styles.ctaLabel}>ENTRAR EM CONTATO</Text>
      </Pressable>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroCopy: { flex: 1 },
  heroTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.8,
  },
  heroText: {
    marginTop: 4,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  list: { marginTop: 8, gap: 8 },
  row: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.lineSoft,
    backgroundColor: '#101010',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowOn: { borderColor: ui.line },
  rowLabel: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 14,
  },
  cta: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...goldFill,
  },
  ctaPressed: { opacity: 0.9 },
  ctaLabel: {
    color: ui.ink,
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1,
  },
  notice: {
    marginTop: 14,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 19,
  },
});
