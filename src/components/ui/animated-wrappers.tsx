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

const CALM_SPRING = {
  damping: 20,
  stiffness: 280,
  mass: 0.85,
};

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
          : FadeInDown.duration(320).delay(delay).springify().damping(22).stiffness(190)
      }
      layout={
        animateLayout && !reducedMotion
          ? LinearTransition.springify().damping(22).stiffness(190)
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
          scale.set(withSpring(pressedScale, CALM_SPRING));
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reducedMotion) {
          scale.set(withSpring(1, CALM_SPRING));
        }
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}
