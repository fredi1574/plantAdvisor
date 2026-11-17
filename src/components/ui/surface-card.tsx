import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  BorderWidth,
  CardShadow,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface SurfaceCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'glass' | 'nested';
}

/**
 * Reusable theme-aware card container for elevated cards, frosted glass panels,
 * and nested inset blocks.
 */
export function SurfaceCard({
  children,
  style,
  variant = 'elevated',
}: SurfaceCardProps) {
  const palette = usePalette();

  const surfaceColors =
    variant === 'glass'
      ? {
          backgroundColor: palette.glassSurface,
          borderColor: palette.glassBorder,
        }
      : variant === 'nested'
        ? {
            backgroundColor: palette.bgPrimary,
            borderColor: palette.borderSubtle,
          }
        : {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          };

  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'glass' && styles.glass,
        variant === 'nested' && styles.nested,
        surfaceColors,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: BorderWidth.hairline,
  },
  elevated: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    ...CardShadow,
  },
  glass: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...CardShadow,
  },
  nested: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
