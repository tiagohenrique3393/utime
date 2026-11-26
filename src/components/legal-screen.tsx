import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { PremiumBackIcon } from '@/components/premium-icons';
import { fonts, ui } from '@/constants/theme';

const page = '#050505';

export function LegalScreen({
  title,
  children,
  eyebrow,
}: {
  title: string;
  children: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safe}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back}>
            <PremiumBackIcon size={22} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {eyebrow}
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rule} />
      {typeof children === 'string' ? <Text style={styles.body}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: page },
  safe: { flex: 1 },
  top: {
    paddingHorizontal: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 36, height: 36, justifyContent: 'center' },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  section: { marginTop: 18 },
  sectionTitle: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
  },
  rule: {
    marginTop: 8,
    marginBottom: 10,
    height: StyleSheet.hairlineWidth,
    backgroundColor: ui.line,
  },
  body: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
