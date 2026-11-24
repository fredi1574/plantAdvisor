import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {isEmptyGarden
          ? t('garden.empty.emptyTitle')
          : t('garden.empty.noMatchesTitle')}
      </Text>

      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        {isEmptyGarden
          ? t('garden.empty.emptySubtitle')
          : t('garden.empty.noMatchesSubtitle')}
      </Text>

      <SpringPressable
        onPress={() => {
          triggerLightHaptic();
          onAction();
        }}
        accessibilityRole="button"
        style={[styles.actionBtn, { backgroundColor: palette.primary }]}>
        <Text style={[styles.actionBtnText, { color: palette.textInverse }]}>
          {isEmptyGarden
            ? t('garden.empty.emptyAction')
            : t('garden.empty.noMatchesAction')}
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
