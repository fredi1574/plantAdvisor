import React, { type ReactNode, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

const SPRING_CONFIG = {
  damping: 17,
  stiffness: 155,
  mass: 0.85,
  overshootClamping: false,
};

export interface SwipeActionConfig {
  label: string;
  icon: ReactNode;
  backgroundColor: string;
  accessibilityLabel: string;
  onTrigger: () => void;
}

interface SwipeableRowProps {
  leftAction: SwipeActionConfig;
  rightAction: SwipeActionConfig;
  openWidth?: number;
  borderRadius?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  children:
    | ReactNode
    | ((state: { isOpen: boolean; pressed: boolean }) => ReactNode);
}

/**
 * Generalized elastic horizontal swipe row powered by Gesture Handler + Reanimated.
 * Supports snap-open action drawers on both sides and deep full-swipe immediate triggers.
 */
export function SwipeableRow({
  leftAction,
  rightAction,
  openWidth = 96,
  borderRadius = Radius.lg,
  compact = false,
  style,
  onPress,
  children,
}: SwipeableRowProps) {
  const palette = usePalette();
  const translateX = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false);

  const rightOpenWidth = openWidth;
  const leftOpenWidth = -openWidth;
  const maxElasticStretch = openWidth + 50;
  const snapOpenThreshold = Math.round(openWidth * 0.33);
  const fullSwipeThreshold = openWidth + 84;
  const extraWidthPadding = compact ? 12 : 14;

  const gestureRef = useRef({
    startOffset: 0,
    currentOffset: 0,
    lastTranslationX: 0,
    lastVelocityX: 0,
    isSwiping: false,
  });

  const applyRubberBandGive = (rawX: number): number => {
    const absX = Math.abs(rawX);
    if (absX <= rightOpenWidth) {
      return rawX;
    }
    const sign = rawX < 0 ? -1 : 1;
    const extra = absX - rightOpenWidth;
    const dampedExtra =
      (extra * 0.72 * maxElasticStretch) / (maxElasticStretch + extra * 0.72);
    return sign * (rightOpenWidth + dampedExtra);
  };

  const snapTo = (toValue: number, velocityX = 0) => {
    gestureRef.current.currentOffset = toValue;
    setIsOpen(toValue !== 0);
    const clampedVelocity = Math.max(-900, Math.min(900, velocityX));
    translateX.value = withSpring(toValue, {
      ...SPRING_CONFIG,
      velocity: clampedVelocity,
    });
  };

  const closeSwipe = (afterClose?: () => void) => {
    snapTo(0);
    if (afterClose) {
      setTimeout(afterClose, 150);
    }
  };

  const settleSwipe = (translationX: number, velocityX: number) => {
    const startOffset = gestureRef.current.startOffset;
    const rawX = startOffset + translationX;
    const elasticX = applyRubberBandGive(rawX);

    setTimeout(() => {
      gestureRef.current.isSwiping = false;
    }, 80);

    // Deep full swipe right -> trigger left-side action immediately
    if (
      elasticX > fullSwipeThreshold ||
      (elasticX > rightOpenWidth + 42 && velocityX > 1350)
    ) {
      snapTo(0, velocityX * 0.35);
      setTimeout(() => leftAction.onTrigger(), 130);
      return;
    }

    // Deep full swipe left -> trigger right-side action immediately
    if (
      elasticX < -fullSwipeThreshold ||
      (elasticX < leftOpenWidth - 42 && velocityX < -1350)
    ) {
      snapTo(0, velocityX * 0.35);
      setTimeout(() => rightAction.onTrigger(), 130);
      return;
    }

    // Closing or reversing from already-open right state
    if (startOffset > 0 && (rawX < rightOpenWidth - 18 || velocityX < -220)) {
      if (rawX < -snapOpenThreshold * 1.8 && velocityX < -500) {
        snapTo(leftOpenWidth, velocityX);
      } else {
        snapTo(0, velocityX);
      }
      return;
    }

    // Closing or reversing from already-open left state
    if (startOffset < 0 && (rawX > leftOpenWidth + 18 || velocityX > 220)) {
      if (rawX > snapOpenThreshold * 1.8 && velocityX > 500) {
        snapTo(rightOpenWidth, velocityX);
      } else {
        snapTo(0, velocityX);
      }
      return;
    }

    if (
      elasticX > snapOpenThreshold ||
      (elasticX > 14 && velocityX > 260)
    ) {
      snapTo(rightOpenWidth, velocityX);
      return;
    }

    if (
      elasticX < -snapOpenThreshold ||
      (elasticX < -14 && velocityX < -260)
    ) {
      snapTo(leftOpenWidth, velocityX);
      return;
    }

    snapTo(0, velocityX);
  };

  const panGesture = usePanGesture({
    activeOffsetX: [-8, 8],
    failOffsetY: [-20, 20],
    runOnJS: true,
    onActivate: () => {
      gestureRef.current.startOffset = gestureRef.current.currentOffset;
      gestureRef.current.lastTranslationX = 0;
      gestureRef.current.lastVelocityX = 0;
      gestureRef.current.isSwiping = true;
    },
    onUpdate: (e) => {
      gestureRef.current.lastTranslationX = e.translationX;
      gestureRef.current.lastVelocityX = e.velocityX;
      const rawX = gestureRef.current.startOffset + e.translationX;
      translateX.value = applyRubberBandGive(rawX);
    },
    onDeactivate: (e) => {
      const tx = e.translationX ?? gestureRef.current.lastTranslationX;
      const vx = e.velocityX ?? gestureRef.current.lastVelocityX;
      settleSwipe(tx, vx);
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionAnimatedStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, translateX.value);
    return {
      width: Math.max(rightOpenWidth, pull + extraWidthPadding),
      opacity: interpolate(
        pull,
        [0, 12, rightOpenWidth * 0.65],
        [0, 0.75, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const rightActionAnimatedStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, -translateX.value);
    return {
      width: Math.max(rightOpenWidth, pull + extraWidthPadding),
      opacity: interpolate(
        pull,
        [0, 12, rightOpenWidth * 0.65],
        [0, 0.75, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const leftActionContentStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, translateX.value);
    return {
      transform: [
        {
          scale: interpolate(
            pull,
            [0, rightOpenWidth, fullSwipeThreshold],
            [0.86, 1, 1.15],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const rightActionContentStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, -translateX.value);
    return {
      transform: [
        {
          scale: interpolate(
            pull,
            [0, rightOpenWidth, fullSwipeThreshold],
            [0.86, 1, 1.15],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const handleForegroundPress = () => {
    if (gestureRef.current.isSwiping) return;
    if (gestureRef.current.currentOffset !== 0) {
      closeSwipe();
      return;
    }
    onPress?.();
  };

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <View
        style={[
          styles.actionsBackdrop,
          { backgroundColor: palette.bgSubtle, borderRadius },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}>
        <Animated.View
          style={[
            styles.leftActionSlot,
            { width: rightOpenWidth },
            leftActionAnimatedStyle,
          ]}>
          <Pressable
            onPress={() => closeSwipe(leftAction.onTrigger)}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: leftAction.backgroundColor },
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={leftAction.accessibilityLabel}>
            <Animated.View
              style={[
                styles.actionBtnContent,
                compact && styles.actionBtnContentCompact,
                leftActionContentStyle,
              ]}>
              {leftAction.icon}
              <Text
                style={[
                  styles.actionBtnLabel,
                  compact && styles.actionBtnLabelCompact,
                  { color: palette.textInverse },
                ]}>
                {leftAction.label}
              </Text>
            </Animated.View>
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.rightActionSlot,
            { width: rightOpenWidth },
            rightActionAnimatedStyle,
          ]}>
          <Pressable
            onPress={() => closeSwipe(rightAction.onTrigger)}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: rightAction.backgroundColor },
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={rightAction.accessibilityLabel}>
            <Animated.View
              style={[
                styles.actionBtnContent,
                compact && styles.actionBtnContentCompact,
                rightActionContentStyle,
              ]}>
              {rightAction.icon}
              <Text
                style={[
                  styles.actionBtnLabel,
                  compact && styles.actionBtnLabelCompact,
                  { color: palette.textInverse },
                ]}>
                {rightAction.label}
              </Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>

      <GestureDetector gesture={panGesture} touchAction="pan-y">
        <Animated.View style={[styles.foregroundWrap, cardAnimatedStyle]}>
          <Pressable onPress={handleForegroundPress}>
            {({ pressed }) =>
              typeof children === 'function'
                ? children({ isOpen, pressed })
                : children
            }
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionsBackdrop: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  leftActionSlot: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rightActionSlot: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginLeft: 'auto',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnContentCompact: {
    gap: 4,
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionBtnLabelCompact: {
    fontSize: 11,
  },
  foregroundWrap: {
    width: '100%',
  },
});
