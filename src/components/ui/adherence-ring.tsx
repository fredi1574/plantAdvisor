import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AdherenceRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Animated circular SVG progress ring displaying monthly care adherence percentage.
 */
export function AdherenceRing({
  percent,
  size = 52,
  strokeWidth = 5,
}: AdherenceRingProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(clamped / 100);

  useEffect(() => {
    const target = clamped / 100;
    if (reducedMotion) {
      progress.set(target);
    } else {
      progress.set(
        withTiming(target, {
          duration: 560,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [clamped, progress, reducedMotion]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Monthly care adherence ${clamped}%`}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.primaryBorder}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.45}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedCircleProps}
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={[styles.percentText, { color: palette.primary }]}>
          {clamped}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
