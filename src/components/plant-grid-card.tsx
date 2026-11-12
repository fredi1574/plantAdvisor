import { Image } from 'expo-image';
import { CheckCircle2, Droplets, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassPill } from '@/components/glass-pill';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  getHealthBadgeTheme,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { getDaysUntilNextWater } from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

interface PlantGridCardProps {
  plant: UserPlant;
  onPress: () => void;
  onWaterNow: () => void;
  onLongPress?: () => void;
}

export function PlantGridCard({
  plant,
  onPress,
  onWaterNow,
  onLongPress,
}: PlantGridCardProps) {
  const palette = usePalette();
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const badge = getHealthBadgeTheme(palette)[healthStatus];
  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.bgSurface,
          borderColor: palette.borderSubtle,
        },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${plant.nickname}, ${plant.species.commonName}. ${badge.label}.`}>
      <View style={[styles.imageWrap, { backgroundColor: palette.bgSubtle }]}>
        <Image
          source={{ uri: plant.photoUri }}
          style={styles.image}
          contentFit="cover"
        />
        <GlassPill style={styles.healthBadgePosition}>
          <View style={styles.healthBadgeInner}>
            <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
            <Text
              style={[styles.healthBadgeText, { color: palette.textPrimary }]}
              numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        </GlassPill>
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.nickname,
            { color: palette.textPrimary, fontFamily: Fonts?.serif },
          ]}
          numberOfLines={1}>
          {plant.nickname}
        </Text>
        <Text
          style={[styles.species, { color: palette.textSecondary }]}
          numberOfLines={1}>
          {plant.species.commonName}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={11} color={palette.textMuted} />
          <Text
            style={[styles.locationText, { color: palette.textMuted }]}
            numberOfLines={1}>
            {plant.location}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {needsWater ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onWaterNow();
            }}
            style={({ pressed }) => [
              styles.waterActionPill,
              { backgroundColor: palette.waterBlue },
              pressed && styles.waterActionPillPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Water ${plant.nickname} now`}>
            <Droplets size={12} color={palette.textInverse} />
            <Text
              style={[styles.waterActionText, { color: palette.textInverse }]}
              numberOfLines={1}>
              {plant.species.plantType === 'propagation'
                ? 'Refresh'
                : daysUntilWater === 0
                  ? 'Water Today'
                  : `${Math.abs(daysUntilWater)}d Overdue`}
            </Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.schedulePill,
              { backgroundColor: palette.bgSubtle },
            ]}>
            <CheckCircle2 size={12} color={palette.primaryMuted} />
            <Text
              style={[styles.scheduleText, { color: palette.textSecondary }]}
              numberOfLines={1}>
              {daysUntilWater}d until water
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    overflow: 'hidden',
    ...CardShadow,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  healthBadgePosition: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  healthBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  healthBadgeText: {
    fontSize: Typography.caption.fontSize - 2,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.half,
  },
  nickname: {
    ...Typography.cardTitle,
  },
  species: {
    ...Typography.caption,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  locationText: {
    flex: 1,
    fontSize: Typography.caption.fontSize - 1,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  waterActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  waterActionPillPressed: {
    opacity: 0.85,
  },
  waterActionText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  scheduleText: {
    fontSize: Typography.caption.fontSize - 1,
    fontWeight: '600',
  },
});
