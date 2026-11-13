import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'subtle';
}

/**
 * Reusable theme-aware frosted glass card surface for Light and Dark modes.
 */
export function GlassCard({
  children,
  style,
  variant = 'default',
}: GlassCardProps) {
  const palette = usePalette();

  const isSubtle = variant === 'subtle';

  return (
    <View
      style={[
        styles.card,
        isSubtle && styles.cardSubtle,
        {
          backgroundColor: isSubtle ? palette.bgSubtle : palette.glassSurface,
          borderColor: isSubtle ? palette.borderSubtle : palette.glassBorder,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  cardSubtle: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
