import { router, useFocusEffect, type Href } from 'expo-router';
import { createElement, useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ProfilePhoto } from '@/components/profile-photo';
import { ProfilePlanet } from '@/components/profile-planet';
import { colors, fonts, ui } from '@/constants/theme';
import { getSessionEmail, getSessionUserId, signOut } from '@/lib/accounts';
import { loadOwnIdentity } from '@/lib/public-profile';
import { getProfileSnapshot, subscribeProfile, updateProfileName, type JourneyId } from '@/lib/profile';

const page = '#050505';
const deleteRed = '#C45656';

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

function svg(size: number, ...children: ReactNode[]) {
  return createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, ...children);
}

function stroke(extra?: Record<string, unknown>) {
  return {
    fill: 'none',
    stroke: ui.champagneDeep,
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...extra,
  };
}

function TrashMark({ size = 16 }: { size?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.deleteDot} />;
  }
  return svg(
    size,
    createElement('path', { d: 'M5 7.5h14', ...stroke({ stroke: deleteRed }) }),
    createElement('path', { d: 'M9.2 7.4V5.6h5.6v1.8', ...stroke({ stroke: deleteRed }) }),
    createElement('path', { d: 'M7.2 7.5 8.1 19h7.8l.9-11.5', ...stroke({ stroke: deleteRed }) }),
    createElement('path', { d: 'M10.2 10.6v5.2', ...stroke({ stroke: deleteRed }) }),
    createElement('path', { d: 'M13.8 10.6v5.2', ...stroke({ stroke: deleteRed }) }),
  );
}

function Mark({ name, size = 18 }: { name: 'user' | 'mail' | 'layers' | 'chevron' | 'logout' | 'pencil' | 'gear' | 'at' | 'crown'; size?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.nativeMark} />;
  }
  if (name === 'user') {
    return svg(
      size,
      createElement('circle', { cx: 12, cy: 8, r: 3.1, ...stroke() }),
      createElement('path', { d: 'M5.4 18.6c.9-3.1 3.2-4.6 6.6-4.6s5.7 1.5 6.6 4.6', ...stroke() }),
    );
  }
  if (name === 'mail') {
    return svg(
      size,
      createElement('rect', { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2, ...stroke() }),
      createElement('path', { d: 'M4.2 7.2 12 13.1l7.8-5.9', ...stroke() }),
    );
  }
  if (name === 'layers') {
    return svg(
      size,
      createElement('path', { d: 'M12 4.2 20 8.4 12 12.6 4 8.4 12 4.2Z', ...stroke() }),
      createElement('path', { d: 'M4 12.2 12 16.4 20 12.2', ...stroke() }),
      createElement('path', { d: 'M4 15.6 12 19.8 20 15.6', ...stroke() }),
    );
  }
  if (name === 'chevron') {
    return svg(size, createElement('path', { d: 'M9 6.5 15 12 9 17.5', ...stroke({ stroke: ui.muted }) }));
  }
  if (name === 'pencil') {
    return svg(
      size,
      createElement('path', { d: 'M13.2 6.2 17.8 10.8 8.4 20.2H3.8v-4.6L13.2 6.2Z', ...stroke() }),
      createElement('path', { d: 'M11.6 7.8 16.2 12.4', ...stroke() }),
    );
  }
  if (name === 'gear') {
    return svg(
      size,
      createElement('circle', { cx: 12, cy: 12, r: 3, ...stroke() }),
      createElement('path', { d: 'M12 3.5v2.1M12 18.4v2.1M4.8 6.8l1.5 1.5M17.7 15.7l1.5 1.5M3.5 12h2.1M18.4 12h2.1M4.8 17.2l1.5-1.5M17.7 8.3l1.5-1.5', ...stroke() }),
    );
  }
  if (name === 'at') {
    return svg(
      size,
      createElement('circle', { cx: 12, cy: 12, r: 3, ...stroke() }),
      createElement('path', { d: 'M15 12v1.2a2 2 0 0 0 3.8.7', ...stroke() }),
      createElement('circle', { cx: 12, cy: 12, r: 7, ...stroke() }),
    );
  }
  if (name === 'crown') {
    return svg(
      size,
      createElement('path', { d: 'M4.5 16.5 6.2 8.5 10 12.2 12 7.2l2 5 3.8-3.7 1.7 8', ...stroke() }),
      createElement('path', { d: 'M6 18.2h12', ...stroke() }),
    );
  }
  return svg(
    size,
    createElement('path', { d: 'M10 7V5.6A1.6 1.6 0 0 1 11.6 4h7A1.6 1.6 0 0 1 20.2 5.6v12.8a1.6 1.6 0 0 1-1.6 1.6h-7A1.6 1.6 0 0 1 10 18.4V17', ...stroke() }),
    createElement('path', { d: 'M13 12H3.2', ...stroke() }),
    createElement('path', { d: 'M6 8.8 2.8 12 6 15.2', ...stroke() }),
  );
}

export default function ProfileScreen() {
  const signedIn = getSessionUserId() !== null;
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const { width } = useWindowDimensions();
  const photoSize = Math.round(Math.min(164, Math.max(150, width * 0.42)));
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [leaving, setLeaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState('');
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<'loading' | 'ready' | 'error'>('loading');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadOwnIdentity()
        .then((identity) => {
          if (!active) {
            return;
          }
          setHandle(identity.handle);
          setHandleState(identity.ok ? 'ready' : 'error');
        })
        .catch(() => {
          if (active) {
            setHandleState('error');
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

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
  const modality = journeyLabel(profile.journey);
  const emailText =
    emailState === 'loading' ? 'Carregando' : emailState === 'error' ? 'Não foi possível carregar o e-mail.' : email || 'Não informado';
  const handleText = handleState === 'loading' ? 'Carregando' : handleState === 'error' ? 'Não foi possível carregar' : handle ? `@${handle}` : 'Escolher nome de usuário';

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<ProfilePlanet />}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Conta</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Perfil
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Configurações" onPress={() => router.push('/configuracoes' as Href)} style={styles.gear}>
          <Mark name="gear" size={22} />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <ProfilePhoto initial={initial} size={photoSize} />
        <View style={styles.nameLine}>
          <Text numberOfLines={2} style={styles.displayName}>
            {name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar nome"
            disabled={savingName}
            onPress={startNameEdit}
            style={styles.pencil}>
            <Mark name="pencil" size={16} />
          </Pressable>
        </View>
        {profile.journey ? (
          <View style={styles.capsule}>
            <Text style={styles.capsuleLabel}>{modality}</Text>
          </View>
        ) : null}
        {handleState === 'ready' && !handle ? <Text style={styles.invite}>Escolha um nome de usuário para ser encontrado no Circle.</Text> : null}
      </View>

      <View style={styles.stack}>
        {editingName ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWell}>
                <Mark name="user" />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowLabel}>Nome</Text>
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
              </View>
            </View>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Editar nome" onPress={startNameEdit} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWell}>
                <Mark name="user" />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowLabel}>Nome</Text>
                <Text numberOfLines={2} style={styles.rowValue}>
                  {name}
                </Text>
              </View>
              <Mark name="chevron" size={16} />
            </View>
          </Pressable>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Editar nome de usuário" onPress={() => router.push('/nome-usuario' as Href)} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWell}>
              <Mark name="at" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowLabel}>Nome de usuário</Text>
              <Text numberOfLines={1} style={styles.rowValue}>
                {handleText}
              </Text>
            </View>
            <Mark name="chevron" size={16} />
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWell}>
              <Mark name="mail" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowLabel}>E-mail</Text>
              <Text style={styles.rowValue}>{emailText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWell}>
              <Mark name="layers" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowLabel}>Modalidade</Text>
              <Text style={styles.rowValue}>{modality}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWell}>
              <Mark name="crown" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowLabel}>Plano</Text>
              <Text style={styles.rowValue}>Gratuito</Text>
            </View>
          </View>
        </View>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={leaving}
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOut, (pressed || leaving) && styles.pressed]}>
        <View style={styles.signOutInner}>
          <Mark name="logout" size={16} />
          <Text style={styles.signOutLabel}>{leaving ? 'Saindo' : 'Sair'}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Excluir minha conta"
        onPress={() => router.push('/excluir-conta' as Href)}
        style={({ pressed }) => [styles.deleteAccount, pressed && styles.pressed]}>
        <TrashMark />
        <Text style={styles.deleteAccountLabel}>Excluir minha conta</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: page,
  },
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
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  gear: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invite: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  identity: {
    alignItems: 'center',
    marginTop: 28,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  displayName: {
    flexShrink: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pencil: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsule: {
    marginTop: 10,
    minHeight: 26,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  capsuleLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  stack: {
    marginTop: 26,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.22)',
    backgroundColor: 'rgba(17, 18, 20, 0.72)',
  },
  row: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 8, 8, 0.35)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  rowValue: {
    marginTop: 3,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: ui.lineSoft,
  },
  input: {
    height: 44,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: 'rgba(5, 5, 5, 0.72)',
    paddingHorizontal: 12,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  nameNotice: {
    marginTop: 8,
    color: colors.danger,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 4,
  },
  nameAction: {
    minHeight: 40,
    justifyContent: 'center',
  },
  nameActionMuted: {
    color: ui.muted,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  nameActionLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  notice: {
    marginTop: 14,
    color: colors.danger,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  signOut: {
    marginTop: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196, 165, 116, 0.7)',
    backgroundColor: '#050505',
    boxShadow: '0 0 18px rgba(196, 165, 116, 0.16)',
  },
  signOutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signOutLabel: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.75,
  },
  nativeMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ui.champagne,
  },
  deleteAccount: {
    marginTop: 22,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  deleteAccountLabel: {
    color: deleteRed,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  deleteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: deleteRed,
  },
});
