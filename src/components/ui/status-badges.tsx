import {
  Droplets,
  FileText,
  FlaskConical,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  BorderWidth,
  getHealthBadgeTheme,
  getUrgencyBadgeTheme,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type {
  ActionUrgency,
  CareEventType,
  HealthStatus,
} from '@/types/plant';

interface HealthStatusBadgeProps {
  status: HealthStatus;
  showDot?: boolean;
}

/**
 * High-contrast botanical health status pill (Thriving / Needs Attention / Critical).
 */
export function HealthStatusBadge({
  status,
  showDot = true,
}: HealthStatusBadgeProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const theme = useMemo(
    () => getHealthBadgeTheme(palette)[status],
    [palette, status]
  );

  return (
    <View
      style={[
        styles.healthBadge,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}>
      {showDot && (
        <View style={[styles.statusDot, { backgroundColor: theme.dot }]} />
      )}
      <Text style={[styles.healthText, { color: theme.text }]}>
        {t(`badges.health.${status}`)}
      </Text>
    </View>
  );
}

interface UrgencyBadgeProps {
  urgency: ActionUrgency;
}

/**
 * Compact urgency badge for AI diagnostic action items (Immediate / Soon / Routine).
 */
export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const theme = useMemo(
    () => getUrgencyBadgeTheme(palette)[urgency],
    [palette, urgency]
  );

  return (
    <View
      style={[
        styles.urgencyBadge,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}>
      <Text style={[styles.urgencyText, { color: theme.text }]}>
        {t(`badges.urgency.${urgency}`)}
      </Text>
    </View>
  );
}

interface SucculentGuardrailBannerProps {
  message: string;
}

/**
 * Amber guardrail callout warning against misting or shallow watering on succulents/cacti.
 */
export function SucculentGuardrailBanner({
  message,
}: SucculentGuardrailBannerProps) {
  const palette = usePalette();

  return (
    <View
      style={[
        styles.guardrailBox,
        {
          backgroundColor: palette.attentionBg,
          borderColor: palette.attentionBorder,
        },
      ]}>
      <ShieldAlert size={16} color={palette.attentionText} />
      <Text style={[styles.guardrailText, { color: palette.attentionText }]}>
        {message}
      </Text>
    </View>
  );
}

interface CareEventIconProps {
  eventType: CareEventType;
  size?: number;
  color: string;
}

/**
 * Maps any `CareEventType` to its canonical Lucide icon.
 */
export function CareEventIcon({
  eventType,
  size = 14,
  color,
}: CareEventIconProps) {
  switch (eventType) {
    case 'water':
      return <Droplets size={size} color={color} />;
    case 'fertilize':
      return <FlaskConical size={size} color={color} />;
    case 'prune':
      return <Scissors size={size} color={color} />;
    case 'propagation':
    case 'repot':
      return <Sprout size={size} color={color} />;
    case 'ai_scan':
      return <Sparkles size={size} color={color} />;
    case 'note':
    default:
      return <FileText size={size} color={color} />;
  }
}

const styles = StyleSheet.create({
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  urgencyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: BorderWidth.hairline,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  guardrailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    padding: 11,
    borderRadius: Radius.md,
  },
  guardrailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});
