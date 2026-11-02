import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CardShadow,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { prepareImageForAI } from '@/services/imageUtils';
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

const PLANT_TYPES: { key: PlantType; label: string }[] = [
  { key: 'succulent', label: 'Succulent' },
  { key: 'propagation', label: 'Propagation' },
  { key: 'foliage', label: 'Foliage' },
  { key: 'flowering', label: 'Flowering' },
];

const POT_MATERIALS: { key: PotMaterial; label: string }[] = [
  { key: 'terracotta', label: 'Terracotta' },
  { key: 'ceramic_glazed', label: 'Glazed Ceramic' },
  { key: 'plastic_nursery', label: 'Nursery Pot' },
  { key: 'glass_vessel', label: 'Glass Jar' },
  { key: 'fabric_grow_bag', label: 'Grow Bag' },
];

const LIGHT_EXPOSURES: { key: LightExposure; label: string }[] = [
  { key: 'bright_direct', label: 'Bright Direct' },
  { key: 'bright_indirect', label: 'Bright Indirect' },
  { key: 'medium_filtered', label: 'Medium Filtered' },
  { key: 'low_shade', label: 'Low Shade' },
  { key: 'grow_light', label: 'Grow Light' },
];

export function EditPlantModal({
  plant,
  visible,
  onClose,
  onSaved,
  onRequestDelete,
}: EditPlantModalProps) {
  if (!plant) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <EditPlantFormSheet
        key={plant.id}
        plant={plant}
        onClose={onClose}
        onSaved={onSaved}
        onRequestDelete={onRequestDelete}
      />
    </Modal>
  );
}

interface EditPlantFormSheetProps {
  plant: UserPlant;
  onClose: () => void;
  onSaved?: (nickname: string) => void;
  onRequestDelete?: (plant: UserPlant) => void;
}

function EditPlantFormSheet({
  plant,
  onClose,
  onSaved,
  onRequestDelete,
}: EditPlantFormSheetProps) {
  const updatePlant = usePlantStore((s) => s.updatePlant);

  const [nickname, setNickname] = useState(plant.nickname);
  const [commonName, setCommonName] = useState(plant.species.commonName);
  const [scientificName, setScientificName] = useState(
    plant.species.scientificName
  );
  const [plantType, setPlantType] = useState<PlantType>(
    plant.species.plantType
  );
  const [location, setLocation] = useState(plant.location);
  const [wateringDays, setWateringDays] = useState(
    String(plant.customWateringIntervalDays)
  );
  const [lightExposure, setLightExposure] = useState<LightExposure>(
    plant.lightExposure
  );
  const [potMaterial, setPotMaterial] = useState<PotMaterial>(
    plant.potMaterial
  );
  const [hasDrainageHole, setHasDrainageHole] = useState(plant.hasDrainageHole);
  const [photoUri, setPhotoUri] = useState(plant.photoUri);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!picked.canceled && picked.assets[0]?.uri) {
      const prepared = await prepareImageForAI(picked.assets[0].uri);
      setPhotoUri(prepared.uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const snapped = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!snapped.canceled && snapped.assets[0]?.uri) {
      const prepared = await prepareImageForAI(snapped.assets[0].uri);
      setPhotoUri(prepared.uri);
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

    const finalNickname = nickname.trim() || plant.nickname;

    updatePlant(plant.id, {
      nickname: finalNickname,
      commonName: commonName.trim() || plant.species.commonName,
      scientificName: scientificName.trim() || plant.species.scientificName,
      plantType,
      location: location.trim() || plant.location,
      customWateringIntervalDays: intervalDays,
      lightExposure,
      potMaterial,
      hasDrainageHole,
      photoUri: photoUri || plant.photoUri,
    });

    onSaved?.(finalNickname);
    onClose();
  };

  return (
    <KeyboardAvoidingView
      style={styles.backdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdropDismiss} onPress={onClose} />

      <View style={styles.sheetContainer}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconPill}>
              <Pencil size={16} color={Palette.primary} />
            </View>
            <View>
              <Text style={styles.sheetEyebrow}>BOTANICAL SPECIMEN</Text>
              <Text style={styles.sheetTitle}>Edit Plant Details</Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeIconBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close edit plant modal">
            <X size={20} color={Palette.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Photo Row */}
          <View style={styles.photoRow}>
            <Image
              source={{ uri: photoUri || plant.photoUri }}
              style={styles.photoPreview}
              contentFit="cover"
            />
            <View style={styles.photoActionsCol}>
              <Text style={styles.fieldLabel}>Specimen Photo</Text>
              <View style={styles.photoButtonsRow}>
                <Pressable
                  onPress={handleTakePhoto}
                  style={({ pressed }) => [
                    styles.photoBtn,
                    pressed && { opacity: 0.8 },
                  ]}>
                  <Camera size={14} color={Palette.primary} />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </Pressable>
                <Pressable
                  onPress={handlePickPhoto}
                  style={({ pressed }) => [
                    styles.photoBtn,
                    pressed && { opacity: 0.8 },
                  ]}>
                  <ImageIcon size={14} color={Palette.primary} />
                  <Text style={styles.photoBtnText}>Library</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Nickname */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Plant Nickname</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="e.g., Sunny Window Jade"
              placeholderTextColor={Palette.textMuted}
              style={styles.textInput}
            />
          </View>

          {/* Common & Scientific Name */}
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Common Name</Text>
              <TextInput
                value={commonName}
                onChangeText={setCommonName}
                placeholder="e.g., Jade Plant"
                placeholderTextColor={Palette.textMuted}
                style={styles.textInput}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Scientific Name</Text>
              <TextInput
                value={scientificName}
                onChangeText={setScientificName}
                placeholder="e.g., Crassula ovata"
                placeholderTextColor={Palette.textMuted}
                style={[styles.textInput, styles.italicInput]}
              />
            </View>
          </View>

          {/* Location & Watering Interval */}
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1.3 }]}>
              <Text style={styles.fieldLabel}>Location in Home / Garden</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., South Sill"
                placeholderTextColor={Palette.textMuted}
                style={styles.textInput}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Water Every (Days)</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => adjustWateringDays(-1)}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease watering interval">
                  <Minus size={15} color={Palette.textPrimary} />
                </Pressable>
                <TextInput
                  value={wateringDays}
                  onChangeText={setWateringDays}
                  keyboardType="number-pad"
                  style={styles.stepperInput}
                />
                <Pressable
                  onPress={() => adjustWateringDays(1)}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Increase watering interval">
                  <Plus size={15} color={Palette.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Plant Category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Botanical Category</Text>
            <View style={styles.chipRow}>
              {PLANT_TYPES.map((pt) => {
                const active = plantType === pt.key;
                return (
                  <Pressable
                    key={pt.key}
                    onPress={() => setPlantType(pt.key)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}>
                      {pt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Light Exposure */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Light Exposure</Text>
            <View style={styles.chipRow}>
              {LIGHT_EXPOSURES.map((le) => {
                const active = lightExposure === le.key;
                return (
                  <Pressable
                    key={le.key}
                    onPress={() => setLightExposure(le.key)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}>
                      {le.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Pot Material */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Pot / Vessel Material</Text>
            <View style={styles.chipRow}>
              {POT_MATERIALS.map((pm) => {
                const active = potMaterial === pm.key;
                return (
                  <Pressable
                    key={pm.key}
                    onPress={() => setPotMaterial(pm.key)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}>
                      {pm.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Drainage Hole Switch */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>
                Container Has Bottom Drainage Hole
              </Text>
              <Text style={styles.switchSub}>
                Recommended for healthy root aeration and preventing rot
              </Text>
            </View>
            <Switch
              value={hasDrainageHole}
              onValueChange={setHasDrainageHole}
              trackColor={{
                false: Palette.borderSubtle,
                true: Palette.primary,
              }}
            />
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.sheetFooter}>
          {onRequestDelete && (
            <Pressable
              onPress={() => {
                onClose();
                onRequestDelete(plant);
              }}
              style={({ pressed }) => [
                styles.deleteOutlineBtn,
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${plant.nickname}`}>
              <Trash2 size={16} color={Palette.criticalText} />
            </Pressable>
          )}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.75 },
            ]}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.85 },
            ]}>
            <CheckCircle2 size={16} color={Palette.textInverse} />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 40, 32, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '90%',
    backgroundColor: Palette.bgSurface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    overflow: 'hidden',
    ...CardShadow,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.bgSubtle,
    backgroundColor: Palette.bgPrimary,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Palette.primary,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    maxHeight: 500,
  },
  formContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.bgPrimary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    backgroundColor: Palette.bgSubtle,
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
    backgroundColor: Palette.bgSurface,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  photoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  textInput: {
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Palette.textPrimary,
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
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: Palette.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    paddingVertical: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: Palette.textInverse,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Palette.bgPrimary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  switchSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.bgSubtle,
    backgroundColor: Palette.bgPrimary,
  },
  deleteOutlineBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Palette.criticalBg,
    borderWidth: 1,
    borderColor: Palette.criticalBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 'auto',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textInverse,
  },
});
