import { router } from 'expo-router';
import { CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  LIGHT_EXPOSURE_OPTIONS,
  POT_MATERIAL_OPTIONS,
} from '@/constants/plantOptions';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { AiQuotaExceededError, identifyPlant } from '@/services/aiPlantService';
import { triggerSuccessHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  AiQuotaStatus,
  LightExposure,
  PlantIdentificationResult,
  PotMaterial,
} from '@/types/plant';

const DEFAULT_FALLBACK_PHOTO_URI =
  'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=80';

interface IdentifyFormState {
  nickname: string;
  location: string;
  hasDrainageHole: boolean;
  potMaterial: PotMaterial;
  lightExposure: LightExposure;
  isIndoor: boolean;
}

const INITIAL_FORM: IdentifyFormState = {
  nickname: '',
  location: 'South Living Room Sill',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lightExposure: 'bright_direct',
  isIndoor: true,
};

function buildManualIdentification(name: string): PlantIdentificationResult {
  return {
    commonName: name,
    scientificName: 'Custom Species',
    family: 'Botanical Specimen',
    plantType: 'foliage',
    confidence: 1,
    identificationNotes:
      'Added manually without AI identification. You can adjust watering and species details anytime.',
    baselineCare: {
      idealLight: 'Bright indirect light',
      baseWateringDays: 7,
      soilRecommendation: 'Well-draining indoor potting mix',
      succulentGuardrails: {
        isSucculentOrCactus: false,
        neverMistFoliage: false,
        soakAndDryRequired: false,
        minimumDryBackDays: 4,
        rotWarningNote: 'Check top 2 inches of soil before watering.',
      },
    },
  };
}

interface IdentifyPlantFlowProps {
  imageUri: string;
  photoRevision: number;
  manualEntryRevision: number;
  aiQuota: AiQuotaStatus | null;
  onQuotaExceeded: (quota?: AiQuotaStatus) => void;
  onError: (message: string | null) => void;
}

/**
 * Step 2 & 3 identification and add-to-garden form workflow.
 */
export function IdentifyPlantFlow({
  imageUri,
  photoRevision,
  manualEntryRevision,
  aiQuota,
  onQuotaExceeded,
  onError,
}: IdentifyPlantFlowProps) {
  const palette = usePalette();
  const addPlant = usePlantStore((s) => s.addPlant);

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [idResult, setIdResult] = useState<PlantIdentificationResult | null>(
    null
  );
  const [form, setForm] = useState<IdentifyFormState>(INITIAL_FORM);

  const [prevPhotoRevision, setPrevPhotoRevision] = useState(photoRevision);
  if (photoRevision !== prevPhotoRevision) {
    setPrevPhotoRevision(photoRevision);
    setSearchQuery('');
    setIdResult(null);
  }

  const [prevManualRevision, setPrevManualRevision] =
    useState(manualEntryRevision);
  if (manualEntryRevision !== prevManualRevision) {
    setPrevManualRevision(manualEntryRevision);
    const manualName = searchQuery.trim() || 'Custom Plant';
    setForm((prev) => ({ ...prev, nickname: manualName }));
    setIdResult(buildManualIdentification(manualName));
  }

  const updateForm = <K extends keyof IdentifyFormState>(
    key: K,
    value: IdentifyFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRunIdentification = async () => {
    if (!imageUri && !searchQuery.trim()) {
      onError('Please enter a plant name or select/capture a photo first.');
      return;
    }
    if (aiQuota && aiQuota.remaining <= 0) {
      onQuotaExceeded();
      return;
    }

    onError(null);
    setIsLoading(true);
    try {
      const result = await identifyPlant(imageUri || searchQuery, searchQuery);
      setIdResult(result);
      updateForm('nickname', result.commonName);
      triggerSuccessHaptic();
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        onQuotaExceeded(err.quota);
      } else {
        onError(
          err instanceof Error ? err.message : 'Failed to identify plant.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIdentifiedPlant = () => {
    if (!idResult) return;
    const created = addPlant({
      nickname: form.nickname || idResult.commonName,
      location: form.location,
      isIndoor: form.isIndoor,
      lightExposure: form.lightExposure,
      hasDrainageHole: form.hasDrainageHole,
      potMaterial: form.potMaterial,
      photoUri: imageUri || DEFAULT_FALLBACK_PHOTO_URI,
      identification: idResult,
    });

    setIdResult(null);
    router.push({
      pathname: '/plant/[id]',
      params: { id: created.id },
    });
  };

  return (
    <SurfaceCard>
      <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
        Step 2 — Botanical Name or Visual Clues
      </Text>

      <BotanicalInput
        surface="primary"
        compact={false}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="e.g., Crassula ovata, Jade Plant, Avocado seed, Monstera..."
        style={styles.textInput}
      />

      <Pressable
        onPress={() => void handleRunIdentification()}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.primaryActionBtn,
          { backgroundColor: palette.primary },
          (pressed || isLoading) && { opacity: 0.85 },
        ]}>
        {isLoading ? (
          <ActivityIndicator color={palette.textInverse} size="small" />
        ) : (
          <Sparkles size={17} color={palette.textInverse} />
        )}
        <Text
          style={[styles.primaryActionBtnText, { color: palette.textInverse }]}>
          {isLoading ? 'Analyzing Specimen...' : 'Run AI Plant Identification'}
        </Text>
      </Pressable>

      {idResult && (
        <View
          style={[
            styles.resultContainer,
            { borderTopColor: palette.borderSubtle },
          ]}>
          <View style={styles.resultHeaderRow}>
            <View style={styles.flex}>
              <Text
                style={[
                  styles.resultCommonName,
                  { color: palette.textPrimary },
                ]}>
                {idResult.commonName}
              </Text>
              <Text
                style={[
                  styles.resultScientific,
                  { color: palette.textSecondary },
                ]}>
                {idResult.scientificName} • {idResult.family}
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor: palette.thrivingBg,
                  borderColor: palette.thrivingBorder,
                },
              ]}>
              <Text
                style={[
                  styles.confidenceText,
                  { color: palette.thrivingText },
                ]}>
                {Math.round(idResult.confidence * 100)}% Match
              </Text>
            </View>
          </View>

          <Text style={[styles.resultNotes, { color: palette.textSecondary }]}>
            {idResult.identificationNotes}
          </Text>

          {idResult.petSafety ? (
            <PetSafetyBadge petSafety={idResult.petSafety} showDetails />
          ) : null}

          <SurfaceCard variant="nested" style={styles.careSpecBox}>
            <Text style={[styles.careSpecLine, { color: palette.textPrimary }]}>
              <Text style={[styles.careSpecLabel, { color: palette.primary }]}>
                Ideal Light:{' '}
              </Text>
              {idResult.baselineCare.idealLight}
            </Text>
            <Text style={[styles.careSpecLine, { color: palette.textPrimary }]}>
              <Text style={[styles.careSpecLabel, { color: palette.primary }]}>
                Base Watering:{' '}
              </Text>
              Every {idResult.baselineCare.baseWateringDays} days
            </Text>
            <Text style={[styles.careSpecLine, { color: palette.textPrimary }]}>
              <Text style={[styles.careSpecLabel, { color: palette.primary }]}>
                Substrate:{' '}
              </Text>
              {idResult.baselineCare.soilRecommendation}
            </Text>
          </SurfaceCard>

          {idResult.baselineCare.succulentGuardrails.isSucculentOrCactus && (
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
                {idResult.baselineCare.succulentGuardrails.rotWarningNote}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.formDivider,
              { backgroundColor: palette.borderSubtle },
            ]}
          />
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
            Step 3 — Save Specimen to My Garden
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              Plant Nickname
            </Text>
            <BotanicalInput
              surface="primary"
              compact={false}
              value={form.nickname}
              onChangeText={(val) => updateForm('nickname', val)}
              placeholder="e.g., Sunny Window Jade"
              style={styles.textInput}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              Location in Home / Garden
            </Text>
            <BotanicalInput
              surface="primary"
              compact={false}
              value={form.location}
              onChangeText={(val) => updateForm('location', val)}
              placeholder="e.g., South Living Room Sill"
              style={styles.textInput}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              Light Exposure
            </Text>
            <View style={styles.presetRow}>
              {LIGHT_EXPOSURE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  variant="subtle"
                  size="md"
                  selected={form.lightExposure === opt.key}
                  selectedStyle="solid"
                  onPress={() => updateForm('lightExposure', opt.key)}
                />
              ))}
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                Indoor Specimen
              </Text>
              <Text
                style={[styles.switchSub, { color: palette.textSecondary }]}>
                Toggle off if grown outdoors on a patio or garden bed
              </Text>
            </View>
            <Switch
              value={form.isIndoor}
              onValueChange={(val) => updateForm('isIndoor', val)}
              trackColor={{
                false: palette.borderSubtle,
                true: palette.primary,
              }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              Pot / Vessel Material
            </Text>
            <View style={styles.presetRow}>
              {POT_MATERIAL_OPTIONS.slice(0, 4).map((pm) => (
                <Chip
                  key={pm.key}
                  label={pm.label}
                  variant="subtle"
                  size="md"
                  selected={form.potMaterial === pm.key}
                  selectedStyle="solid"
                  onPress={() => updateForm('potMaterial', pm.key)}
                />
              ))}
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                Container Has Bottom Drainage Hole
              </Text>
              <Text
                style={[styles.switchSub, { color: palette.textSecondary }]}>
                Critical for preventing anaerobic root rot in succulents
              </Text>
            </View>
            <Switch
              value={form.hasDrainageHole}
              onValueChange={(val) => updateForm('hasDrainageHole', val)}
              trackColor={{
                false: palette.borderSubtle,
                true: palette.primary,
              }}
            />
          </View>

          <Pressable
            onPress={handleSaveIdentifiedPlant}
            style={({ pressed }) => [
              styles.terracottaBtn,
              { backgroundColor: palette.accentTerracotta },
              pressed && { opacity: 0.85 },
            ]}>
            <CheckCircle2 size={17} color={palette.textInverse} />
            <Text
              style={[
                styles.primaryActionBtnText,
                { color: palette.textInverse },
              ]}>
              Add to My Garden & Open Notebook
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
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
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
  resultScientific: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  confidenceBadge: {
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  confidenceText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  resultNotes: {
    ...Typography.body,
  },
  careSpecBox: {
    gap: 6,
  },
  careSpecLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  careSpecLabel: {
    fontWeight: '700',
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
  formDivider: {
    height: BorderWidth.hairline,
    marginVertical: Spacing.xs,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  switchSub: {
    ...Typography.caption,
  },
});
