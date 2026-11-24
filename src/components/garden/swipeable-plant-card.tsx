import {
  ChevronRight,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { PlantStatusPhoto } from "@/components/garden/plant-status-photo";
import { PropagationReadinessBar } from "@/components/garden/propagation-readiness-bar";
import { WateringProgressPill } from "@/components/ui/hydration-bar";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import {
  BorderWidth,
  CardShadow,
  Fonts,
  getHealthBadgeTheme,
  Radius,
  Spacing,
} from "@/constants/theme";
import { usePalette } from "@/hooks/use-theme";
import { localizeCommonName, localizeLocation } from "@/i18n/plantDisplay";
import type { UserPlant } from "@/types/plant";

interface SwipeablePlantCardProps {
  plant: UserPlant;
  onPress: () => void;
  onWaterNow: () => void;
  onSnooze?: () => void;
  onEdit: (plant: UserPlant) => void;
  onDelete: (plant: UserPlant) => void;
  showPropagationProgress?: boolean;
  latestRootLengthCm?: number | null;
}

export function SwipeablePlantCard({
  plant,
  onPress,
  onWaterNow,
  onSnooze,
  onEdit,
  onDelete,
  showPropagationProgress = false,
  latestRootLengthCm = null,
}: SwipeablePlantCardProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? "thriving";
  const healthTheme = getHealthBadgeTheme(palette)[healthStatus];

  return (
    <SwipeableRow
      openWidth={96}
      borderRadius={Radius.lg}
      onPress={onPress}
      leftAction={{
        label: t("common.edit"),
        icon: <Pencil size={18} color={palette.textInverse} />,
        backgroundColor: palette.primary,
        accessibilityLabel: `Edit ${plant.nickname}`,
        onTrigger: () => onEdit(plant),
      }}
      rightAction={{
        label: t("common.delete"),
        icon: <Trash2 size={18} color={palette.textInverse} />,
        backgroundColor: palette.criticalDot,
        accessibilityLabel: `Delete ${plant.nickname}`,
        onTrigger: () => onDelete(plant),
      }}
    >
      {({ isOpen, pressed }) => (
        <View
          style={[
            styles.plantCard,
            {
              backgroundColor:
                pressed && !isOpen ? palette.bgSubtle : palette.bgSurface,
              borderColor: healthTheme.dot,
            },
          ]}
        >
          <View style={styles.cardTopRow}>
            <PlantStatusPhoto
              uri={plant.photoUri}
              alt={plant.nickname}
              status={healthStatus}
              variant="thumbnail"
            />

            <View style={styles.cardHeaderMeta}>
              <View style={styles.titleBadgeRow}>
                <Text
                  style={[
                    styles.plantNickname,
                    { color: palette.textPrimary, fontFamily: Fonts?.serif },
                  ]}
                  numberOfLines={1}
                >
                  {plant.nickname}
                </Text>
              </View>

              <Text
                style={[styles.speciesLine, { color: palette.textSecondary }]}
                numberOfLines={1}
              >
                {localizeCommonName(plant.species.commonName, i18n.language)} •{" "}
                <Text style={styles.scientificItalic}>
                  {plant.species.scientificName}
                </Text>
              </Text>

              <View style={styles.metaChipsRow}>
                <View
                  style={[
                    styles.typeChip,
                    { backgroundColor: palette.bgSubtle },
                  ]}
                >
                  <Text
                    style={[styles.typeChipText, { color: palette.primary }]}
                  >
                    {t(`plantOptions.plantType.${plant.species.plantType}`)}
                  </Text>
                </View>

                <View style={styles.locationChip}>
                  <MapPin size={12} color={palette.textSecondary} />
                  <Text
                    style={[
                      styles.locationText,
                      { color: palette.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {localizeLocation(plant.location, i18n.language)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {plant.latestHealthAssessment && healthStatus !== "thriving" && (
            <View
              style={[
                styles.diagnosisSnippetBox,
                {
                  backgroundColor:
                    healthStatus === "critical"
                      ? palette.criticalBg
                      : palette.attentionBg,
                  borderColor:
                    healthStatus === "critical"
                      ? palette.criticalBorder
                      : palette.attentionBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.diagnosisSnippetText,
                  {
                    color:
                      healthStatus === "critical"
                        ? palette.criticalText
                        : palette.attentionText,
                  },
                ]}
                numberOfLines={1}
              >
                <Text style={styles.diagnosisSnippetPrefix}>
                  {t("garden.aiNotePrefix")}
                </Text>
                {plant.latestHealthAssessment.diagnosisSummary}
              </Text>
            </View>
          )}

          {showPropagationProgress &&
            plant.species.plantType === "propagation" && (
              <PropagationReadinessBar rootLengthCm={latestRootLengthCm} />
            )}

          <View
            style={[styles.cardFooter, { borderTopColor: palette.bgSubtle }]}
          >
            <View style={styles.wateringPillWrap}>
              <WateringProgressPill
                plant={plant}
                onWaterNow={onWaterNow}
                onSnooze={onSnooze}
                showInterval
              />
            </View>

            <View style={styles.openNotebookLink}>
              <Text
                style={[styles.openNotebookText, { color: palette.primary }]}
              >
                {t("garden.notebookLink")}
              </Text>
              <ChevronRight size={15} color={palette.primary} />
            </View>
          </View>
        </View>
      )}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  plantCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    ...CardShadow,
  },
  cardTopRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cardHeaderMeta: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  titleBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  plantNickname: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  speciesLine: {
    fontSize: 13,
    fontWeight: "500",
  },
  scientificItalic: {
    fontStyle: "italic",
  },
  metaChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "500",
  },
  diagnosisSnippetBox: {
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: BorderWidth.hairline,
  },
  diagnosisSnippetPrefix: {
    fontWeight: "700",
  },
  diagnosisSnippetText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: BorderWidth.hairline,
  },
  wateringPillWrap: {
    flex: 1,
  },
  openNotebookLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  openNotebookText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
