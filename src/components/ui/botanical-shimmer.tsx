import { Sparkles, Stethoscope } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

const STAGE_COPY = {
  identify: [
    'Reading leaf venation & silhouette…',
    'Matching botanical taxonomy & family…',
    'Checking pet safety & succulent guardrails…',
  ],
  diagnose: [
    'Inspecting foliage, stems & substrate cues…',
    'Cross-referencing your care timeline…',
    'Preparing tailored botanical recovery steps…',
  ],
} as const;

interface ShimmerBlockProps {
  width: DimensionValue;
  height: number;
  radius?: number;
}

function ShimmerBlock({ width, height, radius = Radius.sm }: ShimmerBlockProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 0.72 : 0.48);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.72;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.95, { duration: 950, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: palette.bgElevated,
        },
        animatedStyle,
      ]}
    />
  );
}

interface AiScanShimmerCardProps {
  mode: 'identify' | 'diagnose';
}

/**
 * Warm parchment-tinted skeleton shimmer card with staged botanical progress copy
 * shown while AI plant identification or health diagnosis is running.
 */
export function AiScanShimmerCard({ mode }: AiScanShimmerCardProps) {
  const palette = usePalette();
  const stages = STAGE_COPY[mode];
  const [stageIndex, setStageIndex] = useState(0);
  const [prevMode, setPrevMode] = useState(mode);

  if (mode !== prevMode) {
    setPrevMode(mode);
    setStageIndex(0);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length);
    }, 1700);
    return () => clearInterval(interval);
  }, [stages.length]);

  const Icon = mode === 'identify' ? Sparkles : Stethoscope;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={stages[stageIndex]}
      style={[
        styles.container,
        {
          backgroundColor: palette.bgPrimary,
          borderColor: palette.primaryBorder,
        },
      ]}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconPill,
            { backgroundColor: palette.primarySoft },
          ]}>
          <Icon size={15} color={palette.primary} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>
            {mode === 'identify' ? 'BOTANICAL ANALYSIS' : 'PATHOLOGY SCAN'}
          </Text>
          <Text style={[styles.stageText, { color: palette.textPrimary }]}>
            {stages[stageIndex]}
          </Text>
        </View>
      </View>

      <View style={styles.skeletonBody}>
        <ShimmerBlock width="68%" height={18} radius={Radius.sm} />
        <ShimmerBlock width="94%" height={12} />
        <ShimmerBlock width="82%" height={12} />
        <View style={styles.pillRow}>
          <ShimmerBlock width={86} height={24} radius={Radius.full} />
          <ShimmerBlock width={112} height={24} radius={Radius.full} />
          <ShimmerBlock width={72} height={24} radius={Radius.full} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...Typography.eyebrow,
    fontSize: 10,
  },
  stageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonBody: {
    gap: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
