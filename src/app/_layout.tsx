import '@/i18n';

import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { addNotificationResponseReceivedListener } from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppErrorBoundary } from '@/components/ui/app-error-boundary';
import { BotanicalSplashScreen } from '@/components/ui/splash-screen';
import { useIsDark, usePalette } from '@/hooks/use-theme';
import { initializeNotifications } from '@/services/notificationService';
import { useAuthStore } from '@/store/useAuthStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { usePlantStore } from '@/store/usePlantStore';

export { AppErrorBoundary as ErrorBoundary };

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if already prevented
});

export default function RootLayout() {
  const palette = usePalette();
  const isDark = useIsDark();
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  useLanguageStore((s) => s.preference);
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);

  const isAppReady = isInitialized && (fontsLoaded || Boolean(fontError));
  const isAuthenticated = Boolean(session && user);

  useEffect(() => {
    void initializeAuth();
    void initializeNotifications();
    SplashScreen.hideAsync().catch(() => {
      // Ignore if already hidden
    });
  }, [initializeAuth]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    try {
      sub = addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | { plantId?: string; type?: string }
          | undefined;
        if (data?.plantId) {
          router.push(`/plant/${data.plantId}`);
        }
      });
    } catch {
      // Ignore if listener is unavailable in current runtime
    }
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated) {
        void usePlantStore.getState().flushPendingSync();
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView
      style={[styles.flex, { backgroundColor: palette.bgPrimary }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isInitialized && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bgPrimary },
          }}>
          <Stack.Protected guard={!isAuthenticated} redirectTo="/(tabs)">
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="sign-up"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
          </Stack.Protected>

          <Stack.Protected guard={isAuthenticated} redirectTo="/auth">
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="plant/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
          </Stack.Protected>
        </Stack>
      )}

      {showSplashOverlay && (
        <BotanicalSplashScreen
          readyToDismiss={isAppReady}
          onFinish={() => setShowSplashOverlay(false)}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
