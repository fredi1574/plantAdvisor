import { type ErrorBoundaryProps, router } from 'expo-router';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

/**
 * Branded Expo Router ErrorBoundary recovery screen.
 * Exported from `src/app/_layout.tsx` to catch unexpected route rendering errors.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    try {
      router.replace('/(tabs)');
    } catch {
      void handleRetry();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}>
      <View style={styles.container}>
        <SurfaceCard style={styles.card}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: palette.criticalBg,
                borderColor: palette.criticalBorder,
              },
            ]}>
            <AlertTriangle size={24} color={palette.criticalText} />
          </View>

          <Text
            style={[styles.title, { color: palette.textPrimary }]}
            accessibilityRole="header">
            {t('errorBoundary.title')}
          </Text>

          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            {t('errorBoundary.subtitle')}
          </Text>

          {error?.message ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <Text
                style={[styles.errorText, { color: palette.textSecondary }]}
                numberOfLines={4}>
                {error.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={() => void handleRetry()}
              disabled={isRetrying}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: palette.primary },
                (pressed || isRetrying) && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityState={{ busy: isRetrying, disabled: isRetrying }}>
              {isRetrying ? (
                <ActivityIndicator size="small" color={palette.textInverse} />
              ) : (
                <RefreshCw size={16} color={palette.textInverse} />
              )}
              <Text
                style={[styles.primaryBtnText, { color: palette.textInverse }]}>
                {isRetrying
                  ? t('errorBoundary.retrying')
                  : t('errorBoundary.tryAgain')}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGoHome}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Return to My Garden">
              <Home size={15} color={palette.textPrimary} />
              <Text
                style={[styles.secondaryBtnText, { color: palette.textPrimary }]}>
                {t('errorBoundary.returnGarden')}
              </Text>
            </Pressable>
          </View>
        </SurfaceCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 440),
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
