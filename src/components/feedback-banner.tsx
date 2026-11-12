import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface FeedbackBannerProps {
  message: string | null;
}

/**
 * Reusable themed confirmation banner shown after care or profile actions.
 */
export function FeedbackBanner({ message }: FeedbackBannerProps) {
  const palette = usePalette();

  if (!message) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: palette.thrivingBg,
          borderColor: palette.thrivingBorder,
        },
      ]}>
      <CheckCircle2 size={16} color={palette.thrivingText} />
      <Text style={[styles.text, { color: palette.thrivingText }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.md + Spacing.half,
    paddingVertical: Spacing.sm + Spacing.half,
    borderRadius: Radius.md,
  },
  text: {
    flex: 1,
    fontSize: Typography.body.fontSize - 1,
    fontWeight: '700',
  },
});
