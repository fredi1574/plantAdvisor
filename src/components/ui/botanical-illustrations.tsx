import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme';

interface IllustrationProps {
  size?: number;
}

/**
 * Custom botanical line-art illustration of a potted rosette succulent.
 * Adapts automatically to Light and Dark ("Night Conservatory") palettes.
 */
export function PottedSucculentIllustration({ size = 108 }: IllustrationProps) {
  const palette = usePalette();

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        {/* Soft botanical aura */}
        <Circle cx="60" cy="62" r="46" fill={palette.primarySoft} opacity={0.85} />
        <Circle
          cx="60"
          cy="62"
          r="46"
          stroke={palette.primaryBorder}
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {/* Delicate floating botanical accents */}
        <Circle cx="24" cy="36" r="2.2" fill={palette.accentTerracotta} opacity={0.75} />
        <Circle cx="95" cy="34" r="1.8" fill={palette.primaryMuted} opacity={0.7} />
        <Path
          d="M92 48 L96 48 M94 46 L94 50"
          stroke={palette.primary}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity={0.65}
        />

        {/* Ground shadow */}
        <Ellipse
          cx="60"
          cy="97"
          rx="25"
          ry="4.5"
          fill={palette.borderSubtle}
          opacity={0.7}
        />

        {/* Outer succulent rosette leaves */}
        <G
          stroke={palette.primary}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round">
          {/* Far left & right petals */}
          <Path
            d="M42 66 C28 60, 26 47, 36 45 C43 44, 48 53, 52 63"
            fill={palette.primarySoft}
          />
          <Path
            d="M78 66 C92 60, 94 47, 84 45 C77 44, 72 53, 68 63"
            fill={palette.primarySoft}
          />
          {/* Mid left & right petals */}
          <Path
            d="M50 65 C39 54, 41 37, 50 35 C56 34, 59 46, 59 62"
            fill={palette.bgSurface}
          />
          <Path
            d="M70 65 C81 54, 79 37, 70 35 C64 34, 61 46, 61 62"
            fill={palette.bgSurface}
          />
          {/* Center crown petal */}
          <Path
            d="M60 27 C67 35, 68 50, 60 63 C52 50, 53 35, 60 27 Z"
            fill={palette.primarySoft}
          />
          {/* Delicate inner vein on center petal */}
          <Path d="M60 36 L60 56" stroke={palette.primaryMuted} strokeWidth="1.3" />
        </G>

        {/* Terracotta pot body */}
        <Path
          d="M39 67 L81 67 L75 94 C74.4 96.2, 72.5 97.5, 70.2 97.5 L49.8 97.5 C47.5 97.5, 45.6 96.2, 45 94 Z"
          fill={palette.accentTerracottaSoft}
          stroke={palette.accentTerracotta}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Terracotta pot rim */}
        <Rect
          x="35"
          y="61"
          width="50"
          height="8"
          rx="3.5"
          fill={palette.bgSurface}
          stroke={palette.accentTerracotta}
          strokeWidth="2"
        />

        {/* Subtle ceramic line detail on pot */}
        <Path
          d="M46 77 Q60 80 74 77"
          stroke={palette.accentTerracotta}
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity={0.55}
        />
      </Svg>
    </View>
  );
}

/**
 * Custom botanical line-art illustration of a calm leaf sprig for filtered/no-match states.
 */
export function SproutSearchIllustration({ size = 104 }: IllustrationProps) {
  const palette = usePalette();

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        {/* Soft conservatory backdrop circle */}
        <Circle cx="58" cy="58" r="42" fill={palette.thrivingBg} opacity={0.65} />

        {/* Botanical sprig inside magnifier lens */}
        <Circle
          cx="56"
          cy="55"
          r="26"
          fill={palette.bgSurface}
          stroke={palette.primary}
          strokeWidth="2.1"
        />

        {/* Magnifier handle */}
        <Line
          x1="75"
          y1="74"
          x2="92"
          y2="91"
          stroke={palette.primary}
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <Line
          x1="75"
          y1="74"
          x2="92"
          y2="91"
          stroke={palette.primarySoft}
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Sprout stem & two calm leaves inside lens */}
        <Path
          d="M56 71 C56 61, 56 52, 56 44"
          stroke={palette.primary}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <Path
          d="M56 56 C46 54, 42 46, 46 41 C52 40, 56 46, 56 54"
          fill={palette.primarySoft}
          stroke={palette.primary}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M56 51 C66 49, 70 41, 66 36 C60 35, 56 41, 56 49"
          fill={palette.primarySoft}
          stroke={palette.primary}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Accent dots */}
        <Circle cx="26" cy="36" r="2" fill={palette.accentTerracotta} opacity={0.75} />
        <Circle cx="89" cy="35" r="2.2" fill={palette.primaryMuted} opacity={0.65} />
      </Svg>
    </View>
  );
}

/**
 * Custom botanical line-art illustration for an empty Care Log Timeline.
 */
export function JournalSproutIllustration({ size = 88 }: IllustrationProps) {
  const palette = usePalette();

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 112 112" fill="none">
        {/* Soft circular backdrop */}
        <Circle cx="56" cy="56" r="44" fill={palette.primarySoft} opacity={0.75} />

        {/* Minimal botanical journal page */}
        <Rect
          x="26"
          y="30"
          width="48"
          height="56"
          rx="8"
          fill={palette.bgSurface}
          stroke={palette.primary}
          strokeWidth="1.8"
        />

        {/* Timeline rail & nodes sketched inside the page */}
        <Line
          x1="37"
          y1="44"
          x2="37"
          y2="72"
          stroke={palette.borderSubtle}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <Circle cx="37" cy="44" r="3" fill={palette.waterBlue} />
        <Circle cx="37" cy="58" r="3" fill={palette.primary} />
        <Circle cx="37" cy="72" r="3" fill={palette.accentTerracotta} />

        {/* Journal lines */}
        <Line
          x1="45"
          y1="44"
          x2="64"
          y2="44"
          stroke={palette.primaryMuted}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={0.75}
        />
        <Line
          x1="45"
          y1="58"
          x2="61"
          y2="58"
          stroke={palette.borderSubtle}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <Line
          x1="45"
          y1="72"
          x2="58"
          y2="72"
          stroke={palette.borderSubtle}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Sprouting leaf emerging from the corner of the journal */}
        <Path
          d="M72 78 C77 67, 80 56, 84 44"
          stroke={palette.primary}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <Path
          d="M80 56 C89 53, 95 45, 92 38 C85 38, 79 45, 80 54"
          fill={palette.primarySoft}
          stroke={palette.primary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M76 66 C69 62, 66 55, 70 50 C75 51, 78 58, 76 65"
          fill={palette.accentTerracottaSoft}
          stroke={palette.accentTerracotta}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
