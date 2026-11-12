/**
 * FloraLog — Botanical Design System Tokens (`DESIGN.md`)
 */

import '@/global.css';

import { Platform } from 'react-native';
import type { ActionUrgency, HealthStatus } from '@/types/plant';

export const LightPalette = {
  // Surfaces & Backgrounds
  bgPrimary: '#F7F5F0',
  bgSurface: '#FFFFFF',
  bgSubtle: '#EFECE4',
  bgElevated: '#E6E1D5',
  borderSubtle: '#DDD7C8',

  // Glass & Overlays
  glassSurface: 'rgba(255, 255, 255, 0.42)',
  glassBorder: 'rgba(221, 215, 200, 0.7)',
  scrimDark: 'rgba(28, 40, 32, 0.45)',
  leafWatermark: 'rgba(45, 90, 60, 0.065)',
  leafWatermarkSecondary: 'rgba(200, 109, 81, 0.055)',

  // Botanical Greens & Accents
  primary: '#2D5A3C',
  primarySoft: '#E3EFE6',
  primaryMuted: '#4E7A5B',
  primaryBorder: '#B8D8C0',
  accentTerracotta: '#C86D51',
  accentTerracottaSoft: '#F9EBE6',
  waterBlue: '#2E7D9B',
  waterBlueSoft: '#E4F2F7',

  // Typography
  textPrimary: '#1C2820',
  textSecondary: '#526056',
  textMuted: '#7A877D',
  textInverse: '#FFFFFF',

  // Status & Alert Tokens
  thrivingText: '#14532D',
  thrivingBg: '#DCFCE7',
  thrivingBorder: '#86EFAC',
  thrivingDot: '#16A34A',

  attentionText: '#7C2D12',
  attentionBg: '#FEF3C7',
  attentionBorder: '#FCD34D',
  attentionDot: '#D97706',

  criticalText: '#7F1D1D',
  criticalBg: '#FEE2E2',
  criticalBorder: '#FCA5A5',
  criticalDot: '#DC2626',

  waterAlertText: '#0C4A6E',
  waterAlertBg: '#E0F2FE',
  waterAlertBorder: '#7DD3FC',
} as const;

export const DarkPalette: Record<keyof typeof LightPalette, string> = {
  // Surfaces & Backgrounds ("Night Conservatory")
  bgPrimary: '#111713',
  bgSurface: '#1A231D',
  bgSubtle: '#222D25',
  bgElevated: '#2A382E',
  borderSubtle: '#314236',

  // Glass & Overlays
  glassSurface: 'rgba(26, 35, 29, 0.48)',
  glassBorder: 'rgba(65, 88, 72, 0.55)',
  scrimDark: 'rgba(10, 14, 11, 0.6)',
  leafWatermark: 'rgba(134, 239, 172, 0.05)',
  leafWatermarkSecondary: 'rgba(231, 143, 115, 0.045)',

  // Botanical Greens & Accents
  primary: '#52A36D',
  primarySoft: '#1D3324',
  primaryMuted: '#7AC491',
  primaryBorder: '#355E42',
  accentTerracotta: '#E0876B',
  accentTerracottaSoft: '#35221C',
  waterBlue: '#56B4D3',
  waterBlueSoft: '#162E38',

  // Typography
  textPrimary: '#E8EFE9',
  textSecondary: '#A8B8AC',
  textMuted: '#788A7D',
  textInverse: '#0E1410',

  // Status & Alert Tokens
  thrivingText: '#86EFAC',
  thrivingBg: '#143320',
  thrivingBorder: '#235937',
  thrivingDot: '#4ADE80',

  attentionText: '#FCD34D',
  attentionBg: '#362712',
  attentionBorder: '#66481E',
  attentionDot: '#FBBF24',

  criticalText: '#FCA5A5',
  criticalBg: '#3B1818',
  criticalBorder: '#6E2828',
  criticalDot: '#F87171',

  waterAlertText: '#7DD3FC',
  waterAlertBg: '#142B38',
  waterAlertBorder: '#234E66',
};

export type ThemePalette = typeof LightPalette | typeof DarkPalette;

/** Default light palette for static StyleSheet fallbacks */
export const Palette = LightPalette;

export function getHealthBadgeTheme(palette: ThemePalette): Record<
  HealthStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
> {
  return {
    thriving: {
      label: 'Thriving',
      text: palette.thrivingText,
      bg: palette.thrivingBg,
      border: palette.thrivingBorder,
      dot: palette.thrivingDot,
    },
    needs_attention: {
      label: 'Needs Attention',
      text: palette.attentionText,
      bg: palette.attentionBg,
      border: palette.attentionBorder,
      dot: palette.attentionDot,
    },
    critical: {
      label: 'Critical',
      text: palette.criticalText,
      bg: palette.criticalBg,
      border: palette.criticalBorder,
      dot: palette.criticalDot,
    },
  };
}

export function getUrgencyBadgeTheme(palette: ThemePalette): Record<
  ActionUrgency,
  { label: string; text: string; bg: string; border: string }
> {
  return {
    immediate: {
      label: 'Immediate',
      text: palette.criticalText,
      bg: palette.criticalBg,
      border: palette.criticalBorder,
    },
    soon: {
      label: 'Soon',
      text: palette.attentionText,
      bg: palette.attentionBg,
      border: palette.attentionBorder,
    },
    routine: {
      label: 'Routine',
      text: palette.primary,
      bg: palette.primarySoft,
      border: palette.primaryBorder,
    },
  };
}

export const HealthBadgeTheme = getHealthBadgeTheme(LightPalette);
export const UrgencyBadgeTheme = getUrgencyBadgeTheme(LightPalette);

export const Colors = {
  light: {
    text: LightPalette.textPrimary,
    background: LightPalette.bgPrimary,
    backgroundElement: LightPalette.bgSubtle,
    backgroundSelected: LightPalette.bgElevated,
    textSecondary: LightPalette.textSecondary,
  },
  dark: {
    text: DarkPalette.textPrimary,
    background: DarkPalette.bgPrimary,
    backgroundElement: DarkPalette.bgSubtle,
    backgroundSelected: DarkPalette.bgElevated,
    textSecondary: DarkPalette.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Typography = {
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.9,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  pageTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 28,
  full: 9999,
} as const;

export const BorderWidth = {
  hairline: 1,
  medium: 1.5,
} as const;

export const CardShadow = Platform.select({
  web: {
    boxShadow: '0px 4px 12px rgba(28, 40, 32, 0.05)',
  },
  default: {
    shadowColor: '#1C2820',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

export const FloatingShadow = Platform.select({
  web: {
    boxShadow: '0px 10px 28px rgba(28, 40, 32, 0.14)',
  },
  default: {
    shadowColor: '#1C2820',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

export const BottomTabInset = Platform.select({ ios: 86, android: 88, default: 84 });
export const MaxContentWidth = 760;
