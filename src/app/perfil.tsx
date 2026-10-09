import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen, Eyebrow, PageTitle } from '@/components/app-screen';
import { colors, fonts, ui } from '@/constants/theme';
import { getSessionEmail, getSessionUserId, signOut } from '@/lib/accounts';
import { loadProfile, updateProfileName, type JourneyId } from '@/lib/profile';

const journeyTitles: Record<JourneyId, string> = {
  metime: 'ManTime',
  womantime: 'WomanTime',
};

function journeyLabel(journey: JourneyId | null) {
  if (!journey) {
    return 'Não escolhida';
  }
  return journeyTitles[journey];
}

export default function ProfileScreen() {
  const signedIn = getSessionUserId() !== null;
  const profile = loadProfile();
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [leaving, setLeaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState('');

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/');
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let active = true;
    getSessionEmail()
      .then((value) => {
        if (!active) {
          return;
        }
        setEmail(value);
        setEmailState('ready');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setEmailState('error');
      });
    return () => {
      active = false;
    };
  }, [signedIn]);

  function startNameEdit() {
    setNameDraft(profile.firstName);
    setNameNotice('');
    setEditingName(true);
  }

  function cancelNameEdit() {
    if (savingName) {
      return;
    }
    setNameNotice('');
    setEditingName(false);
  }

  async function saveName() {
    if (savingName) {
      return;
    }
    if (nameDraft.trim().length === 0) {
      setNameNotice('Informe seu nome.');
      return;
    }
    setSavingName(true);
    setNameNotice('');
    const saved = await updateProfileName(nameDraft);
    setSavingName(false);
    if (!saved) {
      setNameNotice('Não foi possível salvar o nome agora.');
      return;
    }
    setEditingName(false);
  }

  async function handleSignOut() {
    if (leaving) {
      return;
    }
    setLeaving(true);
    setNotice('');
    try {
      await signOut();
      router.replace('/');
    } catch {
      setLeaving(false);
      setNotice('Não foi possível sair agora. Tente novamente.');
    }
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const name = profile.firstName.trim() || 'Não informado';
  const initial = (profile.firstName.trim().charAt(0) || 'U').toUpperCase();
  const emailText =
    emailState === 'loading' ? 'Carregando' : emailState === 'error' ? 'Não foi possível carregar o e-mail.' : email || 'Não informado';

  return (
    <AppScreen width="narrow">
      <Eyebrow>Conta</Eyebrow>
      <PageTitle compact>Perfil</PageTitle>
      <View style={styles.mark}>
        <Text style={styles.initial}>{initial}</Text>
      </View>

      <View style={styles.fields}>
        <Text style={styles.fieldLabel}>Nome</Text>
        {editingName ? (
          <>
            <TextInput
              value={nameDraft}
              onChangeText={(value) => {
                setNameDraft(value);
                setNameNotice('');
              }}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              editable={!savingName}
              textContentType="givenName"
              autoComplete="given-name"
              placeholder="Seu primeiro nome"
              placeholderTextColor={ui.faint}
              onSubmitEditing={saveName}
              style={styles.input}
            />
            {nameNotice ? <Text style={styles.nameNotice}>{nameNotice}</Text> : null}
            <View style={styles.nameActions}>
              <Pressable accessibilityRole="button" disabled={savingName} onPress={cancelNameEdit} style={styles.nameAction}>
                <Text style={styles.nameActionMuted}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={savingName} onPress={saveName} style={styles.nameAction}>
                <Text style={styles.nameActionLabel}>{savingName ? 'Salvando' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.fieldValue}>{name}</Text>
            <Pressable accessibilityRole="button" onPress={startNameEdit} style={styles.editName}>
              <Text style={styles.editNameLabel}>Editar nome</Text>
            </Pressable>
          </>
        )}

        <View style={styles.separator} />
        <Text style={styles.fieldLabel}>E-mail</Text>
        <Text style={styles.fieldValue}>{emailText}</Text>
        <View style={styles.separator} />
        <Text style={styles.fieldLabel}>Modalidade</Text>
        <Text style={styles.fieldValue}>{journeyLabel(profile.journey)}</Text>
        <View style={styles.separator} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/meu-dia' as Href)} style={styles.navLink}>
          <Text style={styles.fieldLabel}>Meu dia</Text>
          <Text style={styles.fieldValue}>Evolução pessoal</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/personalizar-habitos' as Href)}
          style={styles.navLink}>
          <Text style={styles.fieldLabel}>Hábitos</Text>
          <Text style={styles.fieldValue}>Personalizar rotina</Text>
        </Pressable>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={leaving}
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOut, (pressed || leaving) && styles.pressed]}>
        <Text style={styles.signOutLabel}>{leaving ? 'Saindo' : 'Sair'}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  mark: {
    marginTop: 28,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
  },
  fields: {
    marginTop: 28,
  },
  fieldLabel: {
    marginTop: 16,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  fieldValue: {
    marginTop: 6,
    marginBottom: 14,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 18,
    lineHeight: 24,
  },
  input: {
    height: 52,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.background,
    paddingHorizontal: 14,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  nameNotice: {
    marginTop: 8,
    color: colors.danger,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 8,
    marginBottom: 8,
  },
  nameAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  nameActionMuted: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  nameActionLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  editName: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  editNameLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  separator: {
    height: 1,
    backgroundColor: ui.lineSoft,
  },
  navLink: {
    alignSelf: 'stretch',
  },
  notice: {
    marginTop: 16,
    color: colors.danger,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  signOut: {
    marginTop: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.line,
  },
  signOutLabel: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.75,
  },
});
