import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthNotice, AuthScreen } from '@/components/auth-screen';
import { colors, fonts } from '@/constants/theme';
import { signInWithEmail } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [notice, setNotice] = useState<{ message: string; positive: boolean } | null>(null);

  async function handleSubmit() {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok || result.next !== 'app') {
        setNotice({ message: result.message, positive: false });
        return;
      }
      router.replace(isOnboardingComplete() ? '/inicio' : '/boas-vindas');
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Não foi possível concluir agora. Tente novamente.';
      setNotice({ message, positive: false });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen subtitle="Acesse sua conta para continuar.">
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
        style={styles.input}
      />

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
        textContentType="password"
        autoComplete="current-password"
        placeholder="Sua senha"
        placeholderTextColor={colors.muted}
        onSubmitEditing={handleSubmit}
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/recuperar')}
        style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}>
        <Text style={styles.forgotLabel}>Esqueci minha senha</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed, submitting && styles.pressed]}>
        <Text style={styles.primaryLabel}>{submitting ? 'Entrando...' : 'ENTRAR'}</Text>
      </Pressable>

      <View style={styles.switchBlock}>
        <Text style={styles.switchHint}>Ainda não tem uma conta?</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/cadastro')}
          style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}>
          <Text style={styles.switchLabel}>CRIAR UMA CONTA</Text>
        </Pressable>
      </View>
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
    marginTop: 16,
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
  forgot: {
    alignSelf: 'center',
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  forgotLabel: {
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  primary: {
    height: 58,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: colors.onPrimary,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  switchBlock: {
    alignItems: 'center',
    marginTop: 22,
  },
  switchHint: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  switchLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  switchLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.84,
  },
});
