import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import {
  PottedSucculentIllustration,
  SproutSearchIllustration,
} from '@/components/ui/botanical-illustrations';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';

interface GardenEmptyStateProps {
  variant: 'empty-garden' | 'no-matches';
  onAction: () => void;
}

/**
 * Reusable empty-state card for an empty conservatory or a zero-result filter/search query.
 */
export function GardenEmptyState({ variant, onAction }: GardenEmptyStateProps) {
  const palette = usePalette();
  const isEmptyGarden = variant === 'empty-garden';

  return (
    <SurfaceCard style={styles.card}>
      {isEmptyGarden ? (
        <PottedSucculentIllustration size={108} />
      ) : (
        <SproutSearchIllustration size={102} />
      )}

      <Text
        style={[
          styles.title,
          { color: palette.textPrimary, fontFamily: Fonts?.serif },
        ]}>
        {isEmptyGarden ? 'Your garden is empty' : 'Nothing matches this view'}
      </Text>

      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        {isEmptyGarden
          ? 'Identify or snap a photo of your first plant to start tracking watering schedules and AI health scans.'
          : 'Your garden is looking calm here. Reset filters and search to see every specimen.'}
      </Text>

      <SpringPressable
        onPress={() => {
          triggerLightHaptic();
          onAction();
        }}
        accessibilityRole="button"
        style={[styles.actionBtn, { backgroundColor: palette.primary }]}>
        <Text style={[styles.actionBtnText, { color: palette.textInverse }]}>
          {isEmptyGarden ? 'Identify Your First Plant' : 'Show All Plants'}
        </Text>
      </SpringPressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.sectionTitle,
    marginTop: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionBtn: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
  },
  actionBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
