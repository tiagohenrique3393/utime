import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { AuthNotice, AuthScreen } from '@/components/auth-screen';
import { colors, fonts } from '@/constants/theme';
import { requestPasswordReset } from '@/lib/accounts';

export default function PasswordRecoveryScreen() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<{ message: string; positive: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (sending) {
      return;
    }
    setSending(true);
    const result = await requestPasswordReset(email);
    setSending(false);
    setNotice({ message: result.message, positive: result.ok });
  }

  return (
    <AuthScreen title="Recuperar senha" subtitle="Enviaremos um link para o seu e-mail.">
      {notice ? <AuthNotice message={notice.message} positive={notice.positive} /> : null}

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        inputMode="email"
        textContentType="emailAddress"
        autoComplete="email"
        placeholder="voce@email.com"
        placeholderTextColor={colors.muted}
        onSubmitEditing={handleSubmit}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        onPress={handleSubmit}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Text style={styles.primaryLabel}>Enviar link</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/entrar')}
        style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}>
        <Text style={styles.switchLabel}>Voltar para entrar</Text>
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
  switchLink: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  switchLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.84,
  },
});
