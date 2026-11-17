import { AlertTriangle, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  BorderWidth,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { PetSafetyInfo } from '@/types/plant';

interface PetSafetyBadgeProps {
  petSafety?: PetSafetyInfo;
  showDetails?: boolean;
  compact?: boolean;
}

export function PetSafetyBadge({
  petSafety,
  showDetails = false,
  compact = false,
}: PetSafetyBadgeProps) {
  const palette = usePalette();

  if (!petSafety) {
    return null;
  }

  const isSafe =
    petSafety.toxicityLevel === 'safe' &&
    !petSafety.isToxicToCats &&
    !petSafety.isToxicToDogs;

  const isSevere = petSafety.toxicityLevel === 'severe';
  const accentColor = isSafe
    ? palette.primary
    : isSevere
      ? palette.criticalText
      : palette.attentionText;
  const bgColor = isSafe
    ? palette.primarySoft
    : isSevere
      ? palette.criticalBg
      : palette.attentionBg;
  const borderColor = isSafe
    ? palette.primaryBorder
    : isSevere
      ? palette.criticalBorder
      : palette.attentionBorder;

  const targetList: string[] = [];
  if (petSafety.isToxicToCats) targetList.push('Cats');
  if (petSafety.isToxicToDogs) targetList.push('Dogs');

  const label = isSafe
    ? 'Pet Safe (Cats & Dogs)'
    : `Toxic to ${targetList.length > 0 ? targetList.join(' & ') : 'Pets'} · ${
        petSafety.toxicityLevel.charAt(0).toUpperCase() +
        petSafety.toxicityLevel.slice(1)
      }`;

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: bgColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.headerRow}>
        {isSafe ? (
          <ShieldCheck size={14} color={accentColor} strokeWidth={2.2} />
        ) : (
          <AlertTriangle size={14} color={accentColor} strokeWidth={2.2} />
        )}
        <Text
          style={[
            styles.badgeText,
            compact && styles.badgeTextCompact,
            { color: accentColor },
          ]}
        >
          {label}
        </Text>
      </View>

      {showDetails && (
        <View style={styles.detailsBox}>
          {!isSafe && petSafety.toxicPrinciples ? (
            <Text style={[styles.principleText, { color: palette.textPrimary }]}>
              Compound: {petSafety.toxicPrinciples}
            </Text>
          ) : null}
          {petSafety.safetyNotes ? (
            <Text style={[styles.notesText, { color: palette.textSecondary }]}>
              {petSafety.safetyNotes}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    gap: 4,
  },
  containerCompact: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeTextCompact: {
    fontSize: 11,
  },
  detailsBox: {
    gap: 2,
    marginTop: 2,
  },
  principleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
