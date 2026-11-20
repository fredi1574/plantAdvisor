import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface FeedbackBannerProps {
  message: string | null;
  variant?: 'success' | 'error';
}

/**
 * Reusable themed feedback banner for success confirmations and inline errors.
 */
export function FeedbackBanner({
  message,
  variant = 'success',
}: FeedbackBannerProps) {
  const palette = usePalette();

  if (!message) {
    return null;
  }

  const isError = variant === 'error';
  const bgColor = isError ? palette.criticalBg : palette.thrivingBg;
  const borderColor = isError ? palette.criticalBorder : palette.thrivingBorder;
  const textColor = isError ? palette.criticalText : palette.thrivingText;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          backgroundColor: bgColor,
          borderColor,
        },
      ]}>
      {isError ? (
        <AlertCircle size={16} color={textColor} />
      ) : (
        <CheckCircle2 size={16} color={textColor} />
      )}
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
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
