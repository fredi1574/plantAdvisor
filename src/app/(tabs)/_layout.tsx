import { BlurTargetView } from 'expo-blur';
import { router, Tabs } from 'expo-router';
import { CalendarDays, Camera, Sprout, User } from 'lucide-react-native';
import {
  type ComponentProps,
  type ComponentRef,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPill } from '@/components/glass-pill';
import {
  BorderWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

type BlurTargetNode = ComponentRef<typeof View> | null;

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0] & {
  blurTargetsRef: RefObject<Record<string, BlurTargetNode>>;
};

function FloatingTabBar({
  state,
  descriptors,
  blurTargetsRef,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const palette = usePalette();

  const activeRouteKey = state.routes[state.index]?.key;
  const [blurTargetObj, setBlurTargetObj] = useState<{
    current: BlurTargetNode;
  }>({ current: null });

  useEffect(() => {
    const node = activeRouteKey
      ? (blurTargetsRef.current[activeRouteKey] ?? null)
      : null;
    setBlurTargetObj((prev) =>
      prev.current === node ? prev : { current: node }
    );
  }, [activeRouteKey, blurTargetsRef]);

  const bottomOffset =
    insets.bottom > 0
      ? insets.bottom + (Platform.OS === 'android' ? Spacing.sm : Spacing.xs)
      : Spacing.md;

  const barHeight = Platform.select({
    ios: 60,
    android: 62,
    default: 60,
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}>
      <GlassPill
        blurTarget={blurTargetObj}
        style={[
          styles.pill,
          {
            height: barHeight,
            borderColor: palette.glassBorder,
          },
        ]}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const color = isFocused ? palette.primary : palette.textMuted;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const onPress = () => {
              if (!isFocused) {
                if (route.name === 'index') {
                  router.navigate('/(tabs)');
                } else if (route.name === 'calendar') {
                  router.navigate('/(tabs)/calendar');
                } else if (route.name === 'scan') {
                  router.navigate('/(tabs)/scan');
                } else if (route.name === 'profile') {
                  router.navigate('/(tabs)/profile');
                }
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabItem,
                  pressed && styles.tabItemPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color,
                  size: 20,
                })}
                <Text
                  style={[styles.tabLabel, { color }]}
                  numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassPill>
    </View>
  );
}

export default function TabsLayout() {
  const palette = usePalette();
  const blurTargetsRef = useRef<Record<string, BlurTargetNode>>({});

  return (
    <Tabs
      tabBar={(props) => (
        <FloatingTabBar {...props} blurTargetsRef={blurTargetsRef} />
      )}
      screenLayout={({ children, route }) => (
        <BlurTargetView
          ref={(node) => {
            blurTargetsRef.current[route.key] = node;
          }}
          style={styles.screenTarget}>
          {children}
        </BlurTargetView>
      )}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Garden',
          tabBarIcon: ({ focused, color, size }) => (
            <Sprout
              color={color}
              size={size}
              fill={focused ? color : 'none'}
              strokeWidth={focused ? 2.2 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused, color, size }) => (
            <CalendarDays
              color={color}
              size={size}
              fill={focused ? palette.primarySoft : 'none'}
              strokeWidth={focused ? 2.3 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, color, size }) => (
            <Camera
              color={color}
              size={size}
              fill={focused ? palette.primarySoft : 'none'}
              strokeWidth={focused ? 2.3 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused, color, size }) => (
            <User
              color={color}
              size={size}
              fill={focused ? color : 'none'}
              strokeWidth={focused ? 2.2 : 1.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  screenTarget: {
    flex: 1,
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    width: '80%',
    maxWidth: 420,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.hairline,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  tabItemPressed: {
    opacity: 0.78,
  },
  tabLabel: {
    fontSize: Typography.caption.fontSize - 1,
    fontWeight: '600',
  },
});
