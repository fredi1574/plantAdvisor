import { Minus, Plus, Sprout } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  PlantEnvironmentFields,
  RoomPresetBar,
} from '@/components/forms/plant-environment-fields';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Chip } from '@/components/ui/chip';
import { PLANT_TYPE_OPTIONS } from '@/constants/plantOptions';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  LightExposure,
  PlantType,
  PotMaterial,
  UserPlant,
} from '@/types/plant';

type GraduatedPlantType = Exclude<PlantType, 'propagation'>;

const GRADUATED_TYPE_OPTIONS = PLANT_TYPE_OPTIONS.filter(
  (opt): opt is { key: GraduatedPlantType; label: string } =>
    opt.key !== 'propagation'
);

interface GraduatePropagationModalProps {
  plant: UserPlant | null;
  visible: boolean;
  latestRootLengthCm: number | null;
  onClose: () => void;
  onGraduated?: (nickname: string) => void;
}

export function GraduatePropagationModal({
  plant,
  visible,
  latestRootLengthCm,
  onClose,
  onGraduated,
}: GraduatePropagationModalProps) {
  if (!plant) return null;

  return (
    <GraduatePropagationSheet
      key={plant.id}
      plant={plant}
      visible={visible}
      latestRootLengthCm={latestRootLengthCm}
      onClose={onClose}
      onGraduated={onGraduated}
    />
  );
}

interface GraduatePropagationSheetProps {
  plant: UserPlant;
  visible: boolean;
  latestRootLengthCm: number | null;
  onClose: () => void;
  onGraduated?: (nickname: string) => void;
}

function getSuggestedDefaults(plant: UserPlant): {
  plantType: GraduatedPlantType;
  potMaterial: PotMaterial;
  wateringDays: number;
} {
  const isSucculent =
    plant.species.baselineCare.succulentGuardrails.isSucculentOrCactus;
  const plantType: GraduatedPlantType = isSucculent ? 'succulent' : 'foliage';
  const potMaterial: PotMaterial =
    plant.potMaterial === 'glass_vessel'
      ? isSucculent
        ? 'terracotta'
        : 'plastic_nursery'
      : plant.potMaterial;
  const baseDays = plant.species.baselineCare.baseWateringDays;
  const wateringDays = isSucculent
    ? Math.max(12, baseDays)
    : Math.max(5, baseDays);

  return { plantType, potMaterial, wateringDays };
}

function GraduatePropagationSheet({
  plant,
  visible,
  latestRootLengthCm,
  onClose,
  onGraduated,
}: GraduatePropagationSheetProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const graduatePropagation = usePlantStore((s) => s.graduatePropagation);

  const defaults = getSuggestedDefaults(plant);

  const [plantType, setPlantType] = useState<GraduatedPlantType>(
    defaults.plantType
  );
  const [potMaterial, setPotMaterial] = useState<PotMaterial>(
    defaults.potMaterial
  );
  const [hasDrainageHole, setHasDrainageHole] = useState(true);
  const [location, setLocation] = useState(plant.location);
  const [lightExposure, setLightExposure] = useState<LightExposure>(
    plant.lightExposure
  );
  const [isIndoor, setIsIndoor] = useState(plant.isIndoor);
  const [wateringDays, setWateringDays] = useState(
    String(defaults.wateringDays)
  );
  const [notes, setNotes] = useState('');

  const adjustWateringDays = (delta: number) => {
    const parsed = parseInt(wateringDays, 10);
    const current = Number.isNaN(parsed) ? defaults.wateringDays : parsed;
    const next = Math.max(1, Math.min(90, current + delta));
    setWateringDays(String(next));
  };

  const handleConfirm = () => {
    const parsedDays = parseInt(wateringDays, 10);
    const intervalDays =
      Number.isNaN(parsedDays) || parsedDays < 1
        ? defaults.wateringDays
        : parsedDays;

    graduatePropagation(plant.id, {
      plantType,
      potMaterial,
      hasDrainageHole,
      location: location.trim() || plant.location,
      lightExposure,
      isIndoor,
      customWateringIntervalDays: intervalDays,
      rootLengthCm: latestRootLengthCm,
      notes: notes.trim() || undefined,
    });

    onGraduated?.(plant.nickname);
    onClose();
  };

  return (
    <BottomSheetModal
      visible={visible}
      eyebrow={t('plantDetail.graduation.eyebrow')}
      title={t('plantDetail.graduation.modalTitle')}
      headerIcon={<Sprout size={16} color={palette.primary} />}
      saveLabel={t('plantDetail.graduation.saveLabel')}
      closeAccessibilityLabel="Close graduate propagation modal"
      onClose={onClose}
      onSave={handleConfirm}>
      <View
        style={[
          styles.summaryBox,
          {
            backgroundColor: palette.primarySoft,
            borderColor: palette.primaryBorder,
          },
        ]}>
        <Text style={[styles.summaryText, { color: palette.textPrimary }]}>
          {t('plantDetail.graduation.summaryBanner', { name: plant.nickname })}
        </Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          {t('plantDetail.graduation.newCategory')}
        </Text>
        <View style={styles.chipRow}>
          {GRADUATED_TYPE_OPTIONS.map((pt) => (
            <Chip
              key={pt.key}
              label={t(`plantOptions.plantType.${pt.key}`)}
              variant="subtle"
              selected={plantType === pt.key}
              selectedStyle="solid"
              onPress={() => setPlantType(pt.key)}
            />
          ))}
        </View>
      </View>

      <RoomPresetBar
        label={t('editPlant.roomPresets')}
        hideWhenEmpty
        chipGap={Spacing.xs + 2}
        location={location}
        lightExposure={lightExposure}
        isIndoor={isIndoor}
        onApplyPreset={(preset) => {
          setLocation(preset.name);
          setLightExposure(preset.lightExposure);
          setIsIndoor(preset.isIndoor);
        }}
      />

      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, styles.locationCol]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.location')}
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={location}
            onChangeText={setLocation}
            placeholder={t('editPlant.locationPlaceholder')}
          />
        </View>

        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.waterEvery')}
          </Text>
          <View
            style={[
              styles.stepperRow,
              {
                backgroundColor: palette.bgPrimary,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <Pressable
              onPress={() => adjustWateringDays(-1)}
              style={({ pressed }) => [
                styles.stepperBtn,
                { backgroundColor: palette.bgSubtle },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Decrease watering interval">
              <Minus size={15} color={palette.textPrimary} />
            </Pressable>
            <TextInput
              value={wateringDays}
              onChangeText={setWateringDays}
              keyboardType="number-pad"
              style={[styles.stepperInput, { color: palette.textPrimary }]}
            />
            <Pressable
              onPress={() => adjustWateringDays(1)}
              style={({ pressed }) => [
                styles.stepperBtn,
                { backgroundColor: palette.bgSubtle },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Increase watering interval">
              <Plus size={15} color={palette.textPrimary} />
            </Pressable>
          </View>
        </View>
      </View>

      <PlantEnvironmentFields
        lightExposure={lightExposure}
        onChangeLightExposure={setLightExposure}
        potMaterial={potMaterial}
        onChangePotMaterial={setPotMaterial}
        isIndoor={isIndoor}
        onChangeIsIndoor={setIsIndoor}
        hasDrainageHole={hasDrainageHole}
        onChangeHasDrainageHole={setHasDrainageHole}
        drainageDescription={t('editPlant.drainageDesc')}
      />

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          {t('plantDetail.graduation.notesLabel')}
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder={t('plantDetail.graduation.notesPlaceholder')}
          style={styles.notesInput}
        />
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  locationCol: {
    flex: 1.3,
  },
  summaryBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 6,
  },
  notesInput: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
});
