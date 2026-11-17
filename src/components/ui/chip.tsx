import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface ChipProps {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  variant?: 'surface' | 'subtle' | 'primarySoft';
  selected?: boolean;
  selectedStyle?: 'soft' | 'solid';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Compact pill button / selectable filter chip with built-in theme and active states.
 */
export function Chip({
  label,
  onPress,
  icon,
  variant = 'surface',
  selected = false,
  selectedStyle = 'soft',
  size = 'sm',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ChipProps) {
  const palette = usePalette();

  let backgroundColor: string = palette.bgSurface;
  let borderColor: string = palette.borderSubtle;
  let textColor: string = palette.textSecondary;

  if (variant === 'subtle') {
    backgroundColor = palette.bgSubtle;
    textColor = palette.textPrimary;
  } else if (variant === 'primarySoft') {
    backgroundColor = palette.primarySoft;
    borderColor = palette.primaryBorder;
    textColor = palette.primary;
  }

  if (selected) {
    if (selectedStyle === 'solid') {
      backgroundColor = palette.primary;
      borderColor = palette.primary;
      textColor = palette.textInverse;
    } else {
      backgroundColor = palette.primarySoft;
      borderColor = palette.primary;
      textColor = palette.primary;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.sizeMd : styles.sizeSm,
        { backgroundColor, borderColor },
        pressed && onPress && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              size === 'md' ? styles.labelMd : styles.labelSm,
              { color: textColor },
              textStyle,
            ]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  sizeSm: {
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sizeMd: {
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
