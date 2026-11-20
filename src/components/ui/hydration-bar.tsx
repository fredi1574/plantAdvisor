import { Droplets } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SpringPressable } from "@/components/ui/animated-wrappers";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { usePalette } from "@/hooks/use-theme";
import type { UserPlant } from "@/types/plant";
import { getDaysUntilNextWater } from "@/utils/watering";

export type HydrationTone = "fresh" | "filling" | "due_today" | "overdue";

export interface HydrationMetrics {
  /** Normalized fill from 0 to 1 (0 = freshly watered, 1 = filled & ready to water). */
  fillRatio: number;
  /** Visual fill percentage for bar rendering (keeps a subtle sliver when freshly watered). */
  displayFill: number;
  daysRemaining: number;
  isFilled: boolean;
  tone: HydrationTone;
}

/**
 * Computes how full the watering progress bar is (0% right after watering -> 100% when due/overdue).
 */
export function computeHydrationMetrics(
  plant: Pick<UserPlant, "lastWateredAt" | "customWateringIntervalDays">,
  now: Date = new Date(),
): HydrationMetrics {
  const interval = Math.max(1, plant.customWateringIntervalDays || 7);
  const daysRemaining = getDaysUntilNextWater(plant, now.getTime());
  const elapsed = interval - daysRemaining;
  const fillRatio = Math.max(0, Math.min(1, elapsed / interval));
  const isFilled = daysRemaining <= 0;

  let tone: HydrationTone = "filling";
  if (daysRemaining < 0) {
    tone = "overdue";
  } else if (daysRemaining === 0) {
    tone = "due_today";
  } else if (fillRatio <= 0.15) {
    tone = "fresh";
  }

  const displayFill = isFilled ? 1 : fillRatio;

  return { fillRatio, displayFill, daysRemaining, isFilled, tone };
}

interface HydrationBarProps {
  plant: Pick<UserPlant, "lastWateredAt" | "customWateringIntervalDays">;
  compact?: boolean;
}

/**
 * Soft-blue animated watering progress bar that fills from 0% (just watered)
 * up to 100% when the plant is ready to be watered.
 */
export function HydrationBar({ plant, compact = false }: HydrationBarProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const { displayFill, isFilled } = computeHydrationMetrics(plant);

  const fillProgress = useSharedValue(displayFill);

  useEffect(() => {
    if (reducedMotion) {
      fillProgress.set(displayFill);
    } else {
      fillProgress.set(
        withTiming(displayFill, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [displayFill, fillProgress, reducedMotion]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(fillProgress.value * 100)}%`,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Watering cycle ${Math.round(displayFill * 100)}% full`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(displayFill * 100),
      }}
      style={[
        styles.track,
        compact ? styles.trackCompact : styles.trackDefault,
        { backgroundColor: palette.waterBlueSoft },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: palette.waterFill,
            opacity: isFilled ? 1 : 0.78,
          },
          animatedFillStyle,
        ]}
      />
    </View>
  );
}

interface WateringProgressPillProps {
  plant: Pick<
    UserPlant,
    "nickname" | "lastWateredAt" | "customWateringIntervalDays" | "species"
  >;
  onWaterNow: () => void;
  showInterval?: boolean;
}

/**
 * Combined "until water" progress bar + action button for compact cards.
 * Fills with a soft shade of blue as watering day approaches, and turns into
 * an interactive water button once the bar reaches 100%.
 */
export function WateringProgressPill({
  plant,
  onWaterNow,
  showInterval = false,
}: WateringProgressPillProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const { displayFill, daysRemaining, isFilled } =
    computeHydrationMetrics(plant);

  const fillProgress = useSharedValue(displayFill);

  useEffect(() => {
    if (reducedMotion) {
      fillProgress.set(displayFill);
    } else {
      fillProgress.set(
        withTiming(displayFill, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [displayFill, fillProgress, reducedMotion]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(fillProgress.value * 100)}%`,
  }));

  if (isFilled) {
    const actionLabel =
      plant.species.plantType === "propagation"
        ? "Refresh"
        : daysRemaining === 0
          ? "Water Today"
          : `${Math.abs(daysRemaining)}d Overdue`;

    return (
      <SpringPressable
        onPress={(e) => {
          e.stopPropagation();
          onWaterNow();
        }}
        style={[
          styles.pillBase,
          styles.waterActionPill,
          { backgroundColor: palette.waterBlue },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Water ${plant.nickname} now`}
      >
        <Droplets size={13} color={palette.textInverse} />
        <Text
          style={[styles.waterActionText, { color: palette.textInverse }]}
          numberOfLines={1}
        >
          {actionLabel}
        </Text>
      </SpringPressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${daysRemaining} days until water, ${Math.round(
        displayFill * 100,
      )}% through cycle`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(displayFill * 100),
      }}
      style={[
        styles.pillBase,
        styles.progressPill,
        {
          backgroundColor: palette.bgSubtle,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.progressPillFill,
          { backgroundColor: palette.waterFill },
          animatedFillStyle,
        ]}
      />
      <View style={styles.progressPillContent}>
        <Droplets size={12} color={palette.waterBlue} />
        <Text
          style={[styles.scheduleText, { color: palette.textPrimary }]}
          numberOfLines={1}
        >
          {showInterval
            ? `${daysRemaining}d until water · every ${plant.customWateringIntervalDays}d`
            : `${daysRemaining}d until water`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  trackDefault: {
    height: 6,
  },
  trackCompact: {
    height: 4,
  },
  fill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  pillBase: {
    borderRadius: Radius.md,
    overflow: "hidden",
    position: "relative",
  },
  waterActionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  waterActionText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  progressPill: {
    justifyContent: "center",
  },
  progressPillFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.42,
  },
  progressPillContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  scheduleText: {
    fontSize: Typography.caption.fontSize - 1,
    fontWeight: "600",
  },
});
