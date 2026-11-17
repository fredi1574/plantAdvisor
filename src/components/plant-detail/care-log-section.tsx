import { Image } from 'expo-image';
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
  View,
} from 'react-native';

import { SwipeableLogItem } from '@/components/plant-detail/swipeable-log-item';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  SOIL_MOISTURE_OPTIONS,
  type SoilMoistureLevel,
} from '@/constants/plantOptions';
import {
  BorderWidth,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import { pickPlantImage } from '@/services/imagePicker';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  CareEventType,
  NotebookEntry,
  UserPlant,
} from '@/types/plant';

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
  soilMoisture: SoilMoistureLevel | undefined;
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
    const result = await pickPlantImage(source, { quality: 0.75 });
    if (result.ok) {
      updateForm('photoUri', result.uri);
    } else if (result.reason !== 'canceled' && result.message) {
      onShowToast(result.message);
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
    <SurfaceCard>
      <View style={styles.headerRow}>
        <Text
          style={[styles.sectionHeaderTitle, { color: palette.textPrimary }]}>
          Quick-Log Care or Propagation Milestone
        </Text>
        <Chip
          label={showDetailedLog ? 'Hide Details' : 'Photo & Metrics'}
          selected={showDetailedLog}
          icon={
            <Camera
              size={12}
              color={showDetailedLog ? palette.primary : palette.textSecondary}
            />
          }
          onPress={() => {
            triggerLightHaptic();
            setShowDetailedLog((prev) => !prev);
          }}
        />
      </View>

      <BotanicalInput
        surface="primary"
        compact={false}
        value={form.customNote}
        onChangeText={(value) => updateForm('customNote', value)}
        placeholder="Optional note (e.g., 'Root reached 10.5cm' or 'Bottom-soaked for 15m')..."
      />

      {showDetailedLog && (
        <SurfaceCard variant="nested" style={styles.detailedDrawer}>
          <View style={styles.photoPickerRow}>
            <Pressable
              onPress={() => void handlePickLogPhoto('camera')}
              style={[
                styles.photoPickerBtn,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <Camera size={14} color={palette.primary} />
              <Text
                style={[
                  styles.photoPickerBtnText,
                  { color: palette.textPrimary },
                ]}>
                Camera
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handlePickLogPhoto('library')}
              style={[
                styles.photoPickerBtn,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <ImageIcon size={14} color={palette.primary} />
              <Text
                style={[
                  styles.photoPickerBtnText,
                  { color: palette.textPrimary },
                ]}>
                Library
              </Text>
            </Pressable>
          </View>

          {Boolean(form.photoUri) && (
            <View style={styles.photoPreviewRow}>
              <Image
                source={{ uri: form.photoUri }}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <Chip
                label="Remove Photo"
                icon={<X size={12} color={palette.textSecondary} />}
                onPress={() => updateForm('photoUri', undefined)}
              />
            </View>
          )}

          <View style={styles.moistureSection}>
            <Text
              style={[styles.moistureLabel, { color: palette.textSecondary }]}>
              Soil Moisture Prior
            </Text>
            <View style={styles.moistureChipsRow}>
              {SOIL_MOISTURE_OPTIONS.map((opt) => {
                const active = form.soilMoisture === opt.key;
                return (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={active}
                    onPress={() =>
                      updateForm('soilMoisture', active ? undefined : opt.key)
                    }
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.metricsRow}>
            <BotanicalInput
              value={form.waterMl}
              onChangeText={(value) => updateForm('waterMl', value)}
              placeholder="Water (ml)"
              keyboardType="numeric"
              style={styles.metricInput}
            />
            <BotanicalInput
              value={form.rootCm}
              onChangeText={(value) => updateForm('rootCm', value)}
              placeholder="Root (cm)"
              keyboardType="decimal-pad"
              style={styles.metricInput}
            />
          </View>

          <View style={styles.metricsRow}>
            <BotanicalInput
              value={form.stemCm}
              onChangeText={(value) => updateForm('stemCm', value)}
              placeholder="Stem (cm)"
              keyboardType="decimal-pad"
              style={styles.metricInput}
            />
            <BotanicalInput
              value={form.leafCount}
              onChangeText={(value) => updateForm('leafCount', value)}
              placeholder="Leaf count"
              keyboardType="numeric"
              style={styles.metricInput}
            />
          </View>
        </SurfaceCard>
      )}

      <View style={styles.quickActionsGrid}>
        {quickActions.map((qa) => {
          const isSelected = selectedQuickType === qa.type;
          return (
            <Chip
              key={qa.type}
              label={`+ ${qa.label}`}
              variant="subtle"
              size="md"
              onPress={() => handleQuickLog(qa.type)}
              icon={
                <>
                  {qa.type === 'water' && (
                    <Droplets size={15} color={qa.color} />
                  )}
                  {qa.type === 'propagation' && (
                    <Sprout size={15} color={qa.color} />
                  )}
                  {qa.type === 'fertilize' && (
                    <FlaskConical size={15} color={qa.color} />
                  )}
                  {qa.type === 'prune' && (
                    <Scissors size={15} color={qa.color} />
                  )}
                  {qa.type === 'repot' && (
                    <Sprout size={15} color={qa.color} />
                  )}
                  {qa.type === 'note' && (
                    <FileText size={15} color={qa.color} />
                  )}
                </>
              }
              style={
                isSelected
                  ? {
                      borderColor: qa.color,
                      backgroundColor: palette.bgPrimary,
                    }
                  : undefined
              }
              textStyle={{ color: palette.textPrimary }}
            />
          );
        })}
      </View>

      <View
        style={[
          styles.timelineDivider,
          { backgroundColor: palette.borderSubtle },
        ]}
      />

      <Text style={[styles.sectionHeaderTitle, { color: palette.textPrimary }]}>
        Chronological Notebook Timeline ({plantEntries.length})
      </Text>

      <View>
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
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  detailedDrawer: {
    borderRadius: 14,
    gap: 10,
  },
  photoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  photoPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    borderWidth: BorderWidth.hairline,
  },
  photoPickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
  moistureSection: {
    gap: 6,
  },
  moistureLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  moistureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricInput: {
    flex: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timelineDivider: {
    height: BorderWidth.hairline,
    marginVertical: Spacing.xs,
  },
});
