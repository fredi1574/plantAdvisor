import { addNotificationResponseReceivedListener } from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BotanicalSplashScreen } from '@/components/splash-screen';
import { Palette } from '@/constants/theme';
import { initializeNotifications } from '@/services/notificationService';
import { useAuthStore } from '@/store/useAuthStore';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if already prevented
});

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);

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

  return (
    <GestureHandlerRootView style={styles.flex}>
      <StatusBar style="dark" />
      {isInitialized && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Palette.bgPrimary },
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
          readyToDismiss={isInitialized}
          onFinish={() => setShowSplashOverlay(false)}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Palette.bgPrimary,
  },
});
