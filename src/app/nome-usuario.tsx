import { router } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ProfilePlanet } from '@/components/profile-planet';
import { fonts, ui } from '@/constants/theme';
import { checkHandle, loadOwnIdentity, saveHandle, type HandleStatus } from '@/lib/public-profile';
import { useRequireSession } from '@/lib/require-session';
import { handleIssue, handleIssueMessage, normalizeHandle } from '@/lib/username';

const page = '#050505';
const okGreen = '#3DDC97';
const takenRed = '#E06B6B';

function Mark({ name }: { name: 'back' | 'at' | 'info' | 'check' }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.nativeMark} />;
  }
  const stroke = {
    fill: 'none',
    stroke: name === 'check' ? okGreen : ui.champagneDeep,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'back') {
    return createElement(
      'svg',
      { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('path', { d: 'M14.5 6 8.5 12l6 6', ...stroke, stroke: ui.text }),
    );
  }
  if (name === 'at') {
    return createElement(
      'svg',
      { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('circle', { cx: 12, cy: 12, r: 3.1, ...stroke }),
      createElement('path', { d: 'M15.1 12v1.3a2.2 2.2 0 0 0 4.2.8', ...stroke }),
      createElement('circle', { cx: 12, cy: 12, r: 7.2, ...stroke }),
    );
  }
  if (name === 'info') {
    return createElement(
      'svg',
      { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true },
      createElement('circle', { cx: 12, cy: 12, r: 8, ...stroke, stroke: ui.muted }),
      createElement('path', { d: 'M12 11v5', ...stroke, stroke: ui.muted }),
      createElement('circle', { cx: 12, cy: 8, r: 0.8, fill: ui.muted }),
    );
  }
  return createElement(
    'svg',
    { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement('circle', { cx: 12, cy: 12, r: 8, fill: 'rgba(61, 220, 151, 0.16)', stroke: okGreen, strokeWidth: 1.4 }),
    createElement('path', { d: 'M8.2 12.2 10.8 14.8 15.8 9.4', ...stroke }),
  );
}

export default function UsernameScreen() {
  const signedIn = useRequireSession();
  const [current, setCurrent] = useState('');
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);
  const [remote, setRemote] = useState<{ value: string; status: HandleStatus } | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const issue = handleIssue(draft);
  const normalized = normalizeHandle(draft);
  const localStatus: HandleStatus | 'idle' | null = !ready
    ? 'idle'
    : issue
      ? draft.trim()
        ? 'invalid'
        : 'idle'
      : normalized === current && current
        ? 'current'
        : null;
  const status: HandleStatus | 'idle' = localStatus ?? (remote?.value === normalized ? remote.status : 'idle');
  const waiting = ready && localStatus === null && remote?.value !== normalized;

  useEffect(() => {
    let active = true;
    loadOwnIdentity().then((identity) => {
      if (!active) {
        return;
      }
      setCurrent(identity.handle);
      setDraft(identity.handle);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || localStatus !== null) {
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      void checkHandle(draft).then((next) => {
        if (active) {
          setRemote({ value: normalizeHandle(draft), status: next });
        }
      });
    }, 450);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [current, draft, localStatus, ready]);

  async function save() {
    if (saving || status !== 'available') {
      return;
    }
    setSaving(true);
    setNotice('');
    const saved = await saveHandle(draft);
    setSaving(false);
    if (!saved.ok) {
      setNotice(saved.message);
      if (saved.message.includes('já está em uso')) {
        setRemote({ value: normalizeHandle(draft), status: 'taken' });
      }
      return;
    }
    router.back();
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const message = waiting
    ? 'Verificando disponibilidade…'
    : status === 'available'
      ? 'Nome de usuário disponível!'
      : status === 'taken'
        ? 'Este nome de usuário já está em uso.'
        : status === 'current'
          ? 'Este já é o seu nome de usuário.'
          : status === 'error'
            ? 'Não foi possível verificar a disponibilidade agora.'
            : status === 'invalid' && issue
              ? handleIssueMessage(issue)
              : ready
                ? ''
                : 'Carregando…';
  const tone = status === 'available' ? 'ok' : status === 'taken' || status === 'invalid' || status === 'error' ? 'bad' : 'muted';
  const canSave = status === 'available' && !saving;

  return (
    <AppScreen width="narrow" showNav={false} backgroundColor={page} backdrop={<ProfilePlanet placement="low" />}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.side}>
          <Mark name="back" />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Nome de usuário
        </Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={() => void save()} style={styles.side}>
          <Text style={[styles.save, !canSave && styles.saveOff]}>{saving ? 'Salvando' : 'Salvar'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.atWell}>
          <Mark name="at" />
        </View>
        <Text style={styles.cardTitle}>Escolha seu nome de usuário</Text>
        <Text style={styles.cardCopy}>Este será seu identificador público no UTime. Com ele, outras pessoas podem te encontrar e adicionar como amigo.</Text>
        <View style={[styles.field, status === 'available' && styles.fieldOk]}>
          <Text style={styles.prefix}>@</Text>
          <TextInput
            value={draft}
            onChangeText={(value) => {
              setDraft(value.replace(/\s/g, ''));
              setNotice('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
            maxLength={24}
            placeholder="seunome"
            placeholderTextColor={ui.faint}
            style={styles.input}
          />
          {status === 'available' ? <Mark name="check" /> : null}
        </View>
        {message ? <Text style={[styles.message, tone === 'ok' && styles.messageOk, tone === 'bad' && styles.messageBad]}>{message}</Text> : null}
        {notice ? <Text style={[styles.message, styles.messageBad]}>{notice}</Text> : null}
        <View style={styles.rules}>
          <View style={styles.ruleTitle}>
            <Mark name="info" />
            <Text style={styles.ruleLabel}>De 3 a 20 caracteres</Text>
          </View>
          <Text style={styles.rule}>Apenas letras, números, ponto ou underline.</Text>
          <Text style={styles.rule}>Não pode ter espaços.</Text>
          <Text style={styles.rule}>Precisa ser único no UTime.</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  nativeMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.champagneDeep },
  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 72,
    minHeight: 36,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  save: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.4,
    textAlign: 'right',
  },
  saveOff: { color: ui.faint },
  card: {
    marginTop: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.28)',
    backgroundColor: 'rgba(12, 12, 12, 0.88)',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
  },
  atWell: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.7)',
    backgroundColor: 'rgba(196, 165, 116, 0.08)',
  },
  cardTitle: {
    marginTop: 18,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cardCopy: {
    marginTop: 10,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  field: {
    marginTop: 22,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.45)',
    backgroundColor: 'rgba(8, 8, 8, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  fieldOk: {
    borderColor: 'rgba(232, 201, 155, 0.85)',
  },
  prefix: {
    color: ui.muted,
    fontFamily: fonts.textMedium,
    fontSize: 16,
  },
  input: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 16,
    paddingVertical: 12,
  },
  message: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  messageOk: { color: okGreen },
  messageBad: { color: takenRed },
  rules: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    gap: 6,
  },
  ruleTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleLabel: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 13,
  },
  rule: {
    marginLeft: 24,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
