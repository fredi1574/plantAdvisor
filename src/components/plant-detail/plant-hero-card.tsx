import { Image } from 'expo-image';
import {
  ArrowLeft,
  Calendar,
  Droplets,
  Layers,
  MapPin,
  Stethoscope,
  Sun,
} from 'lucide-react-native';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';
import { SpringPressable } from '@/components/ui/animated-wrappers';
import { WateringProgressPill } from '@/components/ui/hydration-bar';
import { HealthStatusBadge } from '@/components/ui/status-badges';
import {
  BorderWidth,
  Fonts,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeCommonName, localizeLocation } from '@/i18n/plantDisplay';
import { triggerLightHaptic } from '@/services/haptics';
import type { UserPlant } from '@/types/plant';

interface PlantHeroCardProps {
  plant: UserPlant;
  onWaterNow: () => void;
  onBack: () => void;
  onHealthScan: () => void;
}

/**
 * Full-bleed edge-to-edge editorial specimen hero with overlaid navigation pills,
 * gradient scrim, Fraunces title, and canvas-mounted watering progress bar.
 */
export function PlantHeroCard({
  plant,
  onWaterNow,
  onBack,
  onHealthScan,
}: PlantHeroCardProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const insets = useContext(SafeAreaInsetsContext);
  const topInset = insets?.top ?? 0;
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';

  return (
    <View style={styles.heroOuter}>
      <View
        style={[
          styles.bannerWrap,
          {
            height: 276 + topInset,
            backgroundColor: palette.bgSubtle,
          },
        ]}>
        <Image
          source={{ uri: plant.photoUri }}
          style={styles.bannerPhoto}
          contentFit="cover"
          accessibilityLabel={`${plant.nickname} photo`}
        />

        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%">
          <Defs>
            <LinearGradient id="heroScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0E1712" stopOpacity="0.52" />
              <Stop offset="34%" stopColor="#0E1712" stopOpacity="0.12" />
              <Stop offset="70%" stopColor="#0E1712" stopOpacity="0.58" />
              <Stop offset="100%" stopColor="#0E1712" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroScrim)" />
        </Svg>

        <View
          style={[
            styles.bannerTopBar,
            { paddingTop: topInset + Spacing.sm },
          ]}>
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              onBack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Back to My Garden"
            style={({ pressed }) => [
              styles.floatingNavPill,
              pressed && { opacity: 0.78 },
            ]}>
            <ArrowLeft size={16} color="#FFFFFF" />
            <Text style={styles.floatingNavText}>
              {t('plantDetail.hero.garden')}
            </Text>
          </Pressable>

          <SpringPressable
            onPress={() => {
              triggerLightHaptic();
              onHealthScan();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('plantDetail.hero.healthScan')}
            style={[
              styles.floatingScanPill,
              { backgroundColor: palette.primary },
            ]}>
            <Stethoscope size={14} color={palette.textInverse} />
            <Text
              style={[
                styles.floatingScanText,
                { color: palette.textInverse },
              ]}>
              {t('plantDetail.hero.healthScan')}
            </Text>
          </SpringPressable>
        </View>

        <View style={styles.bannerBottomWrap}>
          <View style={styles.bannerBottomInner}>
            <View style={styles.badgeOverlayRow}>
              <HealthStatusBadge status={healthStatus} />
              <View style={styles.familyPillOverlay}>
                <Text style={styles.familyPillText}>
                  {plant.species.family}
                </Text>
              </View>
            </View>

            <Text style={[styles.heroNickname, { fontFamily: Fonts.serif }]}>
              {plant.nickname}
            </Text>
            <Text style={styles.heroSpecies} numberOfLines={1}>
              {localizeCommonName(plant.species.commonName, i18n.language)} •{' '}
              <Text style={styles.italicScientific}>
                {plant.species.scientificName}
              </Text>
            </Text>

            <View style={styles.bannerMetaRow}>
              <View style={styles.metaItem}>
                <MapPin size={12} color="rgba(255,255,255,0.88)" />
                <Text style={styles.bannerMetaText}>
                  {localizeLocation(plant.location, i18n.language)} •{' '}
                  {plant.isIndoor
                    ? t('plantDetail.hero.indoor')
                    : t('plantDetail.hero.outdoor')}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Calendar size={11} color="rgba(255,255,255,0.75)" />
                <Text style={styles.bannerMetaMuted}>
                  {new Date(plant.acquiredAt).toLocaleDateString(i18n.language, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.hydrationStripOuter}>
        <View style={styles.hydrationStripInner}>
          <WateringProgressPill
            plant={plant}
            onWaterNow={onWaterNow}
            showInterval
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Editorial, borderless hairline-divided care specifications & pet safety block
 * for the Overview tab (replaces boxed spec cards).
 */
export function PlantOverviewSpecs({ plant }: { plant: UserPlant }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const showDrainageWarning =
    !plant.hasDrainageHole && plant.species.plantType === 'succulent';

  const rows = [
    {
      icon: (
        <Droplets
          size={15}
          color={showDrainageWarning ? palette.attentionText : palette.primary}
        />
      ),
      label: t('plantDetail.specs.containerAndDrainage'),
      value: `${t(`plantOptions.potMaterial.${plant.potMaterial}`)} • ${
        plant.hasDrainageHole
          ? t('plantDetail.specs.drainageYes')
          : t('plantDetail.specs.drainageNo')
      }`,
      warning: showDrainageWarning,
    },
    {
      icon: <MapPin size={15} color={palette.primary} />,
      label: t('plantDetail.specs.currentExposure'),
      value: `${t(`plantOptions.lightExposure.${plant.lightExposure}`)} • ${
        plant.isIndoor
          ? t('plantDetail.hero.indoor')
          : t('plantDetail.hero.outdoor')
      }`,
      warning: false,
    },
    {
      icon: <Sun size={15} color={palette.primary} />,
      label: t('plantDetail.specs.idealLight'),
      value: plant.species.baselineCare.idealLight,
      warning: false,
    },
    {
      icon: <Layers size={15} color={palette.primary} />,
      label: t('plantDetail.specs.recommendedSoil'),
      value: plant.species.baselineCare.soilRecommendation,
      warning: false,
    },
  ];

  return (
    <View style={styles.specsSection}>
      <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
        {t('plantDetail.specs.eyebrow')}
      </Text>

      <View
        style={[
          styles.specsList,
          {
            borderTopColor: palette.borderSubtle,
            borderBottomColor: palette.borderSubtle,
          },
        ]}>
        {rows.map((row, idx) => (
          <View
            key={row.label}
            style={[
              styles.specRow,
              idx > 0 && {
                borderTopWidth: BorderWidth.hairline,
                borderTopColor: palette.borderSubtle,
              },
              row.warning && {
                backgroundColor: palette.attentionBg,
                paddingHorizontal: Spacing.sm,
                marginHorizontal: -Spacing.sm,
                borderRadius: Radius.sm,
              },
            ]}>
            <View style={styles.specRowLeft}>
              {row.icon}
              <Text
                style={[styles.specRowLabel, { color: palette.textSecondary }]}>
                {row.label}
              </Text>
            </View>
            <Text
              style={[
                styles.specRowValue,
                {
                  color: row.warning
                    ? palette.attentionText
                    : palette.textPrimary,
                },
              ]}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      {plant.species.petSafety ? (
        <View style={styles.petSafetyWrap}>
          <PetSafetyBadge petSafety={plant.species.petSafety} showDetails />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroOuter: {
    width: '100%',
  },
  bannerWrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
  },
  bannerPhoto: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  bannerTopBar: {
    width: '100%',
    maxWidth: MaxContentWidth + Spacing.lg * 2,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  floatingNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 28, 22, 0.56)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  floatingNavText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingScanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  floatingScanText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bannerBottomWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  bannerBottomInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: 4,
  },
  badgeOverlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  familyPillOverlay: {
    backgroundColor: 'rgba(18, 28, 22, 0.62)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  familyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroNickname: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSpecies: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  italicScientific: {
    fontStyle: 'italic',
  },
  bannerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bannerMetaMuted: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.78)',
  },
  hydrationStripOuter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  hydrationStripInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  specsSection: {
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  specsList: {
    borderTopWidth: BorderWidth.hairline,
    borderBottomWidth: BorderWidth.hairline,
  },
  specRow: {
    paddingVertical: Spacing.sm + 3,
    gap: 4,
  },
  specRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specRowLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  specRowValue: {
    ...Typography.body,
    fontWeight: '600',
    textTransform: 'capitalize',
    paddingLeft: 21,
  },
  petSafetyWrap: {
    marginTop: Spacing.xs,
  },
});
