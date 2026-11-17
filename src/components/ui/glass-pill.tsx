import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { type ComponentRef, type ReactNode, type RefObject } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { BorderWidth, Radius } from "@/constants/theme";
import { useIsDark, usePalette } from "@/hooks/use-theme";

interface GlassPillProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
}

/**
 * Frosted glass pill container with native GlassView on iOS 26+ and real BlurView fallback on iOS/Android/Web.
 */
export function GlassPill({
  children,
  style,
  blurIntensity = 7,
  blurTarget,
}: GlassPillProps) {
  const palette = usePalette();
  const isDark = useIsDark();
  const useNativeGlass = isGlassEffectAPIAvailable();

  if (useNativeGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isDark ? "dark" : "light"}
        style={[styles.base, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={blurIntensity}
      tint={isDark ? "dark" : "light"}
      blurTarget={blurTarget}
      blurMethod={
        Platform.OS === "android" && blurTarget ? "dimezisBlurView" : undefined
      }
      blurReductionFactor={2}
      style={[
        styles.base,
        {
          borderColor: palette.glassBorder,
          borderWidth: BorderWidth.hairline,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.glassSurface },
        ]}
      />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    overflow: "hidden",
  },
});
