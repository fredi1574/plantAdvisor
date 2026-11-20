import { Image } from 'expo-image';
import { Calendar, Layers, MapPin, Sun } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';
import { WateringProgressPill } from '@/components/ui/hydration-bar';
import { HealthStatusBadge } from '@/components/ui/status-badges';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  Fonts,
  getHealthBadgeTheme,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { UserPlant } from '@/types/plant';

interface PlantHeroCardProps {
  plant: UserPlant;
  onWaterNow: () => void;
}

/**
 * Editorial specimen hero card featuring a status-colored card border,
 * full-bleed photo banner with gradient scrim, overlaid Fraunces typography,
 * combined watering progress bar/button, container specs, baseline care, and pet safety.
 */
export function PlantHeroCard({ plant, onWaterNow }: PlantHeroCardProps) {
  const palette = usePalette();
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const healthTheme = getHealthBadgeTheme(palette)[healthStatus];
  const showDrainageWarning =
    !plant.hasDrainageHole && plant.species.plantType === 'succulent';

  return (
    <SurfaceCard
      style={[
        styles.heroCard,
        {
          borderColor: healthTheme.dot,
          borderWidth: 1,
        },
      ]}>
      <View style={[styles.bannerWrap, { backgroundColor: palette.bgSubtle }]}>
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
              <Stop offset="0%" stopColor="#0E1712" stopOpacity="0.22" />
              <Stop offset="45%" stopColor="#0E1712" stopOpacity="0.1" />
              <Stop offset="78%" stopColor="#0E1712" stopOpacity="0.62" />
              <Stop offset="100%" stopColor="#0E1712" stopOpacity="0.88" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroScrim)" />
        </Svg>

        <View style={styles.bannerTopBar}>
          <HealthStatusBadge status={healthStatus} />
          <View style={styles.familyPillOverlay}>
            <Text style={styles.familyPillText}>{plant.species.family}</Text>
          </View>
        </View>

        <View style={styles.bannerBottomText}>
          <Text style={[styles.heroNickname, { fontFamily: Fonts.serif }]}>
            {plant.nickname}
          </Text>
          <Text style={styles.heroSpecies} numberOfLines={1}>
            {plant.species.commonName} •{' '}
            <Text style={styles.italicScientific}>
              {plant.species.scientificName}
            </Text>
          </Text>

          <View style={styles.bannerMetaRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color="rgba(255,255,255,0.88)" />
              <Text style={styles.bannerMetaText}>
                {plant.location} • {plant.isIndoor ? 'Indoor' : 'Outdoor'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={11} color="rgba(255,255,255,0.75)" />
              <Text style={styles.bannerMetaMuted}>
                {new Date(plant.acquiredAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bodyContent}>
        <WateringProgressPill
          plant={plant}
          onWaterNow={onWaterNow}
          showInterval
        />

        <View style={styles.specsGrid}>
          <View
            style={[
              styles.specBadge,
              {
                backgroundColor: showDrainageWarning
                  ? palette.attentionBg
                  : palette.bgPrimary,
                borderColor: showDrainageWarning
                  ? palette.attentionBorder
                  : palette.borderSubtle,
              },
            ]}>
            <Text style={[styles.specBadgeLabel, { color: palette.textMuted }]}>
              CONTAINER & DRAINAGE
            </Text>
            <Text style={[styles.specBadgeValue, { color: palette.textPrimary }]}>
              {plant.potMaterial.replace('_', ' ')} •{' '}
              {plant.hasDrainageHole ? 'Drainage Hole ✓' : 'No Drainage Hole'}
            </Text>
          </View>

          <View
            style={[
              styles.specBadge,
              {
                backgroundColor: palette.bgPrimary,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <Text style={[styles.specBadgeLabel, { color: palette.textMuted }]}>
              CURRENT EXPOSURE
            </Text>
            <Text style={[styles.specBadgeValue, { color: palette.textPrimary }]}>
              {plant.lightExposure.replace('_', ' ')} •{' '}
              {plant.isIndoor ? 'Indoor' : 'Outdoor'}
            </Text>
          </View>
        </View>

        <View style={styles.baselineStack}>
          <View
            style={[
              styles.baselineStrip,
              { backgroundColor: palette.primarySoft },
            ]}>
            <Sun size={14} color={palette.primary} />
            <Text style={[styles.baselineStripText, { color: palette.primary }]}>
              <Text style={styles.boldText}>Ideal Light: </Text>
              {plant.species.baselineCare.idealLight}
            </Text>
          </View>
          <View
            style={[
              styles.baselineStrip,
              { backgroundColor: palette.primarySoft },
            ]}>
            <Layers size={14} color={palette.primary} />
            <Text style={[styles.baselineStripText, { color: palette.primary }]}>
              <Text style={styles.boldText}>Recommended Soil: </Text>
              {plant.species.baselineCare.soilRecommendation}
            </Text>
          </View>
        </View>

        {plant.species.petSafety ? (
          <View style={styles.petSafetyWrap}>
            <PetSafetyBadge petSafety={plant.species.petSafety} showDetails />
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  bannerWrap: {
    width: '100%',
    height: 236,
    position: 'relative',
    justifyContent: 'space-between',
  },
  bannerPhoto: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  bannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
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
  bannerBottomText: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md + 2,
    gap: 3,
  },
  heroNickname: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSpecies: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
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
  bodyContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specBadge: {
    flex: 1,
    minWidth: 150,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: 10,
    gap: 3,
  },
  specBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  specBadgeValue: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  baselineStack: {
    gap: 6,
  },
  baselineStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  baselineStripText: {
    flex: 1,
    ...Typography.caption,
  },
  boldText: {
    fontWeight: '700',
  },
  petSafetyWrap: {
    marginTop: Spacing.xs,
  },
});
