import { CloudOff, CloudUpload, RefreshCw } from 'lucide-react-native';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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

interface SyncStatusBannerProps {
  visible: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  localPhotoCount?: number;
  syncError: string | null;
  onSyncNow: () => void;
  /** Render as a floating toast notification detached from page flow. */
  floating?: boolean;
  /** Extra bottom offset above safe-area inset (defaults to BottomTabInset). */
  bottomOffset?: number;
}

/**
 * Compact banner/toast surfacing queued offline mutations, unuploaded local photos,
 * or cloud sync errors with a one-tap retry action.
 */
export function SyncStatusBanner({
  visible,
  isSyncing,
  pendingSyncCount,
  localPhotoCount = 0,
  syncError,
  onSyncNow,
  floating = false,
  bottomOffset = BottomTabInset,
}: SyncStatusBannerProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useContext(SafeAreaInsetsContext);
  const bottomInset = insets?.bottom ?? 0;
  const reducedMotion = useReducedMotion();

  const shouldShow =
    visible &&
    (isSyncing || pendingSyncCount > 0 || localPhotoCount > 0 || Boolean(syncError));

  if (!shouldShow) {
    return null;
  }

  const hasWarning = !isSyncing && (Boolean(syncError) || pendingSyncCount > 0 || localPhotoCount > 0);
  const bgColor = hasWarning ? palette.attentionBg : palette.primarySoft;
  const borderColor = hasWarning ? palette.attentionBorder : palette.primaryBorder;
  const accentColor = hasWarning ? palette.attentionText : palette.primary;

  let statusLabel = t('syncBanner.syncing');
  if (!isSyncing) {
    const parts: string[] = [];
    if (pendingSyncCount > 0) {
      parts.push(t('syncBanner.changesPending', { count: pendingSyncCount }));
    }
    if (localPhotoCount > 0) {
      parts.push(t('syncBanner.photosWaiting', { count: localPhotoCount }));
    }

    if (parts.length > 0) {
      statusLabel = parts.join(' · ');
    } else if (syncError) {
      statusLabel = syncError;
    }
  }

  const content = (
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
      <View style={styles.leftRow}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : syncError ? (
          <CloudOff size={16} color={accentColor} />
        ) : (
          <CloudUpload size={16} color={accentColor} />
        )}
        <Text
          style={[styles.label, { color: accentColor }]}
          numberOfLines={2}>
          {statusLabel}
        </Text>
      </View>

      <Pressable
        onPress={onSyncNow}
        disabled={isSyncing}
        style={({ pressed }) => [
          styles.actionBtn,
          {
            backgroundColor: palette.bgSurface,
            borderColor,
          },
          isSyncing && styles.disabledBtn,
          pressed && !isSyncing && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Sync garden now">
        <RefreshCw size={12} color={accentColor} />
        <Text style={[styles.actionText, { color: accentColor }]}>
          {isSyncing ? t('syncBanner.syncingShort') : t('syncBanner.syncNow')}
        </Text>
      </Pressable>
    </View>
  );

  if (!floating) {
    return content;
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
        {content}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9998,
    elevation: 9998,
    alignItems: 'center',
  },
  floatingInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  floatingBanner: {
    ...FloatingShadow,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
