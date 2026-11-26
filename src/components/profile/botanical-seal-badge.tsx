import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme';
import type { BotanicalSealId, SealTone } from '@/services/conservatoryService';

interface BotanicalSealCrestProps {
  sealId: BotanicalSealId;
  tone: SealTone;
  unlocked: boolean;
  size?: number;
}

/**
 * Pressed-leaf botanical wax seal SVG emblem.
 * Unlocked seals render in rich sage/terracotta/water tones; in-progress seals
 * stay calm and muted with a hairline dashed outline.
 */
export function BotanicalSealCrest({
  sealId,
  tone,
  unlocked,
  size = 46,
}: BotanicalSealCrestProps) {
  const palette = usePalette();

  const accentStroke = !unlocked
    ? palette.textMuted
    : tone === 'terracotta'
      ? palette.accentTerracotta
      : tone === 'water'
        ? palette.waterBlue
        : palette.primary;

  const fillBg = !unlocked
    ? palette.bgSubtle
    : tone === 'terracotta'
      ? palette.accentTerracottaSoft
      : tone === 'water'
        ? palette.waterBlueSoft
        : palette.primarySoft;

  const ringStroke = !unlocked ? palette.borderSubtle : accentStroke;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
        {/* Outer pressed-wax medallion */}
        <Circle
          cx="28"
          cy="28"
          r="25"
          fill={fillBg}
          stroke={ringStroke}
          strokeWidth={unlocked ? 1.6 : 1.2}
          strokeDasharray={unlocked ? undefined : '3 3'}
        />
        {/* Inner botanical etching ring */}
        <Circle
          cx="28"
          cy="28"
          r="20.5"
          stroke={ringStroke}
          strokeWidth="0.9"
          strokeDasharray="2 3"
          opacity={unlocked ? 0.65 : 0.45}
        />
        {renderSealGlyph(sealId, accentStroke, palette.bgSurface, unlocked)}
      </Svg>
    </View>
  );
}

function renderSealGlyph(
  sealId: BotanicalSealId,
  stroke: string,
  surface: string,
  unlocked: boolean
) {
  const opacity = unlocked ? 1 : 0.55;

  switch (sealId) {
    case 'first_roots':
      return (
        <>
          <Path
            d="M28 38 V23"
            stroke={stroke}
            strokeWidth="1.9"
            strokeLinecap="round"
            opacity={opacity}
          />
          <Path
            d="M28 27 C21 26, 18 20, 21 16 C25 16, 28 20, 28 26"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M28 24 C35 23, 38 17, 35 13 C31 13, 28 17, 28 23"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M28 35 C24 37, 22 39, 20 40 M28 36 C32 38, 34 39, 36 40"
            stroke={stroke}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'family_collector':
      return (
        <>
          <Path
            d="M17 19 H27 C28 19 28 20 28 21 V38 C28 37 26 36 24 36 H17 V19 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M39 19 H29 C28 19 28 20 28 21 V38 C28 37 30 36 32 36 H39 V19 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M22.5 29 C21 26, 22 23, 24 23 C25 25, 24.5 27.5, 22.5 29 Z"
            stroke={stroke}
            strokeWidth="1.3"
            opacity={opacity}
          />
          <Path
            d="M32 24 H36 M32 28 H35.5 M32 32 H35"
            stroke={stroke}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'garden_harmony':
      return (
        <>
          <Path
            d="M28 14 C33 21, 36 26, 36 31 C36 35.4, 32.4 39, 28 39 C23.6 39, 20 35.4, 20 31 C20 26, 23 21, 28 14 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M24.5 31.5 C24.5 33.8, 26.2 35.5, 28.5 35.5"
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'dry_back_discipline':
      return (
        <>
          <Circle
            cx="28"
            cy="28"
            r="6"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.7"
            opacity={opacity}
          />
          <Path
            d="M28 15 V18.5 M28 37.5 V41 M15 28 H18.5 M37.5 28 H41 M19 19 L21.5 21.5 M34.5 34.5 L37 37 M37 19 L34.5 21.5 M21.5 34.5 L19 37"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'chronicle_keeper':
      return (
        <>
          <Path
            d="M19 16 H34 L37 19 V40 H19 V16 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M23 23 H33 M23 28 H33 M23 33 H29"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'root_whisperer':
      return (
        <>
          <Path
            d="M21 17 H35 L33 38 C32.8 39.2 31.8 40 30.5 40 H25.5 C24.2 40 23.2 39.2 23 38 L21 17 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M22 25 H34"
            stroke={stroke}
            strokeWidth="1.2"
            strokeDasharray="2 2"
            opacity={opacity}
          />
          <Path
            d="M28 18 V33 M28 27 C25 29, 25 32, 24.5 34 M28 29 C31 31, 31 33.5, 31.5 35.5"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'plant_medic':
      return (
        <>
          <Path
            d="M28 15 C35 18, 38 25, 36 33 C34.5 37.5, 31 39.5, 28 40.5 C25 39.5, 21.5 37.5, 20 33 C18 25, 21 18, 28 15 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M28 23 V33 M23 28 H33"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );

    case 'comeback_story':
      return (
        <>
          <Path
            d="M19 35 C21 25, 29 19, 38 18 C36 28, 30 35, 19 35 Z"
            fill={surface}
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinejoin="round"
            opacity={opacity}
          />
          <Path
            d="M18 37 C23 32, 29 26, 36 20"
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity={opacity}
          />
        </>
      );
  }
}

interface ConservatoryRankCrestProps {
  tier: number;
  size?: number;
}

/**
 * Editorial botanical rosette crest that adds subtle leaves as the gardener's
 * Conservatory Rank advances from Tier 1 to Tier 5.
 */
export function ConservatoryRankCrest({
  tier,
  size = 56,
}: ConservatoryRankCrestProps) {
  const palette = usePalette();
  const clampedTier = Math.max(1, Math.min(5, tier));

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle
          cx="32"
          cy="32"
          r="29"
          fill={palette.primarySoft}
          stroke={palette.primaryBorder}
          strokeWidth="1.5"
        />
        <Circle
          cx="32"
          cy="32"
          r="24"
          stroke={palette.primary}
          strokeWidth="1"
          strokeDasharray="2.5 3.5"
          opacity={0.55}
        />

        {/* Stem */}
        <Path
          d="M32 47 V20"
          stroke={palette.primary}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Tier 1+: Base pair of leaves */}
        <Path
          d="M32 39 C23 38, 19 31, 22 26 C27 26, 32 31, 32 38"
          fill={palette.bgSurface}
          stroke={palette.primary}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <Path
          d="M32 39 C41 38, 45 31, 42 26 C37 26, 32 31, 32 38"
          fill={palette.bgSurface}
          stroke={palette.primary}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />

        {/* Tier 2+: Mid botanical leaves */}
        {clampedTier >= 2 && (
          <>
            <Path
              d="M32 30 C25 28, 22 22, 25 18 C29 19, 32 23, 32 29"
              fill={palette.primarySoft}
              stroke={palette.primary}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <Path
              d="M32 30 C39 28, 42 22, 39 18 C35 19, 32 23, 32 29"
              fill={palette.primarySoft}
              stroke={palette.primary}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Tier 3+: Terracotta crown bud */}
        {clampedTier >= 3 && (
          <Path
            d="M32 13 C35.5 16.5, 35.5 21.5, 32 24.5 C28.5 21.5, 28.5 16.5, 32 13 Z"
            fill={palette.accentTerracottaSoft}
            stroke={palette.accentTerracotta}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        )}

        {/* Tier 4+: Delicate side dew/pollen accents */}
        {clampedTier >= 4 && (
          <>
            <Circle cx="17" cy="24" r="1.8" fill={palette.accentTerracotta} />
            <Circle cx="47" cy="24" r="1.8" fill={palette.accentTerracotta} />
          </>
        )}

        {/* Tier 5: Curator laurel stars */}
        {clampedTier >= 5 && (
          <>
            <Circle cx="22" cy="14" r="1.6" fill={palette.primary} />
            <Circle cx="42" cy="14" r="1.6" fill={palette.primary} />
            <Circle cx="32" cy="9.5" r="1.8" fill={palette.accentTerracotta} />
          </>
        )}
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
