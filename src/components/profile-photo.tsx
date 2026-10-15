import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { getOwnAvatarPath, isOwnAvatarReady, subscribeOwnAvatar } from '@/lib/avatar';
import { loadOwnAvatar, ownAvatarUrl, removeOwnAvatar, saveOwnAvatar } from '@/lib/avatar-store';

function CameraMark() {
  if (Platform.OS !== 'web') {
    return <View style={styles.cameraDot} />;
  }
  return createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 24 24', 'aria-hidden': true },
    createElement('path', {
      d: 'M8 7.5 9.2 5.5h5.6L16 7.5h2.2a1.8 1.8 0 0 1 1.8 1.8v8.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.5V9.3a1.8 1.8 0 0 1 1.8-1.8H8Z',
      fill: 'none',
      stroke: ui.textChampagne,
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
    }),
    createElement('circle', { cx: 12, cy: 13, r: 2.6, fill: 'none', stroke: ui.textChampagne, strokeWidth: 1.6 }),
  );
}

export function ProfilePhoto({ initial }: { initial: string }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [path, setPath] = useState(getOwnAvatarPath());
  const [ready, setReady] = useState(isOwnAvatarReady());
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failedNotice, setFailedNotice] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = path ? ownAvatarUrl() : null;

  useEffect(() => subscribeOwnAvatar(() => {
    setPath(getOwnAvatarPath());
    setReady(isOwnAvatarReady());
    setFailed(false);
  }), []);

  useEffect(() => {
    const userId = getSessionUserId();
    if (userId) {
      void loadOwnAvatar(userId);
    }
  }, []);

  async function onFile(file: File) {
    setMenu(false);
    setBusy(true);
    setFailedNotice(false);
    setNotice('Enviando foto…');
    const message = await saveOwnAvatar(file);
    setBusy(false);
    setFailedNotice(Boolean(message));
    setNotice(message ?? 'Foto salva.');
  }

  async function remove() {
    setBusy(true);
    setFailedNotice(false);
    setNotice('Removendo foto…');
    const message = await removeOwnAvatar();
    setBusy(false);
    setMenu(false);
    setFailedNotice(Boolean(message));
    setNotice(message ?? 'Foto removida.');
  }

  const showPhoto = Boolean(uri) && !failed;
  const fileInput: ReactNode =
    Platform.OS === 'web'
      ? createElement('input', {
          ref: input,
          type: 'file',
          accept: 'image/jpeg,image/png,image/webp',
          'aria-hidden': true,
          tabIndex: -1,
          style: { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
          onChange: (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            target.value = '';
            if (file) {
              void onFile(file);
            }
          },
        })
      : null;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showPhoto ? 'Alterar foto do perfil' : 'Adicionar foto do perfil'}
        disabled={busy}
        onPress={() => {
          setNotice('');
          setFailedNotice(false);
          setMenu((open) => !open);
        }}
        style={styles.mark}>
        {uri && !failed ? (
          <Image source={{ uri }} style={styles.photo} contentFit="cover" onError={() => setFailed(true)} />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
        <View style={styles.camera}>
          <CameraMark />
        </View>
      </Pressable>
      {fileInput}
      {menu ? (
        <View style={styles.menu}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              if (Platform.OS !== 'web') {
                setNotice('Escolha a foto pelo navegador do celular ou do computador.');
                return;
              }
              input.current?.click();
            }}
            style={styles.menuButton}>
            <Text style={styles.menuLabel}>{path ? 'Trocar foto' : 'Adicionar foto'}</Text>
          </Pressable>
          {ready && path ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void remove()} style={styles.menuButton}>
              <Text style={styles.menuMuted}>Remover foto</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {notice ? <Text style={[styles.notice, failedNotice && styles.noticeError]}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    alignSelf: 'flex-start',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#141210',
  },
  photo: {
    width: 64,
    height: 64,
  },
  initial: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
  },
  camera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: 'rgba(8, 8, 8, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ui.textChampagne,
  },
  menu: {
    marginTop: 8,
    gap: 2,
  },
  menuButton: {
    minHeight: 36,
    justifyContent: 'center',
  },
  menuLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  menuMuted: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  notice: {
    marginTop: 4,
    maxWidth: 280,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  noticeError: {
    color: colors.danger,
  },
});
