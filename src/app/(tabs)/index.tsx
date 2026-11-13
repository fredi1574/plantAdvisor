import { router } from "expo-router";
import {
  CheckCircle2,
  Droplets,
  FlaskConical,
  Flower2,
  LayoutGrid,
  LayoutList,
  Leaf,
  ShieldAlert,
  Sprout,
  Sun,
} from "lucide-react-native";
import { type ReactNode, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotanicalBackground } from "@/components/botanical-background";
import { EditPlantModal } from "@/components/edit-plant-modal";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PlantGridCard } from "@/components/plant-grid-card";
import { ScreenHeader } from "@/components/screen-header";
import { SwipeablePlantCard } from "@/components/swipeable-plant-card";
import {
  BorderWidth,
  BottomTabInset,
  CardShadow,
  Fonts,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { usePalette } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/useAuthStore";
import { doesPlantNeedWatering, usePlantStore } from "@/store/usePlantStore";
import type { UserPlant } from "@/types/plant";

type FilterMode =
  | "all"
  | "needs_water"
  | "needs_attention"
  | "succulent"
  | "propagation"
  | "foliage"
  | "flowering";

type ViewMode = "list" | "grid";

export default function MyGardenScreen() {
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const plants = usePlantStore((s) => s.plants);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const waterAllNeedingWater = usePlantStore((s) => s.waterAllNeedingWater);
  const deletePlant = usePlantStore((s) => s.deletePlant);

  const userName =
    profile?.displayName?.trim() ||
    (user?.user_metadata?.display_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "Gardener";

  const [filter, setFilter] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [editingPlant, setEditingPlant] = useState<UserPlant | null>(null);

  const showToast = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const stats = useMemo(() => {
    const needsWaterCount = plants.filter(doesPlantNeedWatering).length;
    const needsAttentionCount = plants.filter(
      (p) =>
        p.latestHealthAssessment?.healthStatus === "needs_attention" ||
        p.latestHealthAssessment?.healthStatus === "critical",
    ).length;
    const succulentCount = plants.filter(
      (p) => p.species.plantType === "succulent",
    ).length;
    const propagationCount = plants.filter(
      (p) => p.species.plantType === "propagation",
    ).length;
    const foliageCount = plants.filter(
      (p) => p.species.plantType === "foliage",
    ).length;
    const floweringCount = plants.filter(
      (p) => p.species.plantType === "flowering",
    ).length;

    return {
      total: plants.length,
      needsWaterCount,
      needsAttentionCount,
      succulentCount,
      propagationCount,
      foliageCount,
      floweringCount,
    };
  }, [plants]);

  const filterChips: {
    key: FilterMode;
    label: string;
    count: number;
    softBg: string;
    softBorder: string;
    accentColor: string;
    renderIcon: (color: string) => ReactNode;
  }[] = useMemo(
    () => [
      {
        key: "all",
        label: "All",
        count: stats.total,
        softBg: palette.primarySoft,
        softBorder: palette.primaryBorder,
        accentColor: palette.primary,
        renderIcon: (color) => <Sprout size={13} color={color} />,
      },
      {
        key: "needs_water",
        label: "Thirsty",
        count: stats.needsWaterCount,
        softBg: palette.waterAlertBg,
        softBorder: palette.waterAlertBorder,
        accentColor: palette.waterBlue,
        renderIcon: (color) => <Droplets size={13} color={color} />,
      },
      {
        key: "needs_attention",
        label: "Attention",
        count: stats.needsAttentionCount,
        softBg: palette.attentionBg,
        softBorder: palette.attentionBorder,
        accentColor: palette.attentionText,
        renderIcon: (color) => <ShieldAlert size={13} color={color} />,
      },
      {
        key: "foliage",
        label: "Foliage",
        count: stats.foliageCount,
        softBg: palette.thrivingBg,
        softBorder: palette.thrivingBorder,
        accentColor: palette.thrivingText,
        renderIcon: (color) => <Leaf size={13} color={color} />,
      },
      {
        key: "succulent",
        label: "Succulents",
        count: stats.succulentCount,
        softBg: palette.accentTerracottaSoft,
        softBorder: palette.borderSubtle,
        accentColor: palette.accentTerracotta,
        renderIcon: (color) => <Sun size={13} color={color} />,
      },
      {
        key: "propagation",
        label: "Props",
        count: stats.propagationCount,
        softBg: palette.waterBlueSoft,
        softBorder: palette.waterAlertBorder,
        accentColor: palette.waterBlue,
        renderIcon: (color) => <FlaskConical size={13} color={color} />,
      },
      {
        key: "flowering",
        label: "Flowering",
        count: stats.floweringCount,
        softBg: palette.accentTerracottaSoft,
        softBorder: palette.borderSubtle,
        accentColor: palette.accentTerracotta,
        renderIcon: (color) => <Flower2 size={13} color={color} />,
      },
    ],
    [stats, palette],
  );

  const handleWaterAll = () => {
    if (stats.needsWaterCount === 0) return;

    const performWatering = () => {
      const count = waterAllNeedingWater();
      if (count > 0) {
        showToast(
          `All ${count} ${count === 1 ? "plant" : "plants"} marked as watered!`,
        );
      }
    };

    const confirmText = `Mark all ${stats.needsWaterCount} ${
      stats.needsWaterCount === 1 ? "plant" : "plants"
    } needing water as watered?`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(confirmText)) {
        performWatering();
      }
    } else {
      Alert.alert("Water All Plants", confirmText, [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Watered", style: "default", onPress: performWatering },
      ]);
    }
  };

  const handleDeletePlant = (plant: UserPlant) => {
    const performDelete = () => {
      deletePlant(plant.id);
      showToast(`Removed "${plant.nickname}" from My Garden.`);
    };

    const confirmText = `Are you sure you want to delete "${plant.nickname}" (${plant.species.commonName}) and its care history?`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(confirmText)) {
        performDelete();
      }
    } else {
      Alert.alert("Delete Plant", confirmText, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete },
      ]);
    }
  };

  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      if (filter === "needs_water") return doesPlantNeedWatering(plant);
      if (filter === "needs_attention") {
        const status = plant.latestHealthAssessment?.healthStatus;
        return status === "needs_attention" || status === "critical";
      }
      if (filter === "succulent")
        return plant.species.plantType === "succulent";
      if (filter === "propagation")
        return plant.species.plantType === "propagation";
      if (filter === "foliage") return plant.species.plantType === "foliage";
      if (filter === "flowering")
        return plant.species.plantType === "flowering";
      return true;
    });
  }, [plants, filter]);

  const renderPlantCollection = (items: UserPlant[]) => {
    if (viewMode === "list") {
      return (
        <View style={styles.listStack}>
          {items.map((plant) => (
            <SwipeablePlantCard
              key={plant.id}
              plant={plant}
              onPress={() => router.push(`/plant/${plant.id}`)}
              onWaterNow={() => {
                waterPlantNow(plant.id);
                showToast(`Watered "${plant.nickname}"!`);
              }}
              onEdit={(p) => setEditingPlant(p)}
              onDelete={handleDeletePlant}
            />
          ))}
        </View>
      );
    }

    const rows: UserPlant[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }

    return (
      <View style={styles.gridStack}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.map((plant) => (
              <PlantGridCard
                key={plant.id}
                plant={plant}
                onPress={() => router.push(`/plant/${plant.id}`)}
                onWaterNow={() => {
                  waterPlantNow(plant.id);
                  showToast(`Watered "${plant.nickname}"!`);
                }}
                onLongPress={() => setEditingPlant(plant)}
              />
            ))}
            {row.length === 1 && <View style={styles.gridSpacer} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={["top"]}
    >
      <BotanicalBackground variant="garden" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxContainer}>
          {/* Editorial Header */}
          <ScreenHeader
            eyebrow="FLORALOG BOTANICAL NOTEBOOK"
            title={`Welcome, ${userName}`}
            icon={<Sprout size={16} color={palette.primary} />}
            rightSlot={
              <View style={styles.headerControls}>
                <View
                  style={[
                    styles.viewToggleGroup,
                    {
                      backgroundColor: palette.bgSurface,
                      borderColor: palette.borderSubtle,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setViewMode("list")}
                    style={[
                      styles.viewToggleBtn,
                      viewMode === "list" && {
                        backgroundColor: palette.primary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: viewMode === "list" }}
                    accessibilityLabel="List view"
                  >
                    <LayoutList
                      size={16}
                      color={
                        viewMode === "list"
                          ? palette.textInverse
                          : palette.textSecondary
                      }
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setViewMode("grid")}
                    style={[
                      styles.viewToggleBtn,
                      viewMode === "grid" && {
                        backgroundColor: palette.primary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: viewMode === "grid" }}
                    accessibilityLabel="Two-column grid view"
                  >
                    <LayoutGrid
                      size={16}
                      color={
                        viewMode === "grid"
                          ? palette.textInverse
                          : palette.textSecondary
                      }
                    />
                  </Pressable>
                </View>
              </View>
            }
          />

          <FeedbackBanner message={feedbackMessage} />

          {/* Garden Pulse Hero Strip */}
          <View
            style={[
              styles.pulseCard,
              {
                backgroundColor:
                  stats.needsWaterCount > 0
                    ? palette.waterAlertBg
                    : palette.primarySoft,
                borderColor:
                  stats.needsWaterCount > 0
                    ? palette.waterAlertBorder
                    : palette.primaryBorder,
              },
            ]}
          >
            <View style={styles.pulseTextCol}>
              <Text
                style={[
                  styles.pulseTitle,
                  {
                    color:
                      stats.needsWaterCount > 0
                        ? palette.waterAlertText
                        : palette.primary,
                    fontFamily: Fonts?.serif,
                  },
                ]}
              >
                {stats.needsWaterCount > 0
                  ? `${stats.needsWaterCount} ${
                      stats.needsWaterCount === 1 ? "plant" : "plants"
                    } thirsty today`
                  : "All plants hydrated"}
              </Text>
              <View style={styles.pulseMetaRow}>
                <Text
                  style={[
                    styles.pulseSubtitle,
                    { color: palette.textSecondary },
                  ]}
                >
                  {stats.total} {stats.total === 1 ? "specimen" : "specimens"}
                </Text>
                {stats.needsAttentionCount > 0 && (
                  <View style={styles.attentionInline}>
                    <ShieldAlert size={13} color={palette.attentionText} />
                    <Text
                      style={[
                        styles.attentionInlineText,
                        { color: palette.attentionText },
                      ]}
                    >
                      {stats.needsAttentionCount} need attention
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {stats.needsWaterCount > 0 ? (
              <Pressable
                onPress={handleWaterAll}
                style={({ pressed }) => [
                  styles.waterAllBtn,
                  { backgroundColor: palette.waterBlue },
                  pressed && styles.pressedScale,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Water all ${stats.needsWaterCount} plants`}
              >
                <Droplets size={14} color={palette.textInverse} />
                <Text
                  style={[
                    styles.waterAllBtnText,
                    { color: palette.textInverse },
                  ]}
                >
                  Water All ({stats.needsWaterCount})
                </Text>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.calmBadge,
                  { backgroundColor: palette.bgSurface },
                ]}
              >
                <CheckCircle2 size={15} color={palette.primary} />
                <Text
                  style={[styles.calmBadgeText, { color: palette.primary }]}
                >
                  On Track
                </Text>
              </View>
            )}
          </View>

          {/* Single-Line Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filterChips.map((chip) => {
              const isSelected = filter === chip.key;
              const contentColor = isSelected
                ? palette.textInverse
                : chip.accentColor;

              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setFilter(chip.key)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? chip.accentColor
                        : chip.softBg,
                      borderColor: isSelected
                        ? chip.accentColor
                        : chip.softBorder,
                    },
                    pressed && styles.pressedScale,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  {chip.renderIcon(contentColor)}
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: contentColor,
                      },
                    ]}
                  >
                    {chip.label} ({chip.count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Plant Collection */}
          {filteredPlants.length === 0 ? (
            <View
              style={[
                styles.emptyFilterCard,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyFilterIconWrap,
                  { backgroundColor: palette.thrivingBg },
                ]}
              >
                <CheckCircle2 size={24} color={palette.primary} />
              </View>
              <Text
                style={[
                  styles.emptyFilterTitle,
                  { color: palette.textPrimary, fontFamily: Fonts?.serif },
                ]}
              >
                Nothing matches this filter
              </Text>
              <Text
                style={[
                  styles.emptyFilterSubtitle,
                  { color: palette.textSecondary },
                ]}
              >
                Your garden is looking calm here. Switch back to All to see
                every specimen.
              </Text>
              <Pressable
                onPress={() => setFilter("all")}
                style={[
                  styles.emptyFilterBtn,
                  { backgroundColor: palette.primary },
                ]}
              >
                <Text
                  style={[
                    styles.emptyFilterBtnText,
                    { color: palette.textInverse },
                  ]}
                >
                  Show All Plants
                </Text>
              </Pressable>
            </View>
          ) : (
            renderPlantCollection(filteredPlants)
          )}
        </View>
      </ScrollView>

      <EditPlantModal
        visible={Boolean(editingPlant)}
        plant={editingPlant}
        onClose={() => setEditingPlant(null)}
        onSaved={(message) => showToast(message)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BottomTabInset + Spacing.xl,
    alignItems: "center",
  },
  maxContainer: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  viewToggleGroup: {
    flexDirection: "row",
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  viewToggleBtn: {
    width: 32,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pressedScale: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  pulseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...CardShadow,
  },
  pulseTextCol: {
    flex: 1,
    gap: Spacing.xs,
  },
  pulseTitle: {
    ...Typography.sectionTitle,
  },
  pulseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pulseSubtitle: {
    ...Typography.caption,
    fontWeight: "600",
  },
  attentionInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  attentionInlineText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  waterAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.md + Spacing.half,
    paddingVertical: Spacing.sm + Spacing.half,
    borderRadius: Radius.full,
    ...CardShadow,
  },
  waterAllBtnText: {
    fontSize: Typography.caption.fontSize + 1,
    fontWeight: "700",
  },
  calmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + Spacing.half,
    borderRadius: Radius.full,
  },
  calmBadgeText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.half,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + Spacing.half,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  listStack: {
    gap: Spacing.md,
  },
  gridStack: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  gridSpacer: {
    flex: 1,
  },
  emptyFilterCard: {
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    ...CardShadow,
  },
  emptyFilterIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emptyFilterTitle: {
    ...Typography.sectionTitle,
  },
  emptyFilterSubtitle: {
    ...Typography.body,
    textAlign: "center",
    maxWidth: 320,
  },
  emptyFilterBtn: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  emptyFilterBtnText: {
    ...Typography.caption,
    fontWeight: "700",
  },
});
