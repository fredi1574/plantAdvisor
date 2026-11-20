import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
  contained?: boolean;
}

/**
 * Reusable labeled boolean toggle row with optional bordered container styling.
 */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  contained = true,
}: SwitchRowProps) {
  const palette = usePalette();

  return (
    <View
      style={[
        styles.row,
        contained
          ? [
              styles.contained,
              {
                backgroundColor: palette.bgPrimary,
                borderColor: palette.borderSubtle,
              },
            ]
          : styles.plain,
      ]}>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: palette.textPrimary }]}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: palette.textSecondary }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: palette.borderSubtle,
          true: palette.primary,
        }}
        thumbColor={palette.textInverse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  contained: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  plain: {
    paddingVertical: Spacing.xs,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
  },
});
