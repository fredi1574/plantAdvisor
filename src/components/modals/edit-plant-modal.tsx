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
      eyebrow="BOTANICAL SPECIMEN"
      title="Edit Plant Details"
      headerIcon={<Pencil size={16} color={palette.primary} />}
      saveLabel="Save Changes"
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
            Specimen Photo
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
                Camera
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
                Library
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          Plant Nickname
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          value={nickname}
          onChangeText={setNickname}
          placeholder="e.g., Sunny Window Jade"
        />
      </View>

      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            Common Name
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={commonName}
            onChangeText={setCommonName}
            placeholder="e.g., Jade Plant"
          />
        </View>

        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            Scientific Name
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={scientificName}
            onChangeText={setScientificName}
            placeholder="e.g., Crassula ovata"
            style={styles.italicInput}
          />
        </View>
      </View>

      {roomPresets.length > 0 && (
        <View style={styles.fieldGroup}>
          <View style={styles.presetHeaderRow}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              Room Presets
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
                Save Spot
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
                  label={`${preset.name} • ${preset.isIndoor ? 'Indoor' : 'Outdoor'}`}
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
            Location in Home / Garden
          </Text>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., South Sill"
          />
        </View>

        <View style={[styles.fieldGroup, styles.flex]}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            Water Every (Days)
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
            Fertilize Every (days)
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
            Rotate Every (days)
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
          Botanical Category
        </Text>
        <View style={styles.chipRow}>
          {PLANT_TYPE_OPTIONS.map((pt) => (
            <Chip
              key={pt.key}
              label={pt.label}
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
          Light Exposure
        </Text>
        <View style={styles.chipRow}>
          {LIGHT_EXPOSURE_OPTIONS.map((le) => (
            <Chip
              key={le.key}
              label={le.label}
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
          Pot / Vessel Material
        </Text>
        <View style={styles.chipRow}>
          {POT_MATERIAL_OPTIONS.map((pm) => (
            <Chip
              key={pm.key}
              label={pm.label}
              variant="subtle"
              selected={potMaterial === pm.key}
              selectedStyle="solid"
              onPress={() => setPotMaterial(pm.key)}
            />
          ))}
        </View>
      </View>

      <SwitchRow
        label="Container Has Bottom Drainage Hole"
        description="Recommended for healthy root aeration and preventing rot"
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
