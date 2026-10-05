import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthNotice, AuthScreen } from '@/components/auth-screen';
import { colors, fonts } from '@/constants/theme';
import { signInWithEmail, signInWithGoogle } from '@/lib/accounts';
import { isOnboardingComplete } from '@/lib/profile';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [notice, setNotice] = useState<{ message: string; positive: boolean } | null>(null);

  async function handleGoogle() {
    const result = await signInWithGoogle();
    if (!result.ok) {
      setNotice({ message: result.message, positive: false });
      return;
    }
    if (result.next === 'app') {
      router.push(isOnboardingComplete() ? '/inicio' : '/boas-vindas');
    }
  }

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
    <AuthScreen title="Entrar" subtitle="Acesse sua conta para continuar.">
      {notice ? <AuthNotice message={notice.message} positive={notice.positive} /> : null}

      <Pressable
        accessibilityRole="button"
        onPress={handleGoogle}
        style={({ pressed }) => [styles.google, pressed && styles.pressed]}>
        <Text style={styles.googleLabel}>Continuar com Google</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

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
        <Text style={styles.primaryLabel}>{submitting ? 'Entrando...' : 'Entrar'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/cadastro')}
        style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}>
        <Text style={styles.switchLabel}>Criar uma conta</Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  google: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
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
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotLabel: {
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 13,
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
    color: colors.onPrimary,
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
