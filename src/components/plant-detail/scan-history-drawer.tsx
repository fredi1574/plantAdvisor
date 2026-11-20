import { ChevronDown, ChevronUp, History } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  getHealthBadgeTheme,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import type { HealthAssessment } from '@/types/plant';

interface ScanHistoryDrawerProps {
  assessments: HealthAssessment[];
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Collapsible historical AI health scan drawer inside `PlantHealthAssessmentCard`.
 */
export function ScanHistoryDrawer({
  assessments,
  expanded,
  onToggle,
}: ScanHistoryDrawerProps) {
  const palette = usePalette();
  const healthBadgeTheme = useMemo(
    () => getHealthBadgeTheme(palette),
    [palette]
  );

  if (assessments.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: palette.borderSubtle }]}>
      <Pressable
        onPress={() => {
          triggerLightHaptic();
          onToggle();
        }}
        style={styles.toggleRow}>
        <View style={styles.toggleTitleRow}>
          <History size={14} color={palette.textSecondary} />
          <Text style={[styles.toggleText, { color: palette.textSecondary }]}>
            Scan History ({assessments.length})
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={16} color={palette.textSecondary} />
        ) : (
          <ChevronDown size={16} color={palette.textSecondary} />
        )}
      </Pressable>

      {expanded &&
        assessments.map((hist) => {
          const histBadge = healthBadgeTheme[hist.healthStatus];
          return (
            <SurfaceCard
              key={hist.id}
              variant="nested"
              style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.cardBadgeText, { color: histBadge.text }]}>
                  {histBadge.label} · every {hist.adjustedWateringIntervalDays}d
                </Text>
                <Text style={[styles.cardDate, { color: palette.textMuted }]}>
                  {new Date(hist.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[styles.cardSummary, { color: palette.textSecondary }]}>
                {hist.diagnosisSummary}
              </Text>
            </SurfaceCard>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: BorderWidth.hairline,
    paddingTop: 10,
    gap: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  historyCard: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDate: {
    fontSize: 11,
  },
  cardSummary: {
    fontSize: 12,
    lineHeight: 17,
  },
});
