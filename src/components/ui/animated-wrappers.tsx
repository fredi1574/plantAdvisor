import React, { type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Centralized Reanimated spring presets for the entire app.
 * - Increase `damping` for less bounce (higher = calmer, critically damped).
 * - Increase `stiffness` for faster movement.
 */
export const MOTION_SPRINGS = {
  /** Card & tab panel entrance / layout transitions */
  entrance: {
    damping: 28,
    stiffness: 210,
  },
  /** Sliding pill indicators (tab bar, scan switcher, plant detail tabs) */
  pill: {
    damping: 28,
    stiffness: 260,
    mass: 0.9,
  },
  /** Tactile button press scale */
  press: {
    damping: 26,
    stiffness: 300,
    mass: 0.85,
  },
} as const;

interface AnimatedEntranceProps {
  children: ReactNode;
  /** Optional list index used to compute a subtle staggered delay (capped at 220ms). */
  index?: number;
  /** Enable smooth layout transitions when sibling items filter or reorder. */
  animateLayout?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Subtle, reduced-motion-safe fade-and-rise entrance wrapper for cards and sections.
 */
export function AnimatedEntrance({
  children,
  index = 0,
  animateLayout = false,
  style,
}: AnimatedEntranceProps) {
  const reducedMotion = useReducedMotion();
  const delay = Math.min(index * 42, 210);

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.duration(280)
              .delay(delay)
              .springify()
              .damping(MOTION_SPRINGS.entrance.damping)
              .stiffness(MOTION_SPRINGS.entrance.stiffness)
      }
      layout={
        animateLayout && !reducedMotion
          ? LinearTransition.springify()
              .damping(MOTION_SPRINGS.entrance.damping)
              .stiffness(MOTION_SPRINGS.entrance.stiffness)
          : undefined
      }
      style={style}>
      {children}
    </Animated.View>
  );
}

interface SpringPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  children: ReactNode;
}

/**
 * Tactile pressable button with a calm Reanimated spring scale on press.
 */
export function SpringPressable({
  style,
  pressedScale = 0.96,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: SpringPressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled && !reducedMotion) {
          scale.set(withSpring(pressedScale, MOTION_SPRINGS.press));
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reducedMotion) {
          scale.set(withSpring(1, MOTION_SPRINGS.press));
        }
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}
