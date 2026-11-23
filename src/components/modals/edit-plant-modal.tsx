import { Image } from 'expo-image';
import {
  BookmarkPlus,
  Camera,
  Image as ImageIcon,
  Minus,
  Pencil,
  Plus,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Chip } from '@/components/ui/chip';
import { SwitchRow } from '@/components/ui/switch-row';
import {
  LIGHT_EXPOSURE_OPTIONS,
  PLANT_TYPE_OPTIONS,
  POT_MATERIAL_OPTIONS,
} from '@/constants/plantOptions';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeLocation } from '@/i18n/plantDisplay';
import { triggerLightHaptic } from '@/services/haptics';
import { pickPlantImage } from '@/services/imagePicker';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  LightExposure,
  PlantType,
  PotMaterial,
  UserPlant,
} from '@/types/plant';

interface EditPlantModalProps {
  plant: UserPlant | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: (nickname: string) => void;
  onRequestDelete?: (plant: UserPlant) => void;
}

export function EditPlantModal({
  plant,
  visible,
  onClose,
  onSaved,
  onRequestDelete,
}: EditPlantModalProps) {
  if (!plant) return null;

  return (
    <EditPlantFormSheet
      key={plant.id}
      plant={plant}
      visible={visible}
      onClose={onClose}
      onSaved={onSaved}
      onRequestDelete={onRequestDelete}
    />
  );
}

interface EditPlantFormSheetProps {
  plant: UserPlant;
  visible: boolean;
  onClose: () => void;
  onSaved?: (nickname: string) => void;
  onRequestDelete?: (plant: UserPlant) => void;
}

function EditPlantFormSheet({
  plant,
  visible,
  onClose,
  onSaved,
  onRequestDelete,
}: EditPlantFormSheetProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const roomPresets = usePlantStore((s) => s.roomPresets);
  const addRoomPreset = usePlantStore((s) => s.addRoomPreset);

  const [nickname, setNickname] = useState(plant.nickname);
  const [commonName, setCommonName] = useState(plant.species.commonName);
  const [scientificName, setScientificName] = useState(
    plant.species.scientificName
  );
  const [plantType, setPlantType] = useState<PlantType>(
    plant.species.plantType
  );
  const [location, setLocation] = useState(plant.location);
  const [isIndoor, setIsIndoor] = useState(plant.isIndoor);
  const [wateringDays, setWateringDays] = useState(
    String(plant.customWateringIntervalDays)
  );
  const [fertilizeDays, setFertilizeDays] = useState(
    plant.fertilizeIntervalDays ? String(plant.fertilizeIntervalDays) : ''
  );
  const [rotateDays, setRotateDays] = useState(
    plant.rotateIntervalDays ? String(plant.rotateIntervalDays) : ''
  );
  const [lightExposure, setLightExposure] = useState<LightExposure>(
    plant.lightExposure
  );
  const [potMaterial, setPotMaterial] = useState<PotMaterial>(
    plant.potMaterial
  );
  const [hasDrainageHole, setHasDrainageHole] = useState(plant.hasDrainageHole);
  const [photoUri, setPhotoUri] = useState(plant.photoUri);

  const handleSelectPhoto = async (source: 'camera' | 'library') => {
    const result = await pickPlantImage(source, {
      allowsEditing: true,
      quality: 0.9,
      prepareForAI: true,
    });
    if (result.ok) {
      setPhotoUri(result.uri);
    }
  };

  const adjustWateringDays = (delta: number) => {
    const parsed = parseInt(wateringDays, 10);
    const current = Number.isNaN(parsed)
      ? plant.customWateringIntervalDays
      : parsed;
    const next = Math.max(1, Math.min(90, current + delta));
    setWateringDays(String(next));
  };

  const handleSave = () => {
    const parsedDays = parseInt(wateringDays, 10);
    const intervalDays =
      Number.isNaN(parsedDays) || parsedDays < 1
        ? plant.customWateringIntervalDays
        : parsedDays;

    const parsedFertilize = parseInt(fertilizeDays, 10);
    const fertilizeIntervalDays =
      !Number.isNaN(parsedFertilize) && parsedFertilize >= 1
        ? parsedFertilize
        : undefined;

    const parsedRotate = parseInt(rotateDays, 10);
    const rotateIntervalDays =
      !Number.isNaN(parsedRotate) && parsedRotate >= 1
        ? parsedRotate
        : undefined;

    const finalNickname = nickname.trim() || plant.nickname;

    updatePlant(plant.id, {
      nickname: finalNickname,
      commonName: commonName.trim() || plant.species.commonName,
      scientificName: scientificName.trim() || plant.species.scientificName,
      plantType,
      location: location.trim() || plant.location,
      isIndoor,
      customWateringIntervalDays: intervalDays,
      fertilizeIntervalDays,
      rotateIntervalDays,
      lightExposure,
      potMaterial,
      hasDrainageHole,
      photoUri: photoUri || plant.photoUri,
    });

    onSaved?.(finalNickname);
    onClose();
  };

  return (
    <BottomSheetModal
      visible={visible}
      eyebrow={t('editPlant.eyebrow')}
      title={t('editPlant.title')}
      headerIcon={<Pencil size={16} color={palette.primary} />}
      saveLabel={t('editPlant.saveLabel')}
      closeAccessibilityLabel="Close edit plant modal"
      deleteAccessibilityLabel={`Delete ${plant.nickname}`}
      onClose={onClose}
      onSave={handleSave}
      onDelete={
        onRequestDelete
          ? () => {
              onClose();
              onRequestDelete(plant);
            }
          : undefined
      }>
      <View
        style={[
          styles.photoRow,
          {
            backgroundColor: palette.bgPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <Image
          source={{ uri: photoUri || plant.photoUri }}
          style={[styles.photoPreview, { backgroundColor: palette.bgSubtle }]}
          contentFit="cover"
        />
        <View style={styles.photoActionsCol}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.specimenPhoto')}
          </Text>
          <View style={styles.photoButtonsRow}>
            <Pressable
              onPress={() => void handleSelectPhoto('camera')}
              style={({ pressed }) => [
                styles.photoBtn,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <Camera size={14} color={palette.primary} />
              <Text style={[styles.photoBtnText, { color: palette.primary }]}>
                {t('editPlant.camera')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSelectPhoto('library')}
              style={({ pressed }) => [
                styles.photoBtn,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <ImageIcon size={14} color={palette.primary} />
              <Text style={[styles.photoBtnText, { color: palette.primary }]}>
                {t('editPlant.library')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          {t('editPlant.nickname')}
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('editPlant.nicknamePlaceholder')}
        />
      </View>

      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.commonName')}
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={commonName}
            onChangeText={setCommonName}
            placeholder={t('editPlant.commonNamePlaceholder')}
          />
        </View>

        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.scientificName')}
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={scientificName}
            onChangeText={setScientificName}
            placeholder={t('editPlant.scientificNamePlaceholder')}
            style={styles.italicInput}
          />
        </View>
      </View>

      {roomPresets.length > 0 && (
        <View style={styles.fieldGroup}>
          <View style={styles.presetHeaderRow}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              {t('editPlant.roomPresets')}
            </Text>
            <SpringPressable
              onPress={() => {
                const trimmed = location.trim();
                if (!trimmed) return;
                triggerLightHaptic();
                addRoomPreset({
                  name: trimmed,
                  lightExposure,
                  isIndoor,
                });
              }}
              disabled={!location.trim()}
              accessibilityRole="button"
              accessibilityLabel="Save current location as room preset"
              style={[
                styles.savePresetBtn,
                {
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primaryBorder,
                },
                !location.trim() && { opacity: 0.45 },
              ]}>
              <BookmarkPlus size={12} color={palette.primary} />
              <Text
                style={[styles.savePresetBtnText, { color: palette.primary }]}>
                {t('editPlant.saveSpot')}
              </Text>
            </SpringPressable>
          </View>
          <View style={styles.presetChipsRow}>
            {roomPresets.map((preset) => {
              const isSelected =
                location.trim().toLowerCase() ===
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
                    setLocation(preset.name);
                    setLightExposure(preset.lightExposure);
                    setIsIndoor(preset.isIndoor);
                  }}
                />
              );
            })}
          </View>
        </View>
      )}

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

      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.fertilizeEvery')}
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={fertilizeDays}
            onChangeText={setFertilizeDays}
            keyboardType="number-pad"
            placeholder="e.g. 30"
          />
        </View>
        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            {t('editPlant.rotateEvery')}
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={rotateDays}
            onChangeText={setRotateDays}
            keyboardType="number-pad"
            placeholder="e.g. 14"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          {t('editPlant.botanicalCategory')}
        </Text>
        <View style={styles.chipRow}>
          {PLANT_TYPE_OPTIONS.map((pt) => (
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

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          {t('editPlant.lightExposure')}
        </Text>
        <View style={styles.chipRow}>
          {LIGHT_EXPOSURE_OPTIONS.map((le) => (
            <Chip
              key={le.key}
              label={t(`plantOptions.lightExposure.${le.key}`)}
              variant="subtle"
              selected={lightExposure === le.key}
              selectedStyle="solid"
              onPress={() => setLightExposure(le.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          {t('editPlant.potMaterial')}
        </Text>
        <View style={styles.chipRow}>
          {POT_MATERIAL_OPTIONS.map((pm) => (
            <Chip
              key={pm.key}
              label={t(`plantOptions.potMaterial.${pm.key}`)}
              variant="subtle"
              selected={potMaterial === pm.key}
              selectedStyle="solid"
              onPress={() => setPotMaterial(pm.key)}
            />
          ))}
        </View>
      </View>

      <SwitchRow
        label={t('editPlant.drainageLabel')}
        description={t('editPlant.drainageDesc')}
        value={hasDrainageHole}
        onValueChange={setHasDrainageHole}
      />
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
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
  },
  photoActionsCol: {
    flex: 1,
    gap: 6,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  photoBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
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
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  italicInput: {
    fontStyle: 'italic',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
