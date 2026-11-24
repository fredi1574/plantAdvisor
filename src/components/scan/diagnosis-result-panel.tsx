import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import {
  HealthStatusBadge,
  SucculentGuardrailBanner,
  UrgencyBadge,
} from '@/components/ui/status-badges';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import type { PlantDiagnosisResult, UserPlant } from '@/types/plant';

interface DiagnosisResultPanelProps {
  diagnosis: PlantDiagnosisResult;
  plant: UserPlant;
}

/**
 * Elevated spotlight card for structured AI diagnosis summary, succulent guardrail
 * notice, recommended next steps, and notebook deep link.
 */
export function DiagnosisResultPanel({
  diagnosis,
  plant,
}: DiagnosisResultPanelProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  return (
    <SurfaceCard style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>
          {t('scan.diagnosisResult.title')}
        </Text>
        <HealthStatusBadge status={diagnosis.healthStatus} showDot={false} />
      </View>

      <Text style={[styles.summary, { color: palette.textSecondary }]}>
        {diagnosis.diagnosisSummary}
      </Text>

      {diagnosis.succulentGuardrailApplied ? (
        <SucculentGuardrailBanner
          message={diagnosis.succulentGuardrailApplied}
        />
      ) : null}

      <Text style={[styles.subHeader, { color: palette.textPrimary }]}>
        {t('scan.diagnosisResult.nextSteps')}
      </Text>

      {diagnosis.recommendedActions.map((act, idx) => (
        <View
          key={idx}
          style={[
            styles.actionRowItem,
            {
              backgroundColor: palette.bgPrimary,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <UrgencyBadge urgency={act.urgency} />
          <Text style={[styles.actionRowText, { color: palette.textPrimary }]}>
            {act.instruction}
          </Text>
        </View>
      ))}

      <SpringPressable
        onPress={() => {
          triggerLightHaptic();
          router.push({
            pathname: '/plant/[id]',
            params: { id: plant.id },
          });
        }}
        accessibilityRole="button"
        style={[
          styles.openNotebookBtn,
          { backgroundColor: palette.accentTerracotta },
        ]}>
        <CheckCircle2 size={16} color={palette.textInverse} />
        <Text style={[styles.btnText, { color: palette.textInverse }]}>
          {t('scan.diagnosisResult.viewInNotebook', { name: plant.nickname })}
        </Text>
      </SpringPressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.sectionTitle,
  },
  summary: {
    ...Typography.body,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  actionRowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  openNotebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
