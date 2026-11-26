import { StyleSheet, Text } from 'react-native';

import { LegalScreen, LegalSection } from '@/components/legal-screen';
import { fonts, ui } from '@/constants/theme';

export default function TermosScreen() {
  return (
    <LegalScreen title="TERMOS DE USO">
      <Text style={styles.notice}>
        Textos iniciais para estruturação. Não constituem documento jurídico definitivo. Versão provisória — validação jurídica pendente.
      </Text>

      <LegalSection title="SOBRE O UTIME">
        O UTime foi desenvolvido para ajudar você a construir hábitos, fortalecer a disciplina e acompanhar sua evolução nos três pilares: Corpo, Mente e Espírito.
      </LegalSection>

      <LegalSection title="SUA CONTA">
        Mantenha suas informações atualizadas e proteja seus dados de acesso. Sua conta é pessoal, e a utilização do aplicativo deve respeitar os direitos dos demais usuários.
      </LegalSection>

      <LegalSection title="PLANO GRATUITO">
        O plano gratuito permite utilizar os recursos essenciais de organização e acompanhamento de hábitos disponibilizados pelo UTime.
      </LegalSection>

      <LegalSection title="PLANO PREMIUM">
        O UTime Premium oferece acesso ao Progresso semanal, mensal e anual, ao Círculo, incluindo ranking geral e entre amigos, e aos Desafios pessoais. As condições comerciais da assinatura serão apresentadas antes da confirmação da compra.
      </LegalSection>

      <LegalSection title="ASSINATURAS E CANCELAMENTOS">
        As assinaturas serão adquiridas pela loja de aplicativos correspondente. O gerenciamento da renovação e as solicitações relacionadas à compra poderão ser realizados pelos canais indicados na seção Assinatura. O cancelamento da renovação não implica automaticamente o reembolso do período já contratado, respeitados os direitos previstos na legislação aplicável.
      </LegalSection>

      <LegalSection title="USO RESPONSÁVEL">
        Utilize o UTime de maneira respeitosa, sem práticas fraudulentas, manipulação de rankings, exploração de vulnerabilidades ou violação dos direitos de outros usuários.
      </LegalSection>

      <LegalSection title="SAÚDE E BEM-ESTAR">
        O UTime é uma ferramenta de organização de hábitos e desenvolvimento pessoal. Não substitui orientação médica, psicológica, nutricional ou de outros profissionais especializados.
      </LegalSection>

      <LegalSection title="PROPRIEDADE INTELECTUAL">
        Os elementos visuais, textos, marcas e funcionalidades do UTime estão sujeitos aos direitos de propriedade intelectual aplicáveis.
      </LegalSection>

      <LegalSection title="SUPORTE">
        Em caso de dúvidas ou dificuldades, utilize os canais de atendimento disponíveis na seção Suporte.
      </LegalSection>

      <LegalSection title="VALIDAÇÃO JURÍDICA">
        Estrutura preparada para incluir identificação do responsável legal, dados empresariais aplicáveis, data de vigência, versão do documento, regras contratuais completas e canal oficial de atendimento — sem inventar CNPJ, endereço ou e-mail.
      </LegalSection>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: 4,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 18,
  },
});
