import { Monitor, Moon, Sun } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useThemeStore, type ThemePreference } from '@/store/useThemeStore';

const THEME_OPTIONS = [
  { key: 'system', label: 'System', Icon: Monitor },
  { key: 'light', label: 'Light', Icon: Sun },
  { key: 'dark', label: 'Dark', Icon: Moon },
] as const satisfies readonly {
  key: ThemePreference;
  label: string;
  Icon: typeof Sun;
}[];

interface AppearanceCardProps {
  onShowToast: (message: string) => void;
}

/**
 * Light / Dark / System theme switcher card.
 */
export function AppearanceCard({ onShowToast }: AppearanceCardProps) {
  const palette = usePalette();
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.sectionTitleRow}>
        <Sun size={17} color={palette.primary} />
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Appearance
        </Text>
      </View>
      <Text style={[styles.description, { color: palette.textSecondary }]}>
        Choose Light, Dark (Night Conservatory), or follow your device system
        setting.
      </Text>

      <View style={styles.row}>
        {THEME_OPTIONS.map(({ key, label, Icon }) => {
          const isSelected = themePreference === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                setThemePreference(key);
                onShowToast(`Theme set to ${label}.`);
              }}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: isSelected
                    ? palette.primary
                    : palette.bgSubtle,
                  borderColor: isSelected
                    ? palette.primary
                    : palette.borderSubtle,
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}>
              <Icon
                size={14}
                color={
                  isSelected ? palette.textInverse : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected
                      ? palette.textInverse
                      : palette.textPrimary,
                  },
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + Spacing.half,
    paddingVertical: Spacing.sm + Spacing.half,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  pillText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
