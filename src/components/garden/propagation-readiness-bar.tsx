import { CheckCircle2, Sprout } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { NotebookEntry } from '@/types/plant';

/** Target root length (cm) where most water/moss propagations are ready to pot into soil. */
export const PROPAGATION_READY_ROOT_CM = 5;

export type PropagationStage = 'unmeasured' | 'early' | 'developing' | 'ready';

export interface PropagationReadiness {
  rootLengthCm: number | null;
  targetCm: number;
  progress: number;
  stage: PropagationStage;
  statusLabel: string;
}

/**
 * Finds the most recent `metrics.rootLengthCm` logged for a given plant.
 */
export function getLatestRootLengthCm(
  entries: NotebookEntry[],
  plantId: string
): number | null {
  let latestTimestamp = -Infinity;
  let latestValue: number | null = null;

  for (const entry of entries) {
    if (entry.plantId !== plantId) continue;
    const rootCm = entry.metrics?.rootLengthCm;
    if (typeof rootCm !== 'number' || Number.isNaN(rootCm)) continue;

    const ts = new Date(entry.timestamp).getTime();
    if (ts >= latestTimestamp) {
      latestTimestamp = ts;
      latestValue = rootCm;
    }
  }

  return latestValue;
}

/**
 * Computes root-length readiness progress toward potting (default target: 5 cm).
 */
export function computePropagationReadiness(
  rootLengthCm: number | null,
  targetCm = PROPAGATION_READY_ROOT_CM
): PropagationReadiness {
  if (rootLengthCm === null) {
    return {
      rootLengthCm: null,
      targetCm,
      progress: 0,
      stage: 'unmeasured',
      statusLabel: 'Log roots',
    };
  }

  const clamped = Math.max(0, rootLengthCm);
  const progress = Math.min(1, clamped / targetCm);

  if (clamped >= targetCm) {
    return {
      rootLengthCm: clamped,
      targetCm,
      progress: 1,
      stage: 'ready',
      statusLabel: 'Ready to pot!',
    };
  }

  if (clamped >= targetCm * 0.5) {
    return {
      rootLengthCm: clamped,
      targetCm,
      progress,
      stage: 'developing',
      statusLabel: 'Developing',
    };
  }

  return {
    rootLengthCm: clamped,
    targetCm,
    progress,
    stage: 'early',
    statusLabel: 'Rooting',
  };
}

interface PropagationReadinessBarProps {
  rootLengthCm: number | null;
  compact?: boolean;
}

/**
 * Root-length readiness progress indicator for the Propagation Bench view.
 */
export function PropagationReadinessBar({
  rootLengthCm,
  compact = false,
}: PropagationReadinessBarProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const readiness = computePropagationReadiness(rootLengthCm);

  const isReady = readiness.stage === 'ready';
  const fillColor = isReady
    ? palette.thrivingDot
    : readiness.stage === 'developing'
      ? palette.primary
      : palette.accentTerracotta;

  const badgeBg = isReady
    ? palette.thrivingBg
    : readiness.stage === 'unmeasured'
      ? palette.bgSubtle
      : palette.accentTerracottaSoft;

  const badgeText = isReady
    ? palette.thrivingText
    : readiness.stage === 'unmeasured'
      ? palette.textMuted
      : palette.accentTerracotta;

  const percent = Math.round(readiness.progress * 100);
  const localizedStatus = t(`garden.propagation.stage.${readiness.stage}`);

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: palette.bgPrimary,
          borderColor: isReady ? palette.thrivingBorder : palette.borderSubtle,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          {isReady ? (
            <CheckCircle2 size={13} color={palette.thrivingDot} />
          ) : (
            <Sprout size={13} color={fillColor} />
          )}
          <Text
            style={[
              styles.label,
              { color: palette.textPrimary },
              compact && styles.labelCompact,
            ]}
            numberOfLines={1}>
            {readiness.rootLengthCm !== null
              ? t('garden.propagation.rootsLabel', {
                  current: readiness.rootLengthCm.toFixed(1),
                  target: readiness.targetCm,
                })
              : t('garden.propagation.rootReadiness')}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Text
            style={[styles.statusBadgeText, { color: badgeText }]}
            numberOfLines={1}>
            {localizedStatus}
          </Text>
        </View>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={
          readiness.rootLengthCm !== null
            ? `Root length ${readiness.rootLengthCm} of ${readiness.targetCm} centimeters, ${readiness.statusLabel}`
            : 'No root length logged yet'
        }
        accessibilityValue={{
          min: 0,
          max: readiness.targetCm,
          now: readiness.rootLengthCm ?? 0,
        }}
        style={[styles.track, { backgroundColor: palette.bgSubtle }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  containerCompact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 11,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
