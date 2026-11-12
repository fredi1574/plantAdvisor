import { Image } from "expo-image";
import { CheckCircle2, Droplets, MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  CardShadow,
  HealthBadgeTheme,
  Palette,
  Radius,
  Spacing,
} from "@/constants/theme";
import { getDaysUntilNextWater } from "@/store/usePlantStore";
import type { UserPlant } from "@/types/plant";

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
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? "thriving";
  const badge = HealthBadgeTheme[healthStatus];
  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${plant.nickname}, ${plant.species.commonName}. ${badge.label}.`}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: plant.photoUri }}
          style={styles.image}
          contentFit="cover"
        />
        <View
          style={[
            styles.healthBadge,
            {
              backgroundColor: badge.bg,
              borderColor: badge.border,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
          <Text
            style={[styles.healthBadgeText, { color: badge.text }]}
            numberOfLines={1}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.nickname} numberOfLines={1}>
          {plant.nickname}
        </Text>
        <Text style={styles.species} numberOfLines={1}>
          {plant.species.commonName}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={11} color={Palette.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
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
              pressed && styles.waterActionPillPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Water ${plant.nickname} now`}
          >
            <Droplets size={12} color={Palette.textInverse} />
            <Text style={styles.waterActionText} numberOfLines={1}>
              {plant.species.plantType === "propagation"
                ? "Refresh"
                : daysUntilWater === 0
                  ? "Water Today"
                  : `${Math.abs(daysUntilWater)}d Overdue`}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.schedulePill}>
            <CheckCircle2 size={12} color={Palette.primaryMuted} />
            <Text style={styles.scheduleText} numberOfLines={1}>
              Water in {daysUntilWater}d
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
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    overflow: "hidden",
    ...CardShadow,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 1.15,
    backgroundColor: Palette.bgSubtle,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  healthBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    maxWidth: "88%",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: Spacing.sm + 2,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: 2,
  },
  nickname: {
    fontSize: 15,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  species: {
    fontSize: 12,
    fontWeight: "500",
    color: Palette.textSecondary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    color: Palette.textSecondary,
  },
  footer: {
    paddingHorizontal: Spacing.sm + 2,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm + 2,
  },
  waterActionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: Palette.waterBlue,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  waterActionPillPressed: {
    opacity: 0.85,
  },
  waterActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: Palette.textInverse,
  },
  schedulePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Palette.bgSubtle,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  scheduleText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: Palette.textSecondary,
  },
});
