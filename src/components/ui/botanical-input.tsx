import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface BotanicalInputProps extends TextInputProps {
  surface?: 'primary' | 'surface' | 'subtle';
  compact?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Theme-aware single-line TextInput with consistent border, radius, and placeholder colors.
 */
export function BotanicalInput({
  surface = 'surface',
  compact = true,
  style,
  placeholderTextColor,
  ...rest
}: BotanicalInputProps) {
  const palette = usePalette();

  const backgroundColor =
    surface === 'primary'
      ? palette.bgPrimary
      : surface === 'subtle'
        ? palette.bgSubtle
        : palette.bgSurface;

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? palette.textMuted}
      style={[
        styles.base,
        compact ? styles.compact : styles.regular,
        {
          backgroundColor,
          borderColor: palette.borderSubtle,
          color: palette.textPrimary,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: BorderWidth.hairline,
  },
  compact: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  regular: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 13,
  },
});
