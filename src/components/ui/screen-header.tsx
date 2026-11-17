import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
}

/**
 * Reusable editorial screen header with eyebrow label, serif title, and optional right controls.
 */
export function ScreenHeader({
  eyebrow,
  title,
  icon,
  rightSlot,
}: ScreenHeaderProps) {
  const palette = usePalette();

  return (
    <View style={styles.row}>
      <View style={styles.titleBlock}>
        <View style={styles.eyebrowRow}>
          {icon}
          <Text style={[styles.eyebrow, { color: palette.primary }]}>
            {eyebrow}
          </Text>
        </View>
        <Text
          style={[
            styles.title,
            { color: palette.textPrimary, fontFamily: Fonts?.serif },
          ]}>
          {title}
        </Text>
      </View>
      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.half,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  title: {
    ...Typography.pageTitle,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
