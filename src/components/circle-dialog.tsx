import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { circlePalette as palette } from '@/components/circle-palette';
import { fonts } from '@/constants/theme';

export function CircleDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            {cancelLabel ? (
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
                <Text style={styles.secondaryLabel}>{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.primary, danger && styles.danger]}>
              <Text style={[styles.primaryLabel, danger && styles.dangerLabel]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214, 181, 122, 0.35)',
    backgroundColor: '#0B0B0D',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  title: {
    color: palette.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.4,
  },
  body: {
    marginTop: 12,
    color: palette.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondary: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: palette.text,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  primary: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.champagne,
  },
  primaryLabel: {
    color: palette.ink,
    fontFamily: fonts.textMedium,
    fontSize: 14,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8E3D3D',
  },
  dangerLabel: {
    color: '#E07A7A',
  },
});
