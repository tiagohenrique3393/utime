import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { loadProfile, saveProfile, type GoalId, type JourneyId } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';

const LOGO_ASPECT = 685 / 243;

const journeys: { id: JourneyId; title: string; text: string }[] = [
  {
    id: 'metime',
    title: 'ManTime',
    text: 'Uma jornada criada para o desenvolvimento masculino.',
  },
  {
    id: 'womantime',
    title: 'WomanTime',
    text: 'Uma jornada criada para o desenvolvimento feminino.',
  },
];

const goals: { id: GoalId; label: string }[] = [
  { id: 'disciplina', label: 'Criar mais disciplina' },
  { id: 'corpo', label: 'Cuidar melhor do corpo' },
  { id: 'mente', label: 'Fortalecer a mente' },
  { id: 'espirito', label: 'Fortalecer a vida espiritual' },
  { id: 'rotina', label: 'Organizar melhor minha rotina' },
];

export default function WelcomeFlowScreen() {
  const signedIn = useRequireSession();
  const saved = loadProfile();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const logoWidth = isWide ? 61 : 49;
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState(saved.firstName);
  const [journey, setJourney] = useState<JourneyId | null>(saved.journey);
  const [selectedGoals, setSelectedGoals] = useState<GoalId[]>(saved.goals);
  const [notice, setNotice] = useState('');

  function persistDraft(completed = false) {
    saveProfile({
      firstName: firstName.trim(),
      journey,
      goals: selectedGoals,
      completed,
    });
  }

  function goBack() {
    setNotice('');
    if (step === 1) {
      router.back();
      return;
    }
    setStep((current) => current - 1);
  }

  function continueFromName() {
    if (firstName.trim().length === 0) {
      setNotice('Informe seu primeiro nome.');
      return;
    }
    setNotice('');
    persistDraft();
    setStep(2);
  }

  function continueFromJourney() {
    if (!journey) {
      setNotice('Escolha uma jornada.');
      return;
    }
    setNotice('');
    persistDraft();
    setStep(3);
  }

  function toggleGoal(id: GoalId) {
    setNotice('');
    setSelectedGoals((current) =>
      current.includes(id) ? current.filter((goal) => goal !== id) : [...current, id],
    );
  }

  function finish() {
    if (selectedGoals.length === 0) {
      setNotice('Escolha ao menos uma opção.');
      return;
    }
    persistDraft(true);
    router.replace('/inicio');
  }

  if (!signedIn) {
    return <View style={styles.screen} />;
  }

  const title =
    step === 1
      ? 'Como podemos chamar você?'
      : step === 2
        ? 'Qual jornada combina com você?'
        : 'O que você quer transformar primeiro?';

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Pressable accessibilityRole="button" onPress={goBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Image
              accessibilityLabel="YouTime"
              source={require('@/assets/youtime-logo.png')}
              style={{ width: logoWidth, height: logoWidth * LOGO_ASPECT, alignSelf: 'center' }}
              contentFit="contain"
            />

            <Text style={styles.step}>Etapa {step} de 3</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>

            {notice ? <Text style={styles.notice}>{notice}</Text> : <View style={styles.noticeSpace} />}

            {step === 1 ? (
              <TextInput
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  setNotice('');
                }}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="givenName"
                autoComplete="given-name"
                placeholder="Seu primeiro nome"
                placeholderTextColor={colors.muted}
                onSubmitEditing={continueFromName}
                style={styles.input}
              />
            ) : null}

            {step === 2 ? (
              <View style={[styles.choiceList, isWide && styles.choiceRow]}>
                {journeys.map((item) => {
                  const selected = journey === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setJourney(item.id);
                        setNotice('');
                      }}
                      style={({ pressed }) => [
                        styles.choice,
                        isWide && styles.choiceWide,
                        selected && styles.choiceSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.choiceTitle}>{item.title}</Text>
                      <Text style={styles.choiceText}>{item.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.choiceList}>
                {goals.map((item) => {
                  const selected = selectedGoals.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => toggleGoal(item.id)}
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.choiceSelected,
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.mark, selected && styles.markSelected]} />
                      <Text style={styles.optionLabel}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={step === 1 ? continueFromName : step === 2 ? continueFromJourney : finish}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryLabel}>{step === 3 ? 'Começar minha jornada' : 'Continuar'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingTop: 8,
  },
  columnWide: {
    maxWidth: 720,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 8,
  },
  backLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  step: {
    marginTop: 16,
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  notice: {
    minHeight: 22,
    marginTop: 16,
    marginBottom: 8,
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noticeSpace: {
    height: 24,
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
  choiceList: {
    gap: 12,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  choice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 8,
  },
  choiceWide: {
    flex: 1,
  },
  choiceSelected: {
    borderColor: colors.gold,
  },
  choiceTitle: {
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
  },
  choiceText: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  option: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.iconBorder,
  },
  markSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  optionLabel: {
    flex: 1,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
  },
  primary: {
    height: 58,
    marginTop: 28,
    borderRadius: 16,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryLabel: {
    color: colors.onPrimary,
    fontFamily: fonts.textMedium,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.84,
  },
});
