import { CheckCircle2, Sprout } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

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
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isEmptyGarden
              ? palette.primarySoft
              : palette.thrivingBg,
          },
        ]}>
        {isEmptyGarden ? (
          <Sprout size={24} color={palette.primary} />
        ) : (
          <CheckCircle2 size={24} color={palette.primary} />
        )}
      </View>

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

      <Pressable
        onPress={onAction}
        style={({ pressed }) => [
          styles.actionBtn,
          { backgroundColor: palette.primary },
          pressed && { opacity: 0.85 },
        ]}>
        <Text style={[styles.actionBtnText, { color: palette.textInverse }]}>
          {isEmptyGarden ? 'Identify Your First Plant' : 'Show All Plants'}
        </Text>
      </Pressable>
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
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.sectionTitle,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionBtn: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  actionBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
