import { Tabs } from 'expo-router';
import { CalendarDays, Camera, Sprout, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const userName =
    profile?.displayName?.trim() ||
    (user?.user_metadata?.display_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    'Gardener';

  // Dynamic bottom padding to account for phone navigation buttons / gesture bars:
  // - 3-button navigation on Android typically adds ~48dp
  // - Gesture navigation on Android typically adds ~16-24dp
  // - Home indicator on iOS typically adds ~34dp
  // - Fallback for Web or devices without on-screen navigation
  const bottomInset = insets.bottom;
  const bottomPadding =
    bottomInset > 0
      ? bottomInset + (Platform.OS === 'android' ? 6 : 2)
      : Platform.select({ ios: 14, android: 10, default: 10 });

  const contentHeight = Platform.select({ ios: 52, android: 56, default: 52 });
  const tabHeight = contentHeight + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: Palette.textMuted,
        tabBarStyle: {
          backgroundColor: Palette.bgSurface,
          borderTopColor: Palette.borderSubtle,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: `Your Garden, ${userName}`,
          tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Add / AI Scan',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
