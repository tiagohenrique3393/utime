import { StyleSheet, Text, View } from 'react-native';

import { LegalScreen, LegalSection } from '@/components/legal-screen';
import { PremiumShieldIcon } from '@/components/premium-icons';
import { fonts, ui } from '@/constants/theme';

export default function PrivacidadeScreen() {
  return (
    <LegalScreen
      title="POLÍTICA DE PRIVACIDADE"
      eyebrow={
        <View style={styles.hero}>
          <PremiumShieldIcon size={20} />
          <Text style={styles.heroTitle}>SEUS DADOS, SUA PRIVACIDADE.</Text>
        </View>
      }>
      <Text style={styles.notice}>
        Estrutura inicial. A política definitiva dependerá do levantamento real de dados, fornecedores e bases legais. Não inventa práticas inexistentes.
      </Text>

      <LegalSection title="DADOS UTILIZADOS">
        O UTime utiliza informações necessárias para disponibilizar sua conta e suas funcionalidades, incluindo dados de cadastro, hábitos, progresso, desafios e informações relacionadas à assinatura, conforme os recursos utilizados.
      </LegalSection>

      <LegalSection title="FINALIDADE">
        As informações são utilizadas para disponibilizar as funcionalidades do aplicativo, personalizar sua experiência, acompanhar sua evolução e contribuir para a segurança e o funcionamento do serviço.
      </LegalSection>

      <LegalSection title="COMPARTILHAMENTO DE DADOS">
        O UTime poderá utilizar fornecedores de tecnologia necessários para autenticação, armazenamento, funcionamento do aplicativo e gerenciamento das assinaturas. O tratamento dessas informações deverá ser descrito de forma transparente na política definitiva.
      </LegalSection>

      <LegalSection title="CÍRCULO E RANKING">
        A participação no Círculo poderá apresentar determinadas informações do perfil e da pontuação aos demais participantes, de acordo com as regras de privacidade do aplicativo.
      </LegalSection>

      <LegalSection title="PAGAMENTOS">
        As compras realizadas pelas lojas serão processadas pelas respectivas plataformas. O UTime poderá receber informações relacionadas ao status da assinatura para disponibilizar os recursos Premium.
      </LegalSection>

      <LegalSection title="SEGURANÇA">
        O UTime adota medidas técnicas e organizacionais destinadas à proteção das informações dos usuários. Nenhuma plataforma garante segurança absoluta.
      </LegalSection>

      <LegalSection title="SEUS DIREITOS">
        Você poderá solicitar acesso, correção, exclusão e demais direitos relacionados aos seus dados pessoais, conforme a legislação aplicável.
      </LegalSection>

      <LegalSection title="EXCLUSÃO DE CONTA">
        A exclusão da conta poderá ser solicitada pelo Perfil, conforme o procedimento existente no aplicativo. A exclusão da conta não cancela necessariamente uma assinatura ativa na loja de aplicativos.
      </LegalSection>

      <LegalSection title="CONTATO">
        Para dúvidas ou solicitações relacionadas à privacidade, utilize o canal oficial disponibilizado pelo UTime na seção Suporte.
      </LegalSection>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.8,
  },
  notice: {
    marginTop: 10,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 18,
  },
});
