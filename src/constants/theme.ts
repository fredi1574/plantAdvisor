/**
 * FloraLog — Botanical Design System Tokens (`DESIGN.md`)
 */

import '@/global.css';

import { Platform } from 'react-native';
import type { ActionUrgency, HealthStatus } from '@/types/plant';

export const Palette = {
  // Surfaces & Backgrounds
  bgPrimary: '#F7F5F0',
  bgSurface: '#FFFFFF',
  bgSubtle: '#EFECE4',
  bgElevated: '#E6E1D5',
  borderSubtle: '#DDD7C8',

  // Botanical Greens & Accents
  primary: '#2D5A3C',
  primarySoft: '#E3EFE6',
  primaryMuted: '#4E7A5B',
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

  attentionText: '#7C2D12',
  attentionBg: '#FEF3C7',
  attentionBorder: '#FCD34D',

  criticalText: '#7F1D1D',
  criticalBg: '#FEE2E2',
  criticalBorder: '#FCA5A5',

  waterAlertText: '#0C4A6E',
  waterAlertBg: '#E0F2FE',
  waterAlertBorder: '#7DD3FC',
} as const;

export const HealthBadgeTheme: Record<
  HealthStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  thriving: {
    label: 'Thriving',
    text: Palette.thrivingText,
    bg: Palette.thrivingBg,
    border: Palette.thrivingBorder,
    dot: '#16A34A',
  },
  needs_attention: {
    label: 'Needs Attention',
    text: Palette.attentionText,
    bg: Palette.attentionBg,
    border: Palette.attentionBorder,
    dot: '#D97706',
  },
  critical: {
    label: 'Critical',
    text: Palette.criticalText,
    bg: Palette.criticalBg,
    border: Palette.criticalBorder,
    dot: '#DC2626',
  },
};

export const UrgencyBadgeTheme: Record<
  ActionUrgency,
  { label: string; text: string; bg: string; border: string }
> = {
  immediate: {
    label: 'Immediate',
    text: Palette.criticalText,
    bg: Palette.criticalBg,
    border: Palette.criticalBorder,
  },
  soon: {
    label: 'Soon',
    text: Palette.attentionText,
    bg: Palette.attentionBg,
    border: Palette.attentionBorder,
  },
  routine: {
    label: 'Routine',
    text: Palette.primary,
    bg: Palette.primarySoft,
    border: '#B8D8C0',
  },
};

export const Colors = {
  light: {
    text: Palette.textPrimary,
    background: Palette.bgPrimary,
    backgroundElement: Palette.bgSubtle,
    backgroundSelected: Palette.bgElevated,
    textSecondary: Palette.textSecondary,
  },
  dark: {
    text: Palette.textPrimary,
    background: Palette.bgPrimary,
    backgroundElement: Palette.bgSubtle,
    backgroundSelected: Palette.bgElevated,
    textSecondary: Palette.textSecondary,
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
  full: 9999,
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 760;
