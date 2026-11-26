import { BookmarkPlus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { Chip } from '@/components/ui/chip';
import { SwitchRow } from '@/components/ui/switch-row';
import {
  LIGHT_EXPOSURE_OPTIONS,
  POT_MATERIAL_OPTIONS,
} from '@/constants/plantOptions';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeLocation } from '@/i18n/plantDisplay';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type { LightExposure, PotMaterial } from '@/types/plant';

export interface RoomPresetSelection {
  name: string;
  lightExposure: LightExposure;
  isIndoor: boolean;
}

interface RoomPresetBarProps {
  label: string;
  labelSize?: 'sm' | 'md';
  hideWhenEmpty?: boolean;
  chipGap?: number;
  location: string;
  lightExposure: LightExposure;
  isIndoor: boolean;
  onApplyPreset: (preset: RoomPresetSelection) => void;
  children?: ReactNode;
}

/**
 * Reusable room-preset selector bar with a "Save Spot" action that persists
 * the current location, light exposure, and indoor/outdoor setting as a preset.
 */
export function RoomPresetBar({
  label,
  labelSize = 'sm',
  hideWhenEmpty = false,
  chipGap = Spacing.sm,
  location,
  lightExposure,
  isIndoor,
  onApplyPreset,
  children,
}: RoomPresetBarProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const roomPresets = usePlantStore((s) => s.roomPresets);
  const addRoomPreset = usePlantStore((s) => s.addRoomPreset);

  if (hideWhenEmpty && roomPresets.length === 0) {
    return null;
  }

  const trimmedLocation = location.trim();

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.fieldLabel,
            labelSize === 'md' ? styles.fieldLabelMd : styles.fieldLabelSm,
            { color: palette.textPrimary },
          ]}>
          {label}
        </Text>
        <SpringPressable
          onPress={() => {
            if (!trimmedLocation) return;
            triggerLightHaptic();
            addRoomPreset({
              name: trimmedLocation,
              lightExposure,
              isIndoor,
            });
          }}
          disabled={!trimmedLocation}
          accessibilityRole="button"
          accessibilityLabel="Save current location as room preset"
          style={[
            styles.savePresetBtn,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
            !trimmedLocation && styles.disabledBtn,
          ]}>
          <BookmarkPlus size={12} color={palette.primary} />
          <Text style={[styles.savePresetBtnText, { color: palette.primary }]}>
            {t('editPlant.saveSpot')}
          </Text>
        </SpringPressable>
      </View>

      {roomPresets.length > 0 && (
        <View style={[styles.chipRow, { gap: chipGap }]}>
          {roomPresets.map((preset) => {
            const isSelected =
              trimmedLocation.toLowerCase() ===
                preset.name.trim().toLowerCase() &&
              lightExposure === preset.lightExposure &&
              isIndoor === preset.isIndoor;

            return (
              <Chip
                key={preset.id}
                label={`${localizeLocation(preset.name, i18n.language)} • ${
                  preset.isIndoor
                    ? t('plantDetail.hero.indoor')
                    : t('plantDetail.hero.outdoor')
                }`}
                variant="subtle"
                size="sm"
                selected={isSelected}
                selectedStyle="solid"
                onPress={() => {
                  triggerLightHaptic();
                  onApplyPreset({
                    name: preset.name,
                    lightExposure: preset.lightExposure,
                    isIndoor: preset.isIndoor,
                  });
                }}
              />
            );
          })}
        </View>
      )}

      {children}
    </View>
  );
}

interface PlantEnvironmentFieldsProps {
  lightExposure: LightExposure;
  onChangeLightExposure: (value: LightExposure) => void;
  potMaterial: PotMaterial;
  onChangePotMaterial: (value: PotMaterial) => void;
  isIndoor: boolean;
  onChangeIsIndoor: (value: boolean) => void;
  hasDrainageHole: boolean;
  onChangeHasDrainageHole: (value: boolean) => void;
  maxPotOptions?: number;
  chipSize?: 'sm' | 'md';
  chipGap?: number;
  labelSize?: 'sm' | 'md';
  switchContained?: boolean;
  indoorBeforePot?: boolean;
  drainageDescription: string;
}

/**
 * Shared plant environment controls: light exposure chips, pot material chips,
 * indoor/outdoor switch, and drainage-hole switch.
 */
export function PlantEnvironmentFields({
  lightExposure,
  onChangeLightExposure,
  potMaterial,
  onChangePotMaterial,
  isIndoor,
  onChangeIsIndoor,
  hasDrainageHole,
  onChangeHasDrainageHole,
  maxPotOptions,
  chipSize = 'sm',
  chipGap = 6,
  labelSize = 'sm',
  switchContained = true,
  indoorBeforePot = false,
  drainageDescription,
}: PlantEnvironmentFieldsProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  const labelStyle = [
    styles.fieldLabel,
    labelSize === 'md' ? styles.fieldLabelMd : styles.fieldLabelSm,
    { color: palette.textPrimary },
  ];

  const potOptions =
    typeof maxPotOptions === 'number'
      ? POT_MATERIAL_OPTIONS.slice(0, maxPotOptions)
      : POT_MATERIAL_OPTIONS;

  const indoorSwitch = (
    <SwitchRow
      label={t('scan.identify.indoorLabel')}
      description={t('scan.identify.indoorDesc')}
      value={isIndoor}
      onValueChange={onChangeIsIndoor}
      contained={switchContained}
    />
  );

  const potMaterialSection = (
    <View style={styles.fieldGroup}>
      <Text style={labelStyle}>{t('editPlant.potMaterial')}</Text>
      <View style={[styles.chipRow, { gap: chipGap }]}>
        {potOptions.map((pm) => (
          <Chip
            key={pm.key}
            label={t(`plantOptions.potMaterial.${pm.key}`)}
            variant="subtle"
            size={chipSize}
            selected={potMaterial === pm.key}
            selectedStyle="solid"
            onPress={() => onChangePotMaterial(pm.key)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={labelStyle}>{t('editPlant.lightExposure')}</Text>
        <View style={[styles.chipRow, { gap: chipGap }]}>
          {LIGHT_EXPOSURE_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={t(`plantOptions.lightExposure.${opt.key}`)}
              variant="subtle"
              size={chipSize}
              selected={lightExposure === opt.key}
              selectedStyle="solid"
              onPress={() => onChangeLightExposure(opt.key)}
            />
          ))}
        </View>
      </View>

      {indoorBeforePot ? (
        <>
          {indoorSwitch}
          {potMaterialSection}
        </>
      ) : (
        <>
          {potMaterialSection}
          {indoorSwitch}
        </>
      )}

      <SwitchRow
        label={t('editPlant.drainageLabel')}
        description={drainageDescription}
        value={hasDrainageHole}
        onValueChange={onChangeHasDrainageHole}
        contained={switchContained}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontWeight: '700',
  },
  fieldLabelSm: {
    fontSize: 12,
  },
  fieldLabelMd: {
    fontSize: 13,
  },
  savePresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  savePresetBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
