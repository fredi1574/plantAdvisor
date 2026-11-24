import { Image } from 'expo-image';
import { AlertCircle, AlertTriangle } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getHealthBadgeTheme, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { HealthStatus } from '@/types/plant';

interface PlantStatusPhotoProps {
  uri: string;
  alt: string;
  status: HealthStatus;
  variant?: 'thumbnail' | 'grid';
}

/**
 * Slightly rounded specimen photo with an accessible corner alert pip
 * on Needs Attention and Critical plants (paired with a status-colored card border).
 */
export function PlantStatusPhoto({
  uri,
  alt,
  status,
  variant = 'thumbnail',
}: PlantStatusPhotoProps) {
  const palette = usePalette();
  const theme = useMemo(
    () => getHealthBadgeTheme(palette)[status],
    [palette, status]
  );

  const isAlert = status !== 'thriving';
  const isCritical = status === 'critical';
  const isGrid = variant === 'grid';

  return (
    <View
      accessible
      accessibilityLabel={`${alt}, ${theme.label}`}
      style={isGrid ? styles.gridFrame : styles.thumbFrame}>
      <Image
        source={{ uri }}
        style={[
          isGrid ? styles.gridPhoto : styles.thumbPhoto,
          { backgroundColor: palette.bgSubtle },
        ]}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
      />

      {isAlert && (
        <View
          testID="status-alert-pip"
          style={[
            isGrid ? styles.gridAlertPip : styles.thumbAlertPip,
            {
              backgroundColor: theme.dot,
              borderColor: palette.bgSurface,
            },
          ]}>
          {isCritical ? (
            <AlertTriangle
              size={isGrid ? 12 : 11}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          ) : (
            <AlertCircle
              size={isGrid ? 12 : 11}
              color="#FFFFFF"
              strokeWidth={2.5}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbFrame: {
    width: 78,
    height: 78,
    position: 'relative',
  },
  thumbPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  thumbAlertPip: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFrame: {
    width: '100%',
    aspectRatio: 1.1,
    position: 'relative',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  gridAlertPip: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
