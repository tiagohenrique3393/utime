import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthNotice, AuthScreen } from '@/components/auth-screen';
import { colors, fonts } from '@/constants/theme';
import { updatePassword } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';
import { consumeRecoveryRedirect } from '@/lib/session';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<{ message: string; positive: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving) {
      return;
    }
    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    setNotice({ message: result.message, positive: result.ok });
    if (result.ok) {
      consumeRecoveryRedirect();
      router.replace(isOnboardingComplete() ? '/inicio' : '/boas-vindas');
    }
  }

  return (
    <AuthScreen title="Nova senha" subtitle="Escolha uma senha para continuar.">
      {notice ? <AuthNotice message={notice.message} positive={notice.positive} /> : null}

      <View style={styles.passwordHeader}>
        <Text style={styles.label}>Senha</Text>
        <Pressable accessibilityRole="button" onPress={() => setShowPassword((current) => !current)}>
          <Text style={styles.toggle}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
        </Pressable>
      </View>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        autoComplete="new-password"
        placeholder="Mínimo de 6 caracteres"
        placeholderTextColor={colors.muted}
        onSubmitEditing={handleSubmit}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        onPress={handleSubmit}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Text style={styles.primaryLabel}>Salvar nova senha</Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    marginBottom: 8,
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  primary: {
    height: 58,
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: colors.background,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.84,
  },
});
