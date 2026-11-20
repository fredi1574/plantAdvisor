import { Image } from 'expo-image';
import { Calendar, Droplets, Layers, MapPin, Sun } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';
import { HealthStatusBadge } from '@/components/ui/status-badges';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { UserPlant } from '@/types/plant';
import { getDaysUntilNextWater } from '@/utils/watering';

interface PlantHeroCardProps {
  plant: UserPlant;
}

/**
 * Specimen header card displaying identity, health badge, container/exposure specs,
 * watering countdown, baseline care strips, and pet-safety warning.
 */
export function PlantHeroCard({ plant }: PlantHeroCardProps) {
  const palette = usePalette();
  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const showDrainageWarning =
    !plant.hasDrainageHole && plant.species.plantType === 'succulent';

  return (
    <SurfaceCard>
      <View style={styles.heroTopRow}>
        <Image
          source={{ uri: plant.photoUri }}
          style={[styles.heroPhoto, { backgroundColor: palette.bgSubtle }]}
          contentFit="cover"
        />

        <View style={styles.heroTitleCol}>
          <View style={styles.badgeLine}>
            <HealthStatusBadge status={healthStatus} />

            <View
              style={[styles.familyChip, { backgroundColor: palette.bgSubtle }]}>
              <Text style={[styles.familyChipText, { color: palette.primary }]}>
                {plant.species.family}
              </Text>
            </View>
          </View>

          <Text style={[styles.heroNickname, { color: palette.textPrimary }]}>
            {plant.nickname}
          </Text>
          <Text style={[styles.heroSpecies, { color: palette.textSecondary }]}>
            {plant.species.commonName} •{' '}
            <Text style={styles.italicScientific}>
              {plant.species.scientificName}
            </Text>
          </Text>

          <View style={styles.locationRow}>
            <MapPin size={13} color={palette.textSecondary} />
            <Text
              style={[styles.locationLabel, { color: palette.textSecondary }]}>
              {plant.location} • {plant.isIndoor ? 'Indoor' : 'Outdoor'}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Calendar size={12} color={palette.textMuted} />
            <Text style={[styles.acquiredLabel, { color: palette.textMuted }]}>
              Acquired{' '}
              {new Date(plant.acquiredAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>

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

        <View
          style={[
            styles.specBadge,
            {
              backgroundColor: needsWater
                ? palette.waterAlertBg
                : palette.bgPrimary,
              borderColor: needsWater
                ? palette.waterAlertBorder
                : palette.borderSubtle,
            },
          ]}>
          <Text style={[styles.specBadgeLabel, { color: palette.textMuted }]}>
            NEXT WATER COUNTDOWN
          </Text>
          <View style={styles.waterCountdownRow}>
            <Droplets
              size={15}
              color={needsWater ? palette.waterAlertText : palette.waterBlue}
            />
            <Text
              style={[
                styles.specBadgeValue,
                {
                  color: needsWater
                    ? palette.waterAlertText
                    : palette.textPrimary,
                },
              ]}>
              {daysUntilWater === 0
                ? 'Due Today'
                : daysUntilWater < 0
                  ? `Overdue by ${Math.abs(daysUntilWater)}d`
                  : `In ${daysUntilWater} days (every ${plant.customWateringIntervalDays}d)`}
            </Text>
          </View>
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
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  heroTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroPhoto: {
    width: 92,
    height: 92,
    borderRadius: Radius.md,
  },
  heroTitleCol: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  familyChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  familyChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroNickname: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  heroSpecies: {
    fontSize: 13,
    fontWeight: '500',
  },
  italicScientific: {
    fontStyle: 'italic',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.half,
  },
  locationLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  acquiredLabel: {
    fontSize: 11,
    fontWeight: '500',
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
  waterCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    marginTop: Spacing.sm,
  },
});
