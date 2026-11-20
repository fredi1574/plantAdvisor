import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import {
  SOIL_MOISTURE_OPTIONS,
  type SoilMoistureLevel,
} from '@/constants/plantOptions';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { NotebookEntry } from '@/types/plant';

export interface CareMetricsDraft {
  rootLengthCm: string;
  stemHeightCm: string;
  leafCount: string;
  waterAmountMl: string;
  soilMoisture: SoilMoistureLevel | undefined;
}

export const EMPTY_CARE_METRICS_DRAFT: CareMetricsDraft = {
  rootLengthCm: '',
  stemHeightCm: '',
  leafCount: '',
  waterAmountMl: '',
  soilMoisture: undefined,
};

export function createMetricsDraftFromEntry(
  metrics?: NotebookEntry['metrics']
): CareMetricsDraft {
  return {
    rootLengthCm:
      metrics?.rootLengthCm !== undefined ? String(metrics.rootLengthCm) : '',
    stemHeightCm:
      metrics?.stemHeightCm !== undefined ? String(metrics.stemHeightCm) : '',
    leafCount:
      metrics?.leafCount !== undefined ? String(metrics.leafCount) : '',
    waterAmountMl:
      metrics?.waterAmountMl !== undefined ? String(metrics.waterAmountMl) : '',
    soilMoisture: metrics?.soilMoisture,
  };
}

export function parseCareMetricsDraft(
  draft: CareMetricsDraft,
  requirePositive = false
): NotebookEntry['metrics'] | undefined {
  const nextMetrics: NonNullable<NotebookEntry['metrics']> = {};
  const isValid = (n: number, raw: string) =>
    raw.trim() !== '' && !Number.isNaN(n) && (!requirePositive || n > 0);

  const parsedRoot = parseFloat(draft.rootLengthCm);
  if (isValid(parsedRoot, draft.rootLengthCm)) {
    nextMetrics.rootLengthCm = parsedRoot;
  }

  const parsedStem = parseFloat(draft.stemHeightCm);
  if (isValid(parsedStem, draft.stemHeightCm)) {
    nextMetrics.stemHeightCm = parsedStem;
  }

  const parsedLeaf = parseInt(draft.leafCount, 10);
  if (isValid(parsedLeaf, draft.leafCount)) {
    nextMetrics.leafCount = Math.round(parsedLeaf);
  }

  const parsedWater = parseInt(draft.waterAmountMl, 10);
  if (isValid(parsedWater, draft.waterAmountMl)) {
    nextMetrics.waterAmountMl = Math.round(parsedWater);
  }

  if (draft.soilMoisture) {
    nextMetrics.soilMoisture = draft.soilMoisture;
  }

  return Object.keys(nextMetrics).length > 0 ? nextMetrics : undefined;
}

interface CareMetricsFieldsProps {
  value: CareMetricsDraft;
  onChange: (next: CareMetricsDraft) => void;
  compact?: boolean;
  showFieldLabels?: boolean;
}

/**
 * Shared growth & watering metrics editor (root, stem, leaves, volume, prior soil moisture)
 * reused in both `CareEventComposer` and `EditLogModal`.
 */
export function CareMetricsFields({
  value,
  onChange,
  compact = false,
  showFieldLabels = true,
}: CareMetricsFieldsProps) {
  const palette = usePalette();
  const inputSurface = compact ? 'surface' : 'primary';

  const updateField = <K extends keyof CareMetricsDraft>(
    key: K,
    fieldValue: CareMetricsDraft[K]
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text
          style={[
            compact ? styles.compactLabel : styles.sectionLabel,
            { color: compact ? palette.textSecondary : palette.textPrimary },
          ]}>
          {compact ? 'Soil Moisture Prior' : 'Prior Soil Moisture (Optional)'}
        </Text>
        <View style={styles.chipRow}>
          {SOIL_MOISTURE_OPTIONS.map((opt) => {
            const active = value.soilMoisture === opt.key;
            return (
              <Chip
                key={opt.key}
                label={opt.label}
                variant={compact ? 'surface' : 'subtle'}
                selected={active}
                selectedStyle={compact ? 'soft' : 'solid'}
                onPress={() =>
                  updateField('soilMoisture', active ? undefined : opt.key)
                }
              />
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        {showFieldLabels && (
          <Text style={[styles.sectionLabel, { color: palette.textPrimary }]}>
            Optional Growth & Watering Metrics
          </Text>
        )}

        <View style={styles.twoColRow}>
          <View style={styles.subField}>
            {showFieldLabels && (
              <Text
                style={[styles.subFieldLabel, { color: palette.textSecondary }]}>
                Root Length (cm)
              </Text>
            )}
            <BotanicalInput
              surface={inputSurface}
              compact={compact}
              value={value.rootLengthCm}
              onChangeText={(v) => updateField('rootLengthCm', v)}
              keyboardType="decimal-pad"
              placeholder={showFieldLabels ? 'e.g., 8.5' : 'Root (cm)'}
            />
          </View>

          <View style={styles.subField}>
            {showFieldLabels && (
              <Text
                style={[styles.subFieldLabel, { color: palette.textSecondary }]}>
                Stem Height (cm)
              </Text>
            )}
            <BotanicalInput
              surface={inputSurface}
              compact={compact}
              value={value.stemHeightCm}
              onChangeText={(v) => updateField('stemHeightCm', v)}
              keyboardType="decimal-pad"
              placeholder={showFieldLabels ? 'e.g., 14.0' : 'Stem (cm)'}
            />
          </View>
        </View>

        <View style={styles.twoColRow}>
          <View style={styles.subField}>
            {showFieldLabels && (
              <Text
                style={[styles.subFieldLabel, { color: palette.textSecondary }]}>
                Leaf Count
              </Text>
            )}
            <BotanicalInput
              surface={inputSurface}
              compact={compact}
              value={value.leafCount}
              onChangeText={(v) => updateField('leafCount', v)}
              keyboardType="number-pad"
              placeholder={showFieldLabels ? 'e.g., 6' : 'Leaf count'}
            />
          </View>

          <View style={styles.subField}>
            {showFieldLabels && (
              <Text
                style={[styles.subFieldLabel, { color: palette.textSecondary }]}>
                Water Volume (ml)
              </Text>
            )}
            <BotanicalInput
              surface={inputSurface}
              compact={compact}
              value={value.waterAmountMl}
              onChangeText={(v) => updateField('waterAmountMl', v)}
              keyboardType="number-pad"
              placeholder={showFieldLabels ? 'e.g., 250' : 'Water (ml)'}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm + 2,
  },
  fieldGroup: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  subField: {
    flex: 1,
    gap: 4,
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
