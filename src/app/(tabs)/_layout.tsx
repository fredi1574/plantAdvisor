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
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPill } from '@/components/ui/glass-pill';
import {
  BorderWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';

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
  const reducedMotion = useReducedMotion();

  const activeRouteKey = state.routes[state.index]?.key;
  const [blurTargetObj, setBlurTargetObj] = useState<{
    current: BlurTargetNode;
  }>({ current: null });
  const [rowWidth, setRowWidth] = useState(0);

  const routeCount = Math.max(1, state.routes.length);
  const horizontalPad = Spacing.xs;
  const pillSlotWidth =
    rowWidth > 0 ? (rowWidth - horizontalPad * 2) / routeCount : 0;
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (pillSlotWidth <= 0) return;
    const targetX = horizontalPad + state.index * pillSlotWidth;
    if (reducedMotion) {
      indicatorX.value = targetX;
    } else {
      indicatorX.value = withSpring(targetX, {
        damping: 22,
        stiffness: 240,
        mass: 0.9,
      });
    }
  }, [state.index, pillSlotWidth, horizontalPad, indicatorX, reducedMotion]);

  const activePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

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
        <View
          style={styles.row}
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
          {pillSlotWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeTabPill,
                {
                  width: pillSlotWidth - 2,
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primaryBorder,
                },
                activePillStyle,
              ]}
            />
          )}
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
                triggerLightHaptic();
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
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
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
          ref={(node: BlurTargetNode) => {
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  activeTabPill: {
    position: 'absolute',
    left: 1,
    top: Spacing.xs,
    bottom: Spacing.xs,
    borderRadius: Radius.pill - 4,
    borderWidth: BorderWidth.hairline,
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
