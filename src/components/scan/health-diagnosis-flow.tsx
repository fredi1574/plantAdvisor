import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert,
  Stethoscope,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  getHealthBadgeTheme,
  getUrgencyBadgeTheme,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
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

const DIAGNOSTIC_ANGLE_SLOTS: {
  angle: DiagnosticPhotoAngle;
  label: string;
  hint: string;
}[] = [
  {
    angle: 'canopy',
    label: 'Whole Plant / Canopy',
    hint: 'Overall shape & light',
  },
  {
    angle: 'closeup',
    label: 'Leaf / Stem Close-Up',
    hint: 'Spots, pests, edema',
  },
  {
    angle: 'soil',
    label: 'Soil Surface & Pot Base',
    hint: 'Moisture & drainage',
  },
];

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
  const healthBadgeTheme = useMemo(
    () => getHealthBadgeTheme(palette),
    [palette]
  );
  const urgencyBadgeTheme = useMemo(
    () => getUrgencyBadgeTheme(palette),
    [palette]
  );

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

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          Multi-Angle Diagnostic Photos (Up to 3)
        </Text>
        <View style={styles.angleGrid}>
          {DIAGNOSTIC_ANGLE_SLOTS.map((slot) => {
            const uri = diagnosticPhotos[slot.angle];
            return (
              <View
                key={slot.angle}
                style={[
                  styles.angleSlot,
                  {
                    backgroundColor: palette.bgSubtle,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <View style={styles.angleSlotHeader}>
                  <View style={styles.flex}>
                    <Text
                      style={[
                        styles.angleSlotTitle,
                        { color: palette.textPrimary },
                      ]}>
                      {slot.label}
                    </Text>
                    <Text
                      style={[
                        styles.angleSlotHint,
                        { color: palette.textMuted },
                      ]}>
                      {slot.hint}
                    </Text>
                  </View>
                  {uri ? (
                    <Pressable
                      onPress={() =>
                        setDiagnosticPhotos((prev) => {
                          const next = { ...prev };
                          delete next[slot.angle];
                          return next;
                        })
                      }
                      style={[
                        styles.angleClearBtn,
                        { backgroundColor: palette.bgSurface },
                      ]}>
                      <X size={14} color={palette.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>

                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.anglePreview}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.angleActionsRow}>
                    <Pressable
                      onPress={() =>
                        void handlePickDiagnosticAnglePhoto(
                          slot.angle,
                          'camera'
                        )
                      }
                      style={[
                        styles.anglePickBtn,
                        {
                          backgroundColor: palette.bgSurface,
                          borderColor: palette.borderSubtle,
                        },
                      ]}>
                      <Camera size={14} color={palette.primary} />
                      <Text
                        style={[
                          styles.anglePickBtnText,
                          { color: palette.primary },
                        ]}>
                        Camera
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void handlePickDiagnosticAnglePhoto(
                          slot.angle,
                          'library'
                        )
                      }
                      style={[
                        styles.anglePickBtn,
                        {
                          backgroundColor: palette.bgSurface,
                          borderColor: palette.borderSubtle,
                        },
                      ]}>
                      <ImageIcon size={14} color={palette.primary} />
                      <Text
                        style={[
                          styles.anglePickBtnText,
                          { color: palette.primary },
                        ]}>
                        Library
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

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
        <View
          style={[
            styles.resultContainer,
            { borderTopColor: palette.borderSubtle },
          ]}>
          <View style={styles.resultHeaderRow}>
            <Text
              style={[styles.resultCommonName, { color: palette.textPrimary }]}>
              AI Diagnosis Complete
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    healthBadgeTheme[diagnosisResult.healthStatus].bg,
                  borderColor:
                    healthBadgeTheme[diagnosisResult.healthStatus].border,
                },
              ]}>
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color: healthBadgeTheme[diagnosisResult.healthStatus].text,
                  },
                ]}>
                {healthBadgeTheme[diagnosisResult.healthStatus].label}
              </Text>
            </View>
          </View>

          <Text style={[styles.resultNotes, { color: palette.textSecondary }]}>
            {diagnosisResult.diagnosisSummary}
          </Text>

          {diagnosisResult.succulentGuardrailApplied && (
            <View
              style={[
                styles.guardrailBox,
                {
                  backgroundColor: palette.attentionBg,
                  borderColor: palette.attentionBorder,
                },
              ]}>
              <ShieldAlert size={16} color={palette.attentionText} />
              <Text
                style={[
                  styles.guardrailText,
                  { color: palette.attentionText },
                ]}>
                {diagnosisResult.succulentGuardrailApplied}
              </Text>
            </View>
          )}

          <Text style={[styles.subHeader, { color: palette.textPrimary }]}>
            Recommended Next Steps:
          </Text>
          {diagnosisResult.recommendedActions.map((act, idx) => {
            const urg = urgencyBadgeTheme[act.urgency];
            return (
              <View
                key={idx}
                style={[
                  styles.actionRowItem,
                  {
                    backgroundColor: palette.bgPrimary,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <View
                  style={[
                    styles.urgencyPill,
                    { backgroundColor: urg.bg, borderColor: urg.border },
                  ]}>
                  <Text style={[styles.urgencyText, { color: urg.text }]}>
                    {urg.label}
                  </Text>
                </View>
                <Text
                  style={[styles.actionRowText, { color: palette.textPrimary }]}>
                  {act.instruction}
                </Text>
              </View>
            );
          })}

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/plant/[id]',
                params: { id: selectedPlant.id },
              })
            }
            style={({ pressed }) => [
              styles.terracottaBtn,
              { backgroundColor: palette.accentTerracotta },
              pressed && { opacity: 0.85 },
            ]}>
            <CheckCircle2 size={16} color={palette.textInverse} />
            <Text
              style={[
                styles.primaryActionBtnText,
                { color: palette.textInverse },
              ]}>
              View in {selectedPlant.nickname} Notebook
            </Text>
          </Pressable>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  angleGrid: {
    gap: Spacing.xs,
  },
  angleSlot: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  angleSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  angleSlotTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  angleSlotHint: {
    fontSize: 11,
  },
  angleClearBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
  },
  anglePreview: {
    width: '100%',
    height: 110,
    borderRadius: Radius.md,
  },
  angleActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  anglePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  anglePickBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
  terracottaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultContainer: {
    marginTop: Spacing.sm,
    paddingTop: 14,
    borderTopWidth: BorderWidth.hairline,
    gap: Spacing.md,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultCommonName: {
    ...Typography.sectionTitle,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultNotes: {
    ...Typography.body,
  },
  guardrailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  guardrailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  urgencyPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: BorderWidth.hairline,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionRowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
