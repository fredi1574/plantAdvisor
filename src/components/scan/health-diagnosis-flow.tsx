import { Info, Stethoscope, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DiagnosisResultPanel } from '@/components/scan/diagnosis-result-panel';
import {
  DIAGNOSTIC_ANGLE_SLOTS,
  MultiAnglePhotoPicker,
} from '@/components/scan/multi-angle-photo-picker';
import { PhotoCaptureCard } from '@/components/scan/photo-capture-card';
import { PlantSelectorField } from '@/components/scan/plant-selector-field';
import {
  AnimatedEntrance,
  SpringPressable,
} from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { AiScanShimmerCard } from '@/components/ui/botanical-shimmer';
import { Chip } from '@/components/ui/chip';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  AiQuotaExceededError,
  diagnosePlantHealth,
} from '@/services/aiPlantService';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/services/haptics';
import { pickPlantImage, type ImagePickSource } from '@/services/imagePicker';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  AiQuotaStatus,
  DiagnosticPhotoAngle,
  DiagnosticPhotoInput,
  PlantDiagnosisResult,
} from '@/types/plant';

const SYMPTOM_CHIPS = [
  'Yellowing lower leaves',
  'Soft or mushy leaves',
  'Stretched / leggy stems',
  'Brown crispy leaf tips',
] as const;

interface HealthDiagnosisFlowProps {
  imageUri: string;
  imageDimensions: string;
  onImageSelected: (uri: string, dimensions: string) => void;
  initialPlantId?: string;
  aiQuota: AiQuotaStatus | null;
  onQuotaExceeded: (quota?: AiQuotaStatus) => void;
  onError: (message: string | null) => void;
}

/**
 * Step 1 specimen dropdown selection, Step 2 diagnostic photo capture,
 * and Step 3 symptoms + AI health diagnosis results.
 */
export function HealthDiagnosisFlow({
  imageUri,
  imageDimensions,
  onImageSelected,
  initialPlantId,
  aiQuota,
  onQuotaExceeded,
  onError,
}: HealthDiagnosisFlowProps) {
  const palette = usePalette();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const saveHealthAssessment = usePlantStore((s) => s.saveHealthAssessment);

  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    initialPlantId || plants[0]?.id || ''
  );
  const [prevInitialPlantId, setPrevInitialPlantId] = useState(initialPlantId);
  if (initialPlantId && initialPlantId !== prevInitialPlantId) {
    setPrevInitialPlantId(initialPlantId);
    setSelectedPlantId(initialPlantId);
  }

  const [observationNotes, setObservationNotes] = useState('');
  const [diagnosticPhotos, setDiagnosticPhotos] = useState<
    Partial<Record<DiagnosticPhotoAngle, string>>
  >({});
  const [diagnosisResult, setDiagnosisResult] =
    useState<PlantDiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const selectedPlant = useMemo(
    () => plants.find((p) => p.id === selectedPlantId) ?? plants[0],
    [plants, selectedPlantId]
  );

  const selectedPlantLogs = useMemo(
    () =>
      entries
        .filter((e) => e.plantId === selectedPlant?.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [entries, selectedPlant]
  );

  const handlePickDiagnosticAnglePhoto = async (
    angle: DiagnosticPhotoAngle,
    source: ImagePickSource
  ) => {
    onError(null);
    const result = await pickPlantImage(source, {
      allowsEditing: true,
      quality: 0.85,
      prepareForAI: true,
    });
    if (result.ok) {
      setDiagnosticPhotos((prev) => ({ ...prev, [angle]: result.uri }));
    } else if (result.reason !== 'canceled' && result.message) {
      onError(result.message);
    }
  };

  const handleClearDiagnosticPhoto = (angle: DiagnosticPhotoAngle) => {
    setDiagnosticPhotos((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
  };

  const handleRunHealthDiagnosis = async () => {
    if (!selectedPlant) {
      onError('No plant selected for diagnosis.');
      return;
    }
    if (aiQuota && aiQuota.remaining <= 0) {
      onQuotaExceeded();
      return;
    }

    onError(null);
    setIsLoading(true);
    try {
      const multiAngleInputs: DiagnosticPhotoInput[] = DIAGNOSTIC_ANGLE_SLOTS.map(
        (slot) => ({
          angle: slot.angle,
          label: slot.label,
          uri: diagnosticPhotos[slot.angle] || '',
        })
      ).filter((item) => Boolean(item.uri));

      const diagnosisInput =
        multiAngleInputs.length > 0
          ? multiAngleInputs
          : imageUri || selectedPlant.photoUri;

      const primaryPhotoUri =
        multiAngleInputs[0]?.uri || imageUri || selectedPlant.photoUri;

      const diagnosis = await diagnosePlantHealth(
        diagnosisInput,
        selectedPlant,
        selectedPlantLogs,
        observationNotes
      );
      setDiagnosisResult(diagnosis);
      saveHealthAssessment(selectedPlant.id, diagnosis, primaryPhotoUri);
      triggerSuccessHaptic();
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        onQuotaExceeded(err.quota);
      } else {
        onError(
          err instanceof Error
            ? err.message
            : 'Failed to run AI health diagnosis.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.flowRoot}>
      <View style={styles.stepBlock}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          STEP 1 · CHOOSE SPECIMEN
        </Text>

        <View style={styles.specimenPickerRow}>
          <View style={styles.specimenPickerFlex}>
            <PlantSelectorField
              plants={plants}
              selectedPlant={selectedPlant}
              onSelectPlant={setSelectedPlantId}
            />
          </View>

          {selectedPlant && (
            <SpringPressable
              onPress={() => {
                triggerLightHaptic();
                setShowContext(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="View historical AI prompt context"
              style={[
                styles.contextInfoBtn,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <Info size={18} color={palette.primary} />
            </SpringPressable>
          )}
        </View>

        {selectedPlant && (
          <Modal
            visible={showContext}
            transparent
            animationType="fade"
            onRequestClose={() => setShowContext(false)}>
            <View
              style={[
                styles.modalBackdrop,
                { backgroundColor: palette.scrimDark },
              ]}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: palette.bgSurface,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <View
                      style={[
                        styles.modalIconBadge,
                        { backgroundColor: palette.primarySoft },
                      ]}>
                      <Info size={16} color={palette.primary} />
                    </View>
                    <Text
                      style={[
                        styles.modalTitle,
                        {
                          color: palette.textPrimary,
                          fontFamily: Fonts?.serif,
                        },
                      ]}>
                      AI Prompt Context
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowContext(false)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Close AI prompt context"
                    style={[
                      styles.modalCloseBtn,
                      { backgroundColor: palette.bgSubtle },
                    ]}>
                    <X size={16} color={palette.textSecondary} />
                  </Pressable>
                </View>

                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: palette.textSecondary },
                  ]}>
                  This specimen history is automatically included with your scan
                  so the AI can cross-reference watering and container details.
                </Text>

                <View
                  style={[
                    styles.modalDetailsBox,
                    {
                      backgroundColor: palette.bgPrimary,
                      borderColor: palette.borderSubtle,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.contextSummaryItem,
                      { color: palette.textPrimary },
                    ]}>
                    • Species: {selectedPlant.species.commonName} (
                    {selectedPlant.species.scientificName},{' '}
                    {selectedPlant.species.family})
                  </Text>
                  <Text
                    style={[
                      styles.contextSummaryItem,
                      { color: palette.textPrimary },
                    ]}>
                    • Container: {selectedPlant.potMaterial.replace('_', ' ')} •{' '}
                    {selectedPlant.hasDrainageHole
                      ? 'Has drainage hole'
                      : 'NO drainage hole'}
                  </Text>
                  <Text
                    style={[
                      styles.contextSummaryItem,
                      { color: palette.textPrimary },
                    ]}>
                    • Care Timeline: {selectedPlantLogs.length} logged{' '}
                    {selectedPlantLogs.length === 1 ? 'event' : 'events'} (Last
                    watered:{' '}
                    {new Date(selectedPlant.lastWateredAt).toLocaleDateString()}
                    )
                  </Text>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>

      <View
        style={[
          styles.sectionDivider,
          { backgroundColor: palette.borderSubtle },
        ]}
      />

      <View style={styles.stepBlock}>
        <PhotoCaptureCard
          stepLabel="STEP 2 · LEAF OR PLANT PHOTO"
          imageUri={imageUri}
          imageDimensions={imageDimensions}
          onImageSelected={onImageSelected}
          onError={onError}
        />

        <MultiAnglePhotoPicker
          photos={diagnosticPhotos}
          onPickPhoto={(angle, source) =>
            void handlePickDiagnosticAnglePhoto(angle, source)
          }
          onClearPhoto={handleClearDiagnosticPhoto}
        />
      </View>

      <View
        style={[
          styles.sectionDivider,
          { backgroundColor: palette.borderSubtle },
        ]}
      />

      <View style={styles.stepBlock}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          STEP 3 · SYMPTOMS &amp; AI HEALTH SCAN
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            Visual Symptoms / Observations (Optional)
          </Text>
          <BotanicalInput
            surface="surface"
            compact={false}
            value={observationNotes}
            onChangeText={setObservationNotes}
            multiline
            numberOfLines={3}
            style={styles.observationInput}
            placeholder="Describe any yellowing, wrinkling, stretching, spots, or root growth..."
          />
          <View style={styles.presetRow}>
            {SYMPTOM_CHIPS.map((symptom) => (
              <Chip
                key={symptom}
                label={`+ ${symptom}`}
                variant="subtle"
                size="md"
                onPress={() =>
                  setObservationNotes((prev) =>
                    prev.trim()
                      ? `${prev.trim().replace(/[.;]+$/, '')}; ${symptom.toLowerCase()}.`
                      : `${symptom}.`
                  )
                }
              />
            ))}
          </View>
        </View>

        <SpringPressable
          onPress={() => {
            triggerLightHaptic();
            void handleRunHealthDiagnosis();
          }}
          disabled={isLoading || !selectedPlant}
          accessibilityRole="button"
          style={[
            styles.primaryActionBtn,
            { backgroundColor: palette.primary },
            (isLoading || !selectedPlant) && { opacity: 0.65 },
          ]}>
          {isLoading ? (
            <ActivityIndicator color={palette.textInverse} size="small" />
          ) : (
            <Stethoscope size={17} color={palette.textInverse} />
          )}
          <Text
            style={[
              styles.primaryActionBtnText,
              { color: palette.textInverse },
            ]}>
            {isLoading
              ? 'Cross-Referencing Photo & Care Logs...'
              : 'Run AI Health & Condition Scan'}
          </Text>
        </SpringPressable>
      </View>

      {isLoading && <AiScanShimmerCard mode="diagnose" />}

      {!isLoading && diagnosisResult && selectedPlant && (
        <AnimatedEntrance>
          <DiagnosisResultPanel
            diagnosis={diagnosisResult}
            plant={selectedPlant}
          />
        </AnimatedEntrance>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flowRoot: {
    gap: Spacing.lg,
  },
  stepBlock: {
    gap: Spacing.md,
  },
  sectionDivider: {
    height: BorderWidth.hairline,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  specimenPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  specimenPickerFlex: {
    flex: 1,
  },
  contextInfoBtn: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...Typography.cardTitle,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    ...Typography.caption,
    lineHeight: 18,
  },
  modalDetailsBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  contextSummaryItem: {
    fontSize: 13,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  observationInput: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
