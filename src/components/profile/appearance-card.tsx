import { Globe, Monitor, Moon, Sun } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { LanguagePreference } from '@/i18n';
import { triggerLightHaptic } from '@/services/haptics';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useThemeStore, type ThemePreference } from '@/store/useThemeStore';

const THEME_OPTIONS = [
  { key: 'system', labelKey: 'profile.appearance.system', Icon: Monitor },
  { key: 'light', labelKey: 'profile.appearance.light', Icon: Sun },
  { key: 'dark', labelKey: 'profile.appearance.dark', Icon: Moon },
] as const satisfies readonly {
  key: ThemePreference;
  labelKey: string;
  Icon: typeof Sun;
}[];

const LANGUAGE_OPTIONS = [
  { key: 'system', labelKey: 'profile.language.system', badge: null },
  { key: 'en', labelKey: 'profile.language.en', badge: 'EN' },
  { key: 'ru', labelKey: 'profile.language.ru', badge: 'RU' },
] as const satisfies readonly {
  key: LanguagePreference;
  labelKey: string;
  badge: string | null;
}[];

interface AppearanceCardProps {
  onShowToast: (message: string) => void;
}

/**
 * Inset grouped Light / Dark / System theme and language switcher.
 */
export function AppearanceCard({ onShowToast }: AppearanceCardProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const languagePreference = useLanguageStore((s) => s.preference);
  const setLanguagePreference = useLanguageStore((s) => s.setPreference);

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
        {t('profile.appearance.eyebrow')}
      </Text>

      <View
        style={[
          styles.groupedBox,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <View style={styles.row}>
          {THEME_OPTIONS.map(({ key, labelKey, Icon }) => {
            const isSelected = themePreference === key;
            const label = t(labelKey);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  triggerLightHaptic();
                  setThemePreference(key);
                  onShowToast(t('profile.appearance.toast', { label }));
                }}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? palette.primary
                      : palette.bgPrimary,
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

        <View
          style={[styles.divider, { backgroundColor: palette.borderSubtle }]}
        />

        <View style={styles.row}>
          {LANGUAGE_OPTIONS.map(({ key, labelKey, badge }) => {
            const isSelected = languagePreference === key;
            const label = t(labelKey);
            const iconColor = isSelected
              ? palette.textInverse
              : palette.textSecondary;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  triggerLightHaptic();
                  setLanguagePreference(key);
                  onShowToast(t('profile.language.toast', { label }));
                }}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? palette.primary
                      : palette.bgPrimary,
                    borderColor: isSelected
                      ? palette.primary
                      : palette.borderSubtle,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}>
                {badge ? (
                  <Text style={[styles.langBadge, { color: iconColor }]}>
                    {badge}
                  </Text>
                ) : (
                  <Globe size={14} color={iconColor} />
                )}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.eyebrow,
    paddingHorizontal: Spacing.xs,
  },
  groupedBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  divider: {
    height: BorderWidth.hairline,
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
  langBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
