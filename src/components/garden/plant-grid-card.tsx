import { MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlantStatusPhoto } from "@/components/garden/plant-status-photo";
import { PropagationReadinessBar } from "@/components/garden/propagation-readiness-bar";
import { WateringProgressPill } from "@/components/ui/hydration-bar";
import {
  CardShadow,
  Fonts,
  getHealthBadgeTheme,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { usePalette } from "@/hooks/use-theme";
import { localizeCommonName, localizeLocation } from "@/i18n/plantDisplay";
import type { UserPlant } from "@/types/plant";

interface PlantGridCardProps {
  plant: UserPlant;
  onPress: () => void;
  onWaterNow: () => void;
  onLongPress?: () => void;
  showPropagationProgress?: boolean;
  latestRootLengthCm?: number | null;
}

export function PlantGridCard({
  plant,
  onPress,
  onWaterNow,
  onLongPress,
  showPropagationProgress = false,
  latestRootLengthCm = null,
}: PlantGridCardProps) {
  const { i18n } = useTranslation();
  const palette = usePalette();
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? "thriving";
  const badge = getHealthBadgeTheme(palette)[healthStatus];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.bgSurface,
          borderColor: badge.dot,
        },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${plant.nickname}, ${plant.species.commonName}. ${badge.label}.`}
    >
      <PlantStatusPhoto
        uri={plant.photoUri}
        alt={plant.nickname}
        status={healthStatus}
        variant="grid"
      />

      <View style={styles.body}>
        <Text
          style={[
            styles.nickname,
            { color: palette.textPrimary, fontFamily: Fonts?.serif },
          ]}
          numberOfLines={1}
        >
          {plant.nickname}
        </Text>
        <Text
          style={[styles.species, { color: palette.textSecondary }]}
          numberOfLines={1}
        >
          {localizeCommonName(plant.species.commonName, i18n.language)}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={11} color={palette.textMuted} />
          <Text
            style={[styles.locationText, { color: palette.textMuted }]}
            numberOfLines={1}
          >
            {localizeLocation(plant.location, i18n.language)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {showPropagationProgress &&
          plant.species.plantType === "propagation" && (
            <PropagationReadinessBar
              rootLengthCm={latestRootLengthCm}
              compact
            />
          )}
        <WateringProgressPill plant={plant} onWaterNow={onWaterNow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...CardShadow,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 2,
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
    flexDirection: "row",
    alignItems: "center",
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
    gap: Spacing.xs + 2,
  },
});
