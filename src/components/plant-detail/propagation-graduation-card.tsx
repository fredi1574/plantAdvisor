import { ArrowRight, CheckCircle2, Sprout } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  computePropagationReadiness,
  PROPAGATION_READY_ROOT_CM,
  PropagationReadinessBar,
} from '@/components/garden/propagation-readiness-bar';
import { SpringPressable } from '@/components/ui/animated-wrappers';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';

interface PropagationGraduationCardProps {
  rootLengthCm: number | null;
  onPressGraduate: () => void;
}

/**
 * Plant Detail overview card for propagation cuttings showing root readiness
 * progress and a "Graduate to Pot" CTA (visually highlighted once >= 5 cm).
 */
export function PropagationGraduationCard({
  rootLengthCm,
  onPressGraduate,
}: PropagationGraduationCardProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const readiness = computePropagationReadiness(rootLengthCm);
  const isReady = readiness.stage === 'ready';

  return (
    <SurfaceCard
      style={[
        styles.card,
        isReady && {
          borderColor: palette.thrivingBorder,
        },
      ]}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isReady
                ? palette.thrivingBg
                : palette.primarySoft,
            },
          ]}>
          {isReady ? (
            <CheckCircle2 size={16} color={palette.thrivingDot} />
          ) : (
            <Sprout size={16} color={palette.primary} />
          )}
        </View>
        <View style={styles.headerTextCol}>
          <Text
            style={[
              styles.eyebrow,
              { color: isReady ? palette.thrivingText : palette.primary },
            ]}>
            {t('plantDetail.graduation.eyebrow')}
          </Text>
          <Text
            style={[
              styles.title,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            {isReady
              ? t('plantDetail.graduation.cardTitleReady')
              : t('plantDetail.graduation.cardTitleProgress')}
          </Text>
        </View>
      </View>

      <PropagationReadinessBar rootLengthCm={rootLengthCm} />

      <Text style={[styles.hint, { color: palette.textSecondary }]}>
        {isReady && readiness.rootLengthCm !== null
          ? t('plantDetail.graduation.cardHintReady', {
              current: readiness.rootLengthCm.toFixed(1),
              target: PROPAGATION_READY_ROOT_CM,
            })
          : t('plantDetail.graduation.cardHintProgress', {
              target: PROPAGATION_READY_ROOT_CM,
            })}
      </Text>

      <SpringPressable
        onPress={() => {
          triggerLightHaptic();
          onPressGraduate();
        }}
        accessibilityRole="button"
        accessibilityLabel="Graduate propagation to permanent pot"
        style={[
          styles.graduateBtn,
          isReady
            ? {
                backgroundColor: palette.primary,
                borderColor: palette.primary,
              }
            : {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primaryBorder,
              },
        ]}>
        <Sprout
          size={15}
          color={isReady ? palette.textInverse : palette.primary}
        />
        <Text
          style={[
            styles.graduateBtnText,
            { color: isReady ? palette.textInverse : palette.primary },
          ]}>
          {t('plantDetail.graduation.graduateBtn')}
        </Text>
        <ArrowRight
          size={15}
          color={isReady ? palette.textInverse : palette.primary}
        />
      </SpringPressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  graduateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
  },
  graduateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
