import { CloudOff, CloudUpload, RefreshCw } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface SyncStatusBannerProps {
  visible: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  localPhotoCount?: number;
  syncError: string | null;
  onSyncNow: () => void;
}

/**
 * Compact banner surfacing queued offline mutations, unuploaded local photos,
 * or cloud sync errors with a one-tap retry action.
 */
export function SyncStatusBanner({
  visible,
  isSyncing,
  pendingSyncCount,
  localPhotoCount = 0,
  syncError,
  onSyncNow,
}: SyncStatusBannerProps) {
  const palette = usePalette();

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

  let statusLabel = 'Syncing with Supabase...';
  if (!isSyncing) {
    const parts: string[] = [];
    if (pendingSyncCount > 0) {
      parts.push(
        `${pendingSyncCount} ${pendingSyncCount === 1 ? 'change' : 'changes'} pending`
      );
    }
    if (localPhotoCount > 0) {
      parts.push(
        `${localPhotoCount} ${localPhotoCount === 1 ? 'photo' : 'photos'} waiting to upload`
      );
    }

    if (parts.length > 0) {
      statusLabel = parts.join(' · ');
    } else if (syncError) {
      statusLabel = syncError;
    }
  }

  return (
    <View
      style={[
        styles.banner,
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
          {isSyncing ? 'Syncing' : 'Sync Now'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
