import { router } from 'expo-router';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  PlantEnvironmentFields,
  RoomPresetBar,
} from '@/components/forms/plant-environment-fields';
import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';
import {
  AnimatedEntrance,
  SpringPressable,
} from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { AiScanShimmerCard } from '@/components/ui/botanical-shimmer';
import { SucculentGuardrailBanner } from '@/components/ui/status-badges';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeCommonName } from '@/i18n/plantDisplay';
import { AiQuotaExceededError, identifyPlant } from '@/services/aiPlantService';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/services/haptics';
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
  const { t, i18n } = useTranslation();
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
    const manualName =
      searchQuery.trim() || t('scan.identify.customPlantFallback');
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
      onError(t('scan.identify.missingInputError'));
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
          err instanceof Error ? err.message : t('scan.identify.failedError')
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
    <View style={styles.flowRoot}>
      <View
        style={[
          styles.sectionDivider,
          { backgroundColor: palette.borderSubtle },
        ]}
      />

      <View style={styles.stepBlock}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          {t('scan.identify.step2')}
        </Text>

        <BotanicalInput
          surface="surface"
          compact={false}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('scan.identify.searchPlaceholder')}
          style={styles.textInput}
        />

        <SpringPressable
          onPress={() => {
            triggerLightHaptic();
            void handleRunIdentification();
          }}
          disabled={isLoading}
          accessibilityRole="button"
          style={[
            styles.primaryActionBtn,
            { backgroundColor: palette.primary },
            isLoading && { opacity: 0.78 },
          ]}>
          {isLoading ? (
            <ActivityIndicator color={palette.textInverse} size="small" />
          ) : (
            <Sparkles size={17} color={palette.textInverse} />
          )}
          <Text
            style={[
              styles.primaryActionBtnText,
              { color: palette.textInverse },
            ]}>
            {isLoading
              ? t('scan.identify.analyzing')
              : t('scan.identify.runButton')}
          </Text>
        </SpringPressable>
      </View>

      {isLoading && <AiScanShimmerCard mode="identify" />}

      {!isLoading && idResult && (
        <AnimatedEntrance style={styles.resultSection}>
          <SurfaceCard style={styles.resultCard}>
            <View style={styles.resultHeaderRow}>
              <View style={styles.flex}>
                <Text
                  style={[
                    styles.resultCommonName,
                    { color: palette.textPrimary },
                  ]}>
                  {localizeCommonName(idResult.commonName, i18n.language)}
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
                  {t('scan.identify.match', {
                    percent: Math.round(idResult.confidence * 100),
                  })}
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
              <Text
                style={[styles.careSpecLine, { color: palette.textPrimary }]}>
                <Text style={[styles.careSpecLabel, { color: palette.primary }]}>
                  {t('scan.identify.idealLight')}{' '}
                </Text>
                {idResult.baselineCare.idealLight}
              </Text>
              <Text
                style={[styles.careSpecLine, { color: palette.textPrimary }]}>
                <Text style={[styles.careSpecLabel, { color: palette.primary }]}>
                  {t('scan.identify.baseWatering')}{' '}
                </Text>
                {t('scan.identify.everyDays', {
                  days: idResult.baselineCare.baseWateringDays,
                })}
              </Text>
              <Text
                style={[styles.careSpecLine, { color: palette.textPrimary }]}>
                <Text style={[styles.careSpecLabel, { color: palette.primary }]}>
                  {t('scan.identify.substrate')}{' '}
                </Text>
                {idResult.baselineCare.soilRecommendation}
              </Text>
            </SurfaceCard>

            {idResult.baselineCare.succulentGuardrails.isSucculentOrCactus && (
              <SucculentGuardrailBanner
                message={idResult.baselineCare.succulentGuardrails.rotWarningNote}
              />
            )}
          </SurfaceCard>

          <View
            style={[
              styles.sectionDivider,
              { backgroundColor: palette.borderSubtle },
            ]}
          />

          <View style={styles.stepBlock}>
            <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
              {t('scan.identify.step3')}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                {t('editPlant.nickname')}
              </Text>
              <BotanicalInput
                surface="surface"
                compact={false}
                value={form.nickname}
                onChangeText={(val) => updateForm('nickname', val)}
                placeholder={t('editPlant.nicknamePlaceholder')}
                style={styles.textInput}
              />
            </View>

            <RoomPresetBar
              label={t('editPlant.location')}
              labelSize="md"
              chipGap={Spacing.sm}
              location={form.location}
              lightExposure={form.lightExposure}
              isIndoor={form.isIndoor}
              onApplyPreset={(preset) => {
                setForm((prev) => ({
                  ...prev,
                  location: preset.name,
                  lightExposure: preset.lightExposure,
                  isIndoor: preset.isIndoor,
                }));
              }}>
              <BotanicalInput
                surface="surface"
                compact={false}
                value={form.location}
                onChangeText={(val) => updateForm('location', val)}
                placeholder={t('editPlant.locationPlaceholder')}
                style={styles.textInput}
              />
            </RoomPresetBar>

            <PlantEnvironmentFields
              lightExposure={form.lightExposure}
              onChangeLightExposure={(val) => updateForm('lightExposure', val)}
              potMaterial={form.potMaterial}
              onChangePotMaterial={(val) => updateForm('potMaterial', val)}
              isIndoor={form.isIndoor}
              onChangeIsIndoor={(val) => updateForm('isIndoor', val)}
              hasDrainageHole={form.hasDrainageHole}
              onChangeHasDrainageHole={(val) =>
                updateForm('hasDrainageHole', val)
              }
              maxPotOptions={4}
              chipSize="md"
              chipGap={Spacing.sm}
              labelSize="md"
              switchContained={false}
              indoorBeforePot
              drainageDescription={t('scan.identify.drainageDesc')}
            />

            <SpringPressable
              onPress={() => {
                triggerLightHaptic();
                handleSaveIdentifiedPlant();
              }}
              accessibilityRole="button"
              style={[
                styles.terracottaBtn,
                { backgroundColor: palette.accentTerracotta },
              ]}>
              <CheckCircle2 size={17} color={palette.textInverse} />
              <Text
                style={[
                  styles.primaryActionBtnText,
                  { color: palette.textInverse },
                ]}>
                {t('scan.identify.saveButton')}
              </Text>
            </SpringPressable>
          </View>
        </AnimatedEntrance>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flowRoot: {
    gap: Spacing.lg,
  },
  sectionDivider: {
    height: BorderWidth.hairline,
  },
  stepBlock: {
    gap: Spacing.md,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  flex: {
    flex: 1,
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
  resultSection: {
    gap: Spacing.lg,
  },
  resultCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
