import { LayoutGrid, LayoutList } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Palette, Radius } from "@/constants/theme";

export type ViewMode = "list" | "grid";

interface GardenViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function GardenViewToggle({ value, onChange }: GardenViewToggleProps) {
  return (
    <View style={styles.toggleGroup}>
      <Pressable
        onPress={() => onChange("list")}
        style={({ pressed }) => [
          styles.toggleBtn,
          value === "list" && styles.toggleBtnActive,
          pressed && styles.toggleBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: value === "list" }}
        accessibilityLabel="List view"
      >
        <LayoutList
          size={17}
          color={value === "list" ? Palette.textInverse : Palette.textSecondary}
        />
      </Pressable>
      <Pressable
        onPress={() => onChange("grid")}
        style={({ pressed }) => [
          styles.toggleBtn,
          value === "grid" && styles.toggleBtnActive,
          pressed && styles.toggleBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: value === "grid" }}
        accessibilityLabel="Two-column grid view"
      >
        <LayoutGrid
          size={17}
          color={value === "grid" ? Palette.textInverse : Palette.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    width: 34,
    height: 30,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: Palette.primary,
  },
  toggleBtnPressed: {
    opacity: 0.8,
  },
});
