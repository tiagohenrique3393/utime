import { router, useLocalSearchParams, type Href } from 'expo-router';
import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import {
  canContinueSurvey,
  clipComment,
  COMMENT_LIMIT,
  deletionMessages,
  exitReasons,
  phraseMatches,
  type ExitReason,
} from '@/lib/account-deletion';
import { deleteOwnAccount, getAccountAccess, sessionSignInIsRecent, type AccountAccess } from '@/lib/account-deletion-api';
import { clearExitDraft, markAccountDeletionReturn, readExitDraft, writeExitDraft } from '@/lib/account-deletion-draft';
import { getSessionUserId, signInWithGoogle } from '@/lib/accounts';

const page = '#050505';
const deleteRed = '#C45656';

const removedItems = [
  { icon: 'habits', label: 'Todos os hábitos, rotinas, histórico e progresso.' },
  { icon: 'star', label: 'Constância, conquistas e estatísticas.' },
  { icon: 'people', label: 'Participação no U Time Circle e relações de amizade.' },
  { icon: 'photo', label: 'Foto de perfil e arquivos pessoais.' },
  { icon: 'user', label: 'Dados pessoais e identificador público.' },
  { icon: 'key', label: 'Conta de acesso ao UTime.' },
] as const;

function svg(size: number, color: string, ...children: ReactNode[]) {
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, fill: 'none' },
    ...children.map((child) => child),
  );
}

function stroke(color: string) {
  return {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
}

function Glyph({ name, size = 18, color = ui.champagneDeep }: { name: string; size?: number; color?: string }) {
  if (Platform.OS !== 'web') {
    return <View style={[styles.nativeGlyph, { backgroundColor: color }]} />;
  }
  const pen = stroke(color);
  if (name === 'trash') {
    return svg(
      size,
      color,
      createElement('path', { d: 'M5 7.5h14', ...pen }),
      createElement('path', { d: 'M9.2 7.4V5.6h5.6v1.8', ...pen }),
      createElement('path', { d: 'M7.2 7.5 8.1 19h7.8l.9-11.5', ...pen }),
      createElement('path', { d: 'M10.2 10.6v5.2', ...pen }),
      createElement('path', { d: 'M13.8 10.6v5.2', ...pen }),
    );
  }
  if (name === 'habits') {
    return svg(
      size,
      color,
      createElement('path', { d: 'M8 6.5h11', ...pen }),
      createElement('path', { d: 'M8 12h11', ...pen }),
      createElement('path', { d: 'M8 17.5h11', ...pen }),
      createElement('path', { d: 'M4.8 6.5h.2', ...pen }),
      createElement('path', { d: 'M4.8 12h.2', ...pen }),
      createElement('path', { d: 'M4.8 17.5h.2', ...pen }),
    );
  }
  if (name === 'star') {
    return svg(size, color, createElement('path', { d: 'M12 4.2 14.2 9l5.3.6-4 3.6 1.1 5.2L12 15.8 7.4 18.4 8.5 13.2 4.5 9.6 9.8 9 12 4.2Z', ...pen }));
  }
  if (name === 'people') {
    return svg(
      size,
      color,
      createElement('circle', { cx: 9, cy: 9, r: 2.2, ...pen }),
      createElement('circle', { cx: 16, cy: 9.5, r: 1.8, ...pen }),
      createElement('path', { d: 'M4.8 17.2c.6-2.2 2.2-3.3 4.2-3.3s3.6 1.1 4.2 3.3', ...pen }),
      createElement('path', { d: 'M13.2 14.2c1.4-.3 2.8.2 3.8 1.6', ...pen }),
    );
  }
  if (name === 'photo') {
    return svg(
      size,
      color,
      createElement('rect', { x: 4, y: 5.5, width: 16, height: 13, rx: 2, ...pen }),
      createElement('circle', { cx: 9, cy: 10, r: 1.4, ...pen }),
      createElement('path', { d: 'M4.8 16.2 9 12.6l3.2 2.8 2.2-1.8 4.8 3.4', ...pen }),
    );
  }
  if (name === 'user') {
    return svg(
      size,
      color,
      createElement('circle', { cx: 12, cy: 8.2, r: 2.8, ...pen }),
      createElement('path', { d: 'M6 18.2c.8-2.8 2.8-4.2 6-4.2s5.2 1.4 6 4.2', ...pen }),
    );
  }
  return svg(
    size,
    color,
    createElement('circle', { cx: 8, cy: 10, r: 2.2, ...pen }),
    createElement('path', { d: 'M10.2 10h7.2v3.2', ...pen }),
    createElement('path', { d: 'M14.6 10v2.2', ...pen }),
  );
}

function leaveToProfile() {
  clearExitDraft();
  if (getSessionUserId()) {
    router.replace('/perfil' as Href);
    return;
  }
  router.replace('/' as Href);
}

export default function DeleteAccountScreen() {
  const params = useLocalSearchParams<{ retorno?: string | string[] }>();
  const retorno = Array.isArray(params.retorno) ? params.retorno[0] : params.retorno;
  const draft = readExitDraft();
  const signedIn = getSessionUserId() !== null;
  const [step, setStep] = useState<'survey' | 'confirm'>(retorno === 'google' ? 'confirm' : 'survey');
  const [reason, setReason] = useState<ExitReason | null>(draft.reason);
  const [comment, setComment] = useState(draft.comment);
  const [googleFresh, setGoogleFresh] = useState(retorno === 'google');

  useEffect(() => {
    if (step !== 'confirm' || !googleFresh) {
      return;
    }
    let active = true;
    sessionSignInIsRecent()
      .then((value) => {
        if (active) {
          setGoogleFresh(value.recent);
        }
      })
      .catch(() => {
        if (active) {
          setGoogleFresh(false);
        }
      });
    return () => {
      active = false;
    };
  }, [step, googleFresh]);

  function choose(next: ExitReason) {
    const value = reason === next ? null : next;
    setReason(value);
    writeExitDraft({ reason: value, comment });
  }

  function editComment(value: string) {
    const next = clipComment(value);
    setComment(next);
    writeExitDraft({ reason, comment: next });
  }

  if (!signedIn) {
    return <PublicStep />;
  }

  if (step === 'confirm') {
    return (
      <ConfirmStep
        googleFresh={googleFresh}
        onCancel={leaveToProfile}
        onFinished={() => router.replace('/entrar' as Href)}
        onGoogle={() => setGoogleFresh(true)}
      />
    );
  }

  return (
    <SurveyStep
      reason={reason}
      comment={comment}
      onChoose={choose}
      onComment={editComment}
      onContinue={() => {
        if (!canContinueSurvey(reason, comment)) {
          return;
        }
        setStep('confirm');
      }}
      onBack={leaveToProfile}
    />
  );
}

function SurveyStep({
  reason,
  comment,
  onChoose,
  onComment,
  onContinue,
  onBack,
}: {
  reason: ExitReason | null;
  comment: string;
  onChoose: (reason: ExitReason) => void;
  onComment: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <AppScreen width="narrow" showNav={false} backgroundColor={page}>
      <Text accessibilityRole="header" style={styles.title}>
        Antes de ir...
      </Text>
      <Text style={styles.question}>Por que deseja excluir sua conta?</Text>
      <Text style={styles.body}>Sua opinião nos ajuda a melhorar o UTime. A resposta é opcional.</Text>

      <View style={styles.card}>
        {exitReasons.map((item, index) => {
          const selected = reason === item.id;
          return (
            <View key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChoose(item.id)}
                style={styles.option}>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.optionLabel}>{item.label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {reason === 'other' ? (
        <View style={styles.noteBlock}>
          <TextInput
            value={comment}
            onChangeText={onComment}
            multiline
            textAlignVertical="top"
            placeholder="Conte-nos detalhadamente o motivo da sua decisão, se desejar."
            placeholderTextColor={ui.faint}
            style={styles.note}
          />
          <Text style={styles.counter}>
            {Array.from(comment).length} / {COMMENT_LIMIT}
          </Text>
        </View>
      ) : null}

      <Pressable accessibilityRole="button" onPress={onContinue} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Text style={styles.primaryLabel}>Continuar para exclusão</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.quiet}>
        <Text style={styles.quietLabel}>Voltar ao perfil</Text>
      </Pressable>
    </AppScreen>
  );
}

function ConfirmStep({
  googleFresh,
  onCancel,
  onFinished,
  onGoogle,
}: {
  googleFresh: boolean;
  onCancel: () => void;
  onFinished: () => void;
  onGoogle: () => void;
}) {
  const [access, setAccess] = useState<AccountAccess | null>(null);
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    getAccountAccess()
      .then((value) => {
        if (active) {
          setAccess(value);
        }
      })
      .catch(() => {
        if (active) {
          setAccess({ email: '', password: true, google: false });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const needsPassword = !access || access.password || !access.google;
  const ready = phraseMatches(phrase) && !busy;

  async function confirmGoogle() {
    if (busyRef.current) {
      return;
    }
    setNotice('');
    markAccountDeletionReturn();
    const result = await signInWithGoogle();
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    if (result.next === 'app') {
      const recent = await sessionSignInIsRecent();
      if (recent.recent) {
        onGoogle();
      } else {
        setNotice('Confirme com o Google novamente. Sua conta não foi excluída.');
      }
    }
  }

  async function destroy() {
    if (busyRef.current || !phraseMatches(phrase)) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    const draft = readExitDraft();
    try {
      const result = await deleteOwnAccount({
        reason: draft.reason,
        comment: draft.comment,
        password,
        googleFresh,
      });
      if (!result.ok) {
        setNotice(result.message);
        busyRef.current = false;
        setBusy(false);
        return;
      }
      onFinished();
    } catch {
      setNotice(deletionMessages.unknown);
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <AppScreen width="narrow" showNav={false} backgroundColor={page}>
      <Text accessibilityRole="header" style={styles.title}>
        Excluir conta
      </Text>
      <View style={styles.hero}>
        <Glyph name="trash" size={28} color={deleteRed} />
      </View>
      <Text style={styles.question}>Excluir sua conta?</Text>
      <Text style={styles.body}>
        A exclusão da conta é definitiva. Seus dados serão apagados e não poderão ser recuperados, exceto aqueles que precisem ser mantidos por obrigação legal.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que será excluído</Text>
        {removedItems.map((item) => (
          <View key={item.icon} style={styles.removedRow}>
            <View style={styles.iconWell}>
              <Glyph name={item.icon} size={16} />
            </View>
            <Text style={styles.removedLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.warning}>A exclusão não cancela assinatura externa.</Text>
        <Text style={styles.bodyTight}>
          Se houver uma assinatura contratada fora do UTime, ela continua na loja em que foi feita. Excluir a conta não cancela essa cobrança automaticamente.
        </Text>
      </View>

      <Text style={styles.fieldLabel}>Digite EXCLUIR para confirmar</Text>
      <TextInput
        value={phrase}
        onChangeText={setPhrase}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!busy}
        placeholder="EXCLUIR"
        placeholderTextColor={ui.faint}
        style={styles.input}
      />

      {needsPassword ? (
        <>
          <Text style={styles.fieldLabel}>Senha da conta</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!busy}
            textContentType="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            placeholderTextColor={ui.faint}
            style={styles.input}
          />
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={confirmGoogle}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed, busy && styles.pressed]}>
          <Text style={styles.secondaryLabel}>{googleFresh ? 'Google confirmado agora' : 'Confirmar com Google'}</Text>
        </Pressable>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryLabel}>Cancelar</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={destroy}
        style={({ pressed }) => [styles.destroy, (!ready || pressed) && styles.pressed]}>
        <Text style={styles.destroyLabel}>{busy ? 'Excluindo conta' : 'Excluir conta definitivamente'}</Text>
      </Pressable>
    </AppScreen>
  );
}

function PublicStep() {
  return (
    <AppScreen width="narrow" showNav={false} backgroundColor={page}>
      <Text style={styles.eyebrow}>UTime</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Excluir conta
      </Text>
      <Text style={styles.body}>
        Esta página permanente permite solicitar a exclusão da sua conta, mesmo sem o aplicativo instalado. O endereço é https://utime.app.br/excluir-conta.
      </Text>
      <Text style={styles.body}>
        Depois de entrar, você pode informar um motivo ou seguir sem responder. Em seguida confirma sua identidade e a exclusão definitiva. Não é preciso falar com o suporte.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que será excluído</Text>
        {removedItems.map((item) => (
          <Text key={item.icon} style={styles.publicItem}>
            {item.label}
          </Text>
        ))}
      </View>
      <Text style={styles.body}>
        A exclusão apaga a conta de acesso e os dados pessoais associados. O catálogo geral do UTime permanece. Se houver uma assinatura contratada fora do UTime, excluir a conta não cancela essa cobrança automaticamente.
      </Text>
      <Text style={styles.body}>
        A pesquisa de saída, se você responder, guarda somente a categoria, a data e a versão do formulário. O comentário livre é opcional, tem os contatos reduzidos e não fica ligado ao seu nome, e-mail ou identificador. O texto livre é apagado em 90 dias e o registro some em 24 meses.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/entrar?retorno=excluir' as Href)}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Text style={styles.primaryLabel}>Entrar para excluir</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  question: {
    marginTop: 18,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyTight: {
    marginTop: 10,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    marginTop: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.22)',
    backgroundColor: 'rgba(17, 18, 20, 0.72)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: ui.lineSoft,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: ui.champagneDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: ui.champagne,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ui.champagne,
  },
  optionLabel: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
  },
  noteBlock: {
    marginTop: 14,
  },
  note: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: 'rgba(17, 18, 20, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  counter: {
    marginTop: 6,
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 12,
    textAlign: 'right',
  },
  hero: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    marginTop: 22,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(196, 86, 86, 0.4)',
    backgroundColor: 'rgba(196, 86, 86, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removedRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removedLabel: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  warning: {
    marginTop: 12,
    color: deleteRed,
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  publicItem: {
    marginBottom: 8,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: 'rgba(17, 18, 20, 0.72)',
    paddingHorizontal: 14,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  primary: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryLabel: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  secondary: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.textMedium,
    fontSize: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  destroy: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: deleteRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  destroyLabel: {
    color: '#1A0C0C',
    fontFamily: fonts.textMedium,
    fontSize: 14,
    letterSpacing: 1.1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  quiet: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietLabel: {
    color: ui.muted,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  notice: {
    marginTop: 14,
    color: deleteRed,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
  nativeGlyph: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
