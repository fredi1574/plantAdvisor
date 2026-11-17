import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Droplets,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Scissors,
  Sprout,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SwipeableLogItem } from '@/components/plant-detail/swipeable-log-item';
import {
  CardShadow,
  Radius,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  CareEventType,
  NotebookEntry,
  UserPlant,
} from '@/types/plant';

type SoilMoisture = NonNullable<NotebookEntry['metrics']>['soilMoisture'];

const SOIL_MOISTURE_OPTIONS: {
  value: NonNullable<SoilMoisture>;
  label: string;
}[] = [
  { value: 'bone_dry', label: 'Bone Dry' },
  { value: 'slightly_damp', label: 'Slightly Damp' },
  { value: 'moist', label: 'Moist' },
  { value: 'waterlogged', label: 'Waterlogged' },
];

const getQuickActions = (
  palette: ThemePalette
): {
  type: CareEventType;
  label: string;
  defaultTitle: string;
  defaultNotes: string;
  color: string;
}[] => [
  {
    type: 'water',
    label: 'Log Water',
    defaultTitle: 'Thorough Watering',
    defaultNotes: 'Watered after checking substrate dryness.',
    color: palette.waterBlue,
  },
  {
    type: 'propagation',
    label: 'Prop Milestone',
    defaultTitle: 'Propagation Growth Check',
    defaultNotes: 'Logged new root/shoot elongation milestone.',
    color: palette.accentTerracotta,
  },
  {
    type: 'fertilize',
    label: 'Fertilize',
    defaultTitle: 'Diluted Nutrient Feed',
    defaultNotes: 'Applied balanced liquid fertilizer at 1/2 strength.',
    color: palette.primary,
  },
  {
    type: 'prune',
    label: 'Prune',
    defaultTitle: 'Canopy & Leaf Pruning',
    defaultNotes: 'Removed spent lower foliage and pinched apical tip.',
    color: palette.primaryMuted,
  },
  {
    type: 'repot',
    label: 'Repot',
    defaultTitle: 'Substrate & Pot Refresh',
    defaultNotes: 'Checked root health and refreshed gritty aerated substrate.',
    color: palette.accentTerracotta,
  },
  {
    type: 'note',
    label: 'Add Note',
    defaultTitle: 'Botanical Observation Note',
    defaultNotes: 'Leaves looking turgid and well-oriented toward window light.',
    color: palette.textSecondary,
  },
];

interface CareLogFormState {
  customNote: string;
  photoUri: string | undefined;
  soilMoisture: SoilMoisture | undefined;
  waterMl: string;
  rootCm: string;
  stemCm: string;
  leafCount: string;
}

const INITIAL_LOG_FORM: CareLogFormState = {
  customNote: '',
  photoUri: undefined,
  soilMoisture: undefined,
  waterMl: '',
  rootCm: '',
  stemCm: '',
  leafCount: '',
};

interface CareLogSectionProps {
  plant: UserPlant;
  plantEntries: NotebookEntry[];
  onShowToast: (message: string) => void;
  onEditEntry: (entry: NotebookEntry) => void;
  onDeleteEntry: (entry: NotebookEntry) => void;
}

/**
 * Quick-action care event composer (with optional photo and botanical metrics)
 * paired with the plant's chronological notebook timeline.
 */
export function CareLogSection({
  plant,
  plantEntries,
  onShowToast,
  onEditEntry,
  onDeleteEntry,
}: CareLogSectionProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const quickActions = useMemo(() => getQuickActions(palette), [palette]);

  const logCareEvent = usePlantStore((s) => s.logCareEvent);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);

  const [selectedQuickType, setSelectedQuickType] =
    useState<CareEventType>('water');
  const [showDetailedLog, setShowDetailedLog] = useState(false);
  const [form, setForm] = useState<CareLogFormState>(INITIAL_LOG_FORM);

  const updateForm = <K extends keyof CareLogFormState>(
    key: K,
    value: CareLogFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickLogPhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          onShowToast('Camera permission is needed to attach a progress photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.75,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          updateForm('photoUri', result.assets[0].uri);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          onShowToast('Photo library permission is needed to pick a photo.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          updateForm('photoUri', result.assets[0].uri);
        }
      }
    } catch {
      onShowToast('Unable to select photo right now.');
    }
  };

  const handleQuickLog = (actionType: CareEventType) => {
    setSelectedQuickType(actionType);
    triggerLightHaptic();

    const parsedWater = Number(form.waterMl);
    const parsedRoot = Number(form.rootCm);
    const parsedStem = Number(form.stemCm);
    const parsedLeaves = Number(form.leafCount);
    const hasMetrics =
      Boolean(form.soilMoisture) ||
      (!Number.isNaN(parsedWater) && parsedWater > 0) ||
      (!Number.isNaN(parsedRoot) && parsedRoot > 0) ||
      (!Number.isNaN(parsedStem) && parsedStem > 0) ||
      (!Number.isNaN(parsedLeaves) && parsedLeaves > 0);

    if (
      actionType === 'water' &&
      !form.customNote.trim() &&
      !form.photoUri &&
      !hasMetrics
    ) {
      waterPlantNow(plant.id);
      return;
    }

    const template =
      quickActions.find((a) => a.type === actionType) ?? quickActions[0];

    const metrics: NotebookEntry['metrics'] | undefined = hasMetrics
      ? {
          ...(form.soilMoisture ? { soilMoisture: form.soilMoisture } : {}),
          ...(!Number.isNaN(parsedWater) && parsedWater > 0
            ? { waterAmountMl: Math.round(parsedWater) }
            : {}),
          ...(!Number.isNaN(parsedRoot) && parsedRoot > 0
            ? { rootLengthCm: parsedRoot }
            : {}),
          ...(!Number.isNaN(parsedStem) && parsedStem > 0
            ? { stemHeightCm: parsedStem }
            : {}),
          ...(!Number.isNaN(parsedLeaves) && parsedLeaves > 0
            ? { leafCount: Math.round(parsedLeaves) }
            : {}),
        }
      : undefined;

    logCareEvent({
      plantId: plant.id,
      eventType: actionType,
      title: template.defaultTitle,
      notes: form.customNote.trim() || template.defaultNotes,
      photoUri: form.photoUri,
      metrics,
    });
    setForm(INITIAL_LOG_FORM);
    onShowToast(`Logged ${template.label} for "${plant.nickname}".`);
  };

  return (
    <View style={styles.timelineSectionCard}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeaderTitle}>
          Quick-Log Care or Propagation Milestone
        </Text>
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setShowDetailedLog((prev) => !prev);
          }}
          style={[
            styles.toggleDetailsBtn,
            showDetailedLog && styles.toggleDetailsBtnActive,
          ]}>
          <Camera
            size={12}
            color={showDetailedLog ? palette.primary : palette.textSecondary}
          />
          <Text
            style={[
              styles.toggleDetailsText,
              showDetailedLog && styles.toggleDetailsTextActive,
            ]}>
            {showDetailedLog ? 'Hide Details' : 'Photo & Metrics'}
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={form.customNote}
        onChangeText={(value) => updateForm('customNote', value)}
        placeholder="Optional note (e.g., 'Root reached 10.5cm' or 'Bottom-soaked for 15m')..."
        placeholderTextColor={palette.textMuted}
        style={styles.quickNoteInput}
      />

      {showDetailedLog && (
        <View style={styles.detailedDrawer}>
          <View style={styles.photoPickerRow}>
            <Pressable
              onPress={() => void handlePickLogPhoto('camera')}
              style={styles.photoPickerBtn}>
              <Camera size={14} color={palette.primary} />
              <Text style={styles.photoPickerBtnText}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={() => void handlePickLogPhoto('library')}
              style={styles.photoPickerBtn}>
              <ImageIcon size={14} color={palette.primary} />
              <Text style={styles.photoPickerBtnText}>Library</Text>
            </Pressable>
          </View>

          {Boolean(form.photoUri) && (
            <View style={styles.photoPreviewRow}>
              <Image
                source={{ uri: form.photoUri }}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <Pressable
                onPress={() => updateForm('photoUri', undefined)}
                style={styles.removePhotoBtn}>
                <X size={12} color={palette.textSecondary} />
                <Text style={styles.removePhotoText}>Remove Photo</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.moistureSection}>
            <Text style={styles.moistureLabel}>Soil Moisture Prior</Text>
            <View style={styles.moistureChipsRow}>
              {SOIL_MOISTURE_OPTIONS.map((opt) => {
                const active = form.soilMoisture === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() =>
                      updateForm('soilMoisture', active ? undefined : opt.value)
                    }
                    style={[
                      styles.moistureChip,
                      active && styles.moistureChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.moistureChipText,
                        active && styles.moistureChipTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.metricsRow}>
            <TextInput
              value={form.waterMl}
              onChangeText={(value) => updateForm('waterMl', value)}
              placeholder="Water (ml)"
              placeholderTextColor={palette.textMuted}
              keyboardType="numeric"
              style={styles.metricInput}
            />
            <TextInput
              value={form.rootCm}
              onChangeText={(value) => updateForm('rootCm', value)}
              placeholder="Root (cm)"
              placeholderTextColor={palette.textMuted}
              keyboardType="decimal-pad"
              style={styles.metricInput}
            />
          </View>

          <View style={styles.metricsRow}>
            <TextInput
              value={form.stemCm}
              onChangeText={(value) => updateForm('stemCm', value)}
              placeholder="Stem (cm)"
              placeholderTextColor={palette.textMuted}
              keyboardType="decimal-pad"
              style={styles.metricInput}
            />
            <TextInput
              value={form.leafCount}
              onChangeText={(value) => updateForm('leafCount', value)}
              placeholder="Leaf count"
              placeholderTextColor={palette.textMuted}
              keyboardType="numeric"
              style={styles.metricInput}
            />
          </View>
        </View>
      )}

      <View style={styles.quickActionsGrid}>
        {quickActions.map((qa) => {
          const isSelected = selectedQuickType === qa.type;
          return (
            <Pressable
              key={qa.type}
              onPress={() => handleQuickLog(qa.type)}
              style={({ pressed }) => [
                styles.quickActionBtn,
                isSelected && {
                  borderColor: qa.color,
                  backgroundColor: palette.bgPrimary,
                },
                pressed && { opacity: 0.75 },
              ]}>
              {qa.type === 'water' && <Droplets size={15} color={qa.color} />}
              {qa.type === 'propagation' && (
                <Sprout size={15} color={qa.color} />
              )}
              {qa.type === 'fertilize' && (
                <FlaskConical size={15} color={qa.color} />
              )}
              {qa.type === 'prune' && <Scissors size={15} color={qa.color} />}
              {qa.type === 'repot' && <Sprout size={15} color={qa.color} />}
              {qa.type === 'note' && <FileText size={15} color={qa.color} />}
              <Text style={styles.quickActionLabel}>+ {qa.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.timelineDivider} />

      <View style={styles.timelineHeaderBlock}>
        <Text style={styles.sectionHeaderTitle}>
          Chronological Notebook Timeline ({plantEntries.length})
        </Text>
      </View>

      <View style={styles.timelineList}>
        {plantEntries.map((entry, idx) => (
          <SwipeableLogItem
            key={entry.id}
            entry={entry}
            isLast={idx === plantEntries.length - 1}
            onEdit={onEditEntry}
            onDelete={onDeleteEntry}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    timelineSectionCard: {
      backgroundColor: palette.bgSurface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      gap: Spacing.md,
      ...CardShadow,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionHeaderTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    toggleDetailsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: palette.bgPrimary,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    toggleDetailsBtnActive: {
      backgroundColor: palette.primarySoft,
      borderColor: palette.primary,
    },
    toggleDetailsText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.textSecondary,
    },
    toggleDetailsTextActive: {
      color: palette.primary,
    },
    quickNoteInput: {
      backgroundColor: palette.bgPrimary,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: palette.textPrimary,
    },
    detailedDrawer: {
      backgroundColor: palette.bgPrimary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      padding: 12,
      gap: 10,
    },
    photoPickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    photoPickerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: palette.bgSurface,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    photoPickerBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    photoPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    photoPreview: {
      width: 56,
      height: 56,
      borderRadius: 10,
    },
    removePhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.bgSurface,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    removePhotoText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.textSecondary,
    },
    moistureSection: {
      gap: 6,
    },
    moistureLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.textSecondary,
    },
    moistureChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    moistureChip: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: palette.bgSurface,
      borderColor: palette.borderSubtle,
    },
    moistureChipActive: {
      backgroundColor: palette.primarySoft,
      borderColor: palette.primary,
    },
    moistureChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.textSecondary,
    },
    moistureChipTextActive: {
      color: palette.primary,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metricInput: {
      flex: 1,
      backgroundColor: palette.bgSurface,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 12,
      color: palette.textPrimary,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.bgSubtle,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.full,
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    timelineDivider: {
      height: 1,
      backgroundColor: palette.borderSubtle,
      marginVertical: 4,
    },
    timelineHeaderBlock: {
      gap: 4,
    },
    timelineList: {
      gap: 0,
    },
  });
