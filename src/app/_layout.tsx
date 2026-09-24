import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond';
import { Outfit_400Regular } from '@expo-google-fonts/outfit';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';

import { colors } from '@/constants/theme';
import { applySessionOwner } from '@/lib/accounts';
import { prepareAuth } from '@/lib/session';
import { supabase } from '../../utils/supabase';

SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.background);

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.ivory,
    border: colors.line,
    primary: colors.gold,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_500Medium,
    Outfit_400Regular,
  });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    let active = true;
    prepareAuth().finally(() => {
      if (active) {
        setAuthReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      applySessionOwner(session?.user.id ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if ((!loaded && !error) || !authReady) {
    return null;
  }

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </ThemeProvider>
  );
}
