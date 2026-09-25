import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { colors, fonts } from '@/constants/theme';
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
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
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
      router.replace('/entrar');
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
      router.replace('/entrar' as Href);
    } catch {
      setLeaving(false);
      setNotice('Não foi possível sair agora. Tente novamente.');
    }
  }

  if (!signedIn) {
    return <View style={styles.screen} />;
  }

  const name = profile.firstName.trim() || 'Não informado';
  const emailText =
    emailState === 'loading' ? 'Carregando' : emailState === 'error' ? 'Não foi possível carregar o e-mail.' : email || 'Não informado';

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))}
              style={styles.back}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Conta</Text>
            <Text accessibilityRole="header" style={[styles.title, isWide && styles.titleWide]}>
              Perfil
            </Text>

            <View style={styles.card}>
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
                    placeholderTextColor={colors.muted}
                    onSubmitEditing={saveName}
                    style={styles.input}
                  />
                  {nameNotice ? <Text style={styles.nameNotice}>{nameNotice}</Text> : null}
                  <View style={styles.nameActions}>
                    <Pressable accessibilityRole="button" disabled={savingName} onPress={cancelNameEdit} style={styles.nameAction}>
                      <Text style={styles.nameActionMuted}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingName}
                      onPress={saveName}
                      style={styles.nameAction}>
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
            </View>

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={leaving}
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOut, pressed && styles.pressed, leaving && styles.pressed]}>
              <Text style={styles.signOutLabel}>{leaving ? 'Saindo' : 'Sair da conta'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  safeWide: {
    paddingHorizontal: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 32,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  columnWide: {
    maxWidth: 640,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  eyebrow: {
    marginTop: 12,
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
  },
  titleWide: {
    fontSize: 48,
    lineHeight: 52,
  },
  card: {
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  fieldLabel: {
    marginTop: 14,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  fieldValue: {
    marginTop: 6,
    marginBottom: 14,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 18,
    lineHeight: 24,
  },
  input: {
    height: 52,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  nameNotice: {
    marginTop: 8,
    color: '#C48B8B',
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 12,
    marginBottom: 14,
  },
  nameAction: {
    paddingVertical: 8,
  },
  nameActionMuted: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  nameActionLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  editName: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 14,
    paddingVertical: 4,
  },
  editNameLabel: {
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  notice: {
    marginTop: 16,
    color: '#C48B8B',
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  signOut: {
    height: 58,
    marginTop: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  signOutLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.84,
  },
});
