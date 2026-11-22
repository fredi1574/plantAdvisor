import { AlertCircle, CheckCircle2, Undo2 } from 'lucide-react-native';
import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import {
  BorderWidth,
  BottomTabInset,
  FloatingShadow,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { ToastAction } from '@/hooks/use-toast';

interface FeedbackBannerProps {
  message: string | null;
  variant?: 'success' | 'error';
  action?: ToastAction | null;
  onDismiss?: () => void;
  /** Render as a floating overlay toast at zIndex 9999 detached from page flow. */
  floating?: boolean;
  /** Extra bottom offset above safe-area inset (defaults to BottomTabInset to clear the floating tab bar). */
  bottomOffset?: number;
}

/**
 * Reusable themed feedback banner for success confirmations, optional Undo actions,
 * and inline errors. Pass `floating` for detached bottom-of-screen toast notifications.
 */
export function FeedbackBanner({
  message,
  variant = 'success',
  action,
  onDismiss,
  floating = false,
  bottomOffset = BottomTabInset,
}: FeedbackBannerProps) {
  const palette = usePalette();
  const insets = useContext(SafeAreaInsetsContext);
  const bottomInset = insets?.bottom ?? 0;
  const reducedMotion = useReducedMotion();

  if (!message) {
    return null;
  }

  const isError = variant === 'error';
  const bgColor = isError ? palette.criticalBg : palette.thrivingBg;
  const borderColor = isError ? palette.criticalBorder : palette.thrivingBorder;
  const textColor = isError ? palette.criticalText : palette.thrivingText;

  const bannerContent = (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        floating && styles.floatingBanner,
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
      {action ? (
        <SpringPressable
          onPress={() => {
            action.onPress();
            onDismiss?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={[
            styles.actionBtn,
            {
              backgroundColor: palette.bgSurface,
              borderColor,
            },
          ]}>
          <Undo2 size={13} color={textColor} />
          <Text style={[styles.actionBtnText, { color: textColor }]}>
            {action.label}
          </Text>
        </SpringPressable>
      ) : null}
    </View>
  );

  if (!floating) {
    return bannerContent;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingWrapper,
        { bottom: bottomInset + bottomOffset },
      ]}>
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(220)}
        exiting={reducedMotion ? undefined : FadeOutDown.duration(180)}
        style={styles.floatingInner}>
        {bannerContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  floatingInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.md + Spacing.half,
    paddingVertical: Spacing.sm + Spacing.half,
    borderRadius: Radius.md,
  },
  floatingBanner: {
    ...FloatingShadow,
  },
  text: {
    flex: 1,
    fontSize: Typography.body.fontSize - 1,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
  },
  actionBtnText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
  },
});
