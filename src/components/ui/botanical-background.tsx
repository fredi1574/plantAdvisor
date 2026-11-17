import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme';

export type BotanicalBackgroundVariant =
  | 'garden'
  | 'schedule'
  | 'scan'
  | 'detail'
  | 'account';

interface BotanicalBackgroundProps {
  variant?: BotanicalBackgroundVariant;
}

interface LeafPlacement {
  style: object;
  size: number;
  rotation: string;
  flip?: boolean;
  tone: 'primary' | 'secondary';
  shape: 'monstera' | 'olive';
}

const VARIANT_LEAVES: Record<BotanicalBackgroundVariant, LeafPlacement[]> = {
  garden: [
    {
      style: { top: -36, right: -48 },
      size: 260,
      rotation: '-24deg',
      tone: 'primary',
      shape: 'monstera',
    },
    {
      style: { top: 240, left: -72 },
      size: 220,
      rotation: '32deg',
      tone: 'secondary',
      shape: 'olive',
    },
    {
      style: { bottom: 60, right: -56 },
      size: 280,
      rotation: '-148deg',
      tone: 'primary',
      shape: 'monstera',
    },
  ],
  schedule: [
    {
      style: { top: -24, left: -54 },
      size: 240,
      rotation: '28deg',
      tone: 'primary',
      shape: 'olive',
    },
    {
      style: { bottom: 80, right: -64 },
      size: 270,
      rotation: '-135deg',
      tone: 'secondary',
      shape: 'monstera',
    },
  ],
  scan: [
    {
      style: { top: -20, right: -40 },
      size: 220,
      rotation: '-18deg',
      tone: 'primary',
      shape: 'olive',
    },
    {
      style: { bottom: 40, left: -60 },
      size: 250,
      rotation: '142deg',
      tone: 'primary',
      shape: 'monstera',
    },
  ],
  detail: [
    {
      style: { top: 120, right: -68 },
      size: 250,
      rotation: '-34deg',
      tone: 'primary',
      shape: 'monstera',
    },
    {
      style: { bottom: 90, left: -56 },
      size: 220,
      rotation: '22deg',
      tone: 'secondary',
      shape: 'olive',
    },
  ],
  account: [
    {
      style: { top: -28, right: -52 },
      size: 240,
      rotation: '-26deg',
      tone: 'primary',
      shape: 'olive',
    },
    {
      style: { bottom: 72, left: -64 },
      size: 260,
      rotation: '40deg',
      tone: 'secondary',
      shape: 'monstera',
    },
  ],
};

function LeafIllustration({
  size,
  color,
  shape,
}: {
  size: number;
  color: string;
  shape: 'monstera' | 'olive';
}) {
  if (shape === 'olive') {
    return (
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <G fill={color}>
          {/* Central stem */}
          <Path d="M98 188 C99 135, 100 80, 102 22 C103 19, 98 19, 97 22 C95 80, 94 135, 93 188 Z" />
          {/* Top leaf */}
          <Path d="M100 12 C116 30, 118 54, 100 70 C82 54, 84 30, 100 12 Z" />
          {/* Left leaves */}
          <Path d="M96 78 C64 62, 42 74, 34 94 C56 102, 78 96, 96 78 Z" />
          <Path d="M95 118 C58 102, 34 118, 28 140 C54 146, 78 136, 95 118 Z" />
          <Path d="M94 156 C64 146, 46 158, 42 176 C64 180, 82 170, 94 156 Z" />
          {/* Right leaves */}
          <Path d="M104 70 C136 54, 158 66, 166 86 C144 94, 122 88, 104 70 Z" />
          <Path d="M104 110 C140 94, 164 110, 170 132 C144 138, 120 128, 104 110 Z" />
          <Path d="M103 148 C134 138, 152 150, 156 168 C134 172, 115 162, 103 148 Z" />
        </G>
      </Svg>
    );
  }

  // Stylized botanical leaf with subtle midrib and fenestration cutouts
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Path
        d="M100 14 C138 26, 168 62, 166 108 C164 148, 134 174, 102 178 L102 192 L96 192 L96 178 C64 174, 34 148, 32 108 C30 62, 62 26, 100 14 Z M98 38 C98 78, 98 124, 98 166 M60 72 C74 78, 86 84, 96 90 M138 72 C124 78, 112 84, 102 90 M50 114 C68 118, 82 122, 96 128 M148 114 C130 118, 116 122, 102 128"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

/**
 * Renders large, soft translucent botanical leaf silhouettes behind screen content.
 */
export function BotanicalBackground({
  variant = 'garden',
}: BotanicalBackgroundProps) {
  const palette = usePalette();
  const leaves = VARIANT_LEAVES[variant];

  return (
    <View style={styles.container} pointerEvents="none">
      {leaves.map((leaf, index) => {
        const color =
          leaf.tone === 'primary'
            ? palette.leafWatermark
            : palette.leafWatermarkSecondary;

        return (
          <View
            key={`${variant}-leaf-${index}`}
            style={[
              styles.leafWrap,
              leaf.style,
              {
                transform: [
                  { rotate: leaf.rotation },
                  { scaleX: leaf.flip ? -1 : 1 },
                ],
              },
            ]}>
            <LeafIllustration
              size={leaf.size}
              color={color}
              shape={leaf.shape}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  leafWrap: {
    position: 'absolute',
  },
});
