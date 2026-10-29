import { Tabs } from 'expo-router';
import { Camera, Sprout } from 'lucide-react-native';
import { Platform } from 'react-native';

import { Palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: Palette.textMuted,
        tabBarStyle: {
          backgroundColor: Palette.bgSurface,
          borderTopColor: Palette.borderSubtle,
          borderTopWidth: 1,
          height: Platform.select({ ios: 84, android: 66, default: 64 }),
          paddingTop: 6,
          paddingBottom: Platform.select({ ios: 24, android: 10, default: 10 }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Garden',
          tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Add / AI Scan',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

