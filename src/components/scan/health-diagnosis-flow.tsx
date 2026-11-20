import { Stethoscope } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  AiQuotaExceededError,
  diagnosePlantHealth,
} from '@/services/aiPlantService';
import { triggerSuccessHaptic } from '@/services/haptics';
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
  initialPlantId?: string;
  aiQuota: AiQuotaStatus | null;
  onQuotaExceeded: (quota?: AiQuotaStatus) => void;
  onError: (message: string | null) => void;
}

/**
 * Step 2 specimen selection, multi-angle diagnostic photos, symptoms, and AI diagnosis results.
 */
export function HealthDiagnosisFlow({
  imageUri,
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
    <SurfaceCard>
      <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
        Step 2 — Select Specimen & Describe Symptoms
      </Text>

      <View style={styles.presetRow}>
        {plants.map((plant) => (
          <Chip
            key={plant.id}
            label={`${plant.nickname} (${plant.species.commonName})`}
            variant="subtle"
            size="md"
            selected={plant.id === selectedPlant?.id}
            selectedStyle="solid"
            onPress={() => setSelectedPlantId(plant.id)}
          />
        ))}
      </View>

      {selectedPlant && (
        <SurfaceCard variant="nested">
          <Text style={[styles.contextSummaryTitle, { color: palette.primary }]}>
            Historical Context Injected into AI Prompt:
          </Text>
          <Text
            style={[styles.contextSummaryItem, { color: palette.textSecondary }]}>
            • Species: {selectedPlant.species.commonName} (
            {selectedPlant.species.scientificName},{' '}
            {selectedPlant.species.family})
          </Text>
          <Text
            style={[styles.contextSummaryItem, { color: palette.textSecondary }]}>
            • Container: {selectedPlant.potMaterial.replace('_', ' ')} •{' '}
            {selectedPlant.hasDrainageHole
              ? 'Has drainage hole'
              : 'NO drainage hole'}
          </Text>
          <Text
            style={[styles.contextSummaryItem, { color: palette.textSecondary }]}>
            • Care Timeline: {selectedPlantLogs.length} logged events (Last
            watered: {new Date(selectedPlant.lastWateredAt).toLocaleDateString()}
            )
          </Text>
        </SurfaceCard>
      )}

      <MultiAnglePhotoPicker
        photos={diagnosticPhotos}
        onPickPhoto={(angle, source) =>
          void handlePickDiagnosticAnglePhoto(angle, source)
        }
        onClearPhoto={handleClearDiagnosticPhoto}
      />

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          Visual Symptoms / Observations (Optional)
        </Text>
        <BotanicalInput
          surface="primary"
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

      <Pressable
        onPress={() => void handleRunHealthDiagnosis()}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.primaryActionBtn,
          { backgroundColor: palette.primary },
          (pressed || isLoading) && { opacity: 0.85 },
        ]}>
        {isLoading ? (
          <ActivityIndicator color={palette.textInverse} size="small" />
        ) : (
          <Stethoscope size={17} color={palette.textInverse} />
        )}
        <Text
          style={[styles.primaryActionBtnText, { color: palette.textInverse }]}>
          {isLoading
            ? 'Cross-Referencing Photo & Care Logs...'
            : 'Run AI Health & Condition Scan'}
        </Text>
      </Pressable>

      {diagnosisResult && selectedPlant && (
        <DiagnosisResultPanel
          diagnosis={diagnosisResult}
          plant={selectedPlant}
        />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.cardTitle,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  contextSummaryTitle: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.half,
  },
  contextSummaryItem: {
    fontSize: 12,
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
