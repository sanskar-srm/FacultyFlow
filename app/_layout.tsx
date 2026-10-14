import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { EmptyState } from '@/src/components/EmptyState';
import { AppProvider, useApp } from '@/src/context/AppContext';
import { useColors } from '@/src/theme/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProvider fallback={(state, retry) => <BootScreen state={state} retry={retry} />}>
      <RootNavigator />
    </AppProvider>
  );
}

function BootScreen({ state, retry }: { state: 'loading' | 'error'; retry: () => void }) {
  const c = useColors();
  useEffect(() => {
    if (state === 'error') SplashScreen.hide();
  }, [state]);
  if (state === 'loading') return null; // the splash screen stays up
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: c.background }}>
      <EmptyState
        icon="alert-triangle"
        title="Something went wrong"
        message="Your tasks couldn't be loaded. They are still safe on this device."
        actionLabel="Try again"
        onAction={retry}
      />
    </View>
  );
}

function RootNavigator() {
  const { profile } = useApp();
  const scheme = useColorScheme();
  const c = useColors();

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.surface, text: c.text, border: c.border },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: c.background },
          headerStyle: { backgroundColor: c.background },
          headerShadowVisible: false,
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: '700' },
        }}>
        {/* First launch only: no profile yet. */}
        <Stack.Protected guard={!profile}>
          <Stack.Screen name="setup" options={{ title: 'Welcome to Faculty Flow' }} />
        </Stack.Protected>
        <Stack.Protected guard={!!profile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="task/new" options={{ title: 'New task' }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Edit task' }} />
          <Stack.Screen name="profile" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="export" options={{ title: 'Export to Excel' }} />
          <Stack.Screen name="export-result" options={{ title: 'Excel sheet' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
