import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ProfilePlanet } from '@/components/profile-planet';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { loadOwnIdentity, saveBio } from '@/lib/public-profile';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

export default function SettingsScreen() {
  const signedIn = useRequireSession();
  const [bio, setBio] = useState('');
  const [bioReady, setBioReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    loadOwnIdentity().then((identity) => {
      if (!active) {
        return;
      }
      setBio(identity.bio);
      setBioReady(identity.bioReady);
    });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (saving) {
      return;
    }
    setSaving(true);
    setNotice('');
    const saved = await saveBio(bio);
    setSaving(false);
    setNotice(saved.ok ? 'Apresentação salva.' : saved.message);
    if (saved.ok) {
      setBio(saved.bio);
      setBioReady(true);
    }
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const userId = getSessionUserId();

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<ProfilePlanet />}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao perfil" onPress={() => router.back()}>
          <Text style={styles.back}>Voltar</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Configurações
        </Text>
      </View>
      <Text style={styles.lead}>Dados públicos da sua conta. E-mail, plano e modalidade continuam na aba Perfil.</Text>

      <Pressable accessibilityRole="button" onPress={() => router.push('/nome-usuario' as Href)} style={styles.row}>
        <Text style={styles.rowLabel}>Nome de usuário</Text>
        <Text style={styles.rowHint}>Escolher ou alterar o @</Text>
      </Pressable>

      {userId ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/perfil-publico?id=${userId}` as Href)} style={styles.row}>
          <Text style={styles.rowLabel}>Ver perfil público</Text>
          <Text style={styles.rowHint}>Como outras pessoas veem você</Text>
        </Pressable>
      ) : null}

      <View style={styles.bioCard}>
        <Text style={styles.rowLabel}>Biografia</Text>
        <Text style={styles.rowHint}>Até 160 caracteres. Aparece no perfil público.</Text>
        <TextInput
          value={bio}
          onChangeText={(value) => {
            setBio(value.slice(0, 160));
            setNotice('');
          }}
          editable={bioReady && !saving}
          multiline
          maxLength={160}
          placeholder={bioReady ? 'Escreva uma apresentação curta' : 'A biografia fica disponível depois do SQL do perfil'}
          placeholderTextColor={ui.faint}
          style={styles.input}
        />
        <Text style={styles.count}>{`${bio.trim().length}/160`}</Text>
        <Pressable accessibilityRole="button" disabled={!bioReady || saving} onPress={() => void save()} style={[styles.save, (!bioReady || saving) && styles.saveOff]}>
          <Text style={styles.saveLabel}>{saving ? 'Salvando' : 'Salvar biografia'}</Text>
        </Pressable>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  header: { gap: 8 },
  back: { color: ui.champagne, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: ui.text, fontFamily: fonts.display, fontSize: 32, letterSpacing: 0.8, textTransform: 'uppercase' },
  lead: { marginTop: 10, color: ui.muted, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  row: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.22)',
    backgroundColor: 'rgba(17, 18, 20, 0.78)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  rowHint: { marginTop: 4, color: ui.muted, fontFamily: fonts.text, fontSize: 13 },
  bioCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.22)',
    backgroundColor: 'rgba(17, 18, 20, 0.78)',
    padding: 16,
  },
  input: {
    marginTop: 12,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.28)',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
    padding: 12,
    textAlignVertical: 'top',
  },
  count: { marginTop: 6, color: ui.faint, fontFamily: fonts.text, fontSize: 12, textAlign: 'right' },
  save: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: ui.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOff: { opacity: 0.45 },
  saveLabel: { color: '#14120C', fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.8, textTransform: 'uppercase' },
  notice: { marginTop: 10, color: ui.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
});
