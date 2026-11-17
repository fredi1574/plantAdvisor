import { useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  Sparkles,
  Sprout,
  Stethoscope,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiLimitModal } from '@/components/modals/ai-limit-modal';
import { HealthDiagnosisFlow } from '@/components/scan/health-diagnosis-flow';
import { IdentifyPlantFlow } from '@/components/scan/identify-plant-flow';
import { PhotoCaptureCard } from '@/components/scan/photo-capture-card';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import {
  BorderWidth,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  fetchAiQuotaStatus,
  subscribeToAiQuota,
} from '@/services/aiPlantService';
import type { AiQuotaStatus } from '@/types/plant';

type ScanWorkflowMode = 'identify' | 'diagnose';

export default function ScanScreen() {
  const palette = usePalette();
  const params = useLocalSearchParams<{ mode?: string; plantId?: string }>();

  const [mode, setMode] = useState<ScanWorkflowMode>(
    params.mode === 'diagnose' ? 'diagnose' : 'identify'
  );
  const [imageUri, setImageUri] = useState('');
  const [imageDimensions, setImageDimensions] = useState('');
  const [photoRevision, setPhotoRevision] = useState(0);
  const [manualEntryRevision, setManualEntryRevision] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaStatus | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAiQuota(setAiQuota);
    void fetchAiQuotaStatus();
    return unsubscribe;
  }, []);

  const [prevParams, setPrevParams] = useState({
    mode: params.mode,
    plantId: params.plantId,
  });
  if (
    params.mode !== prevParams.mode ||
    params.plantId !== prevParams.plantId
  ) {
    setPrevParams({ mode: params.mode, plantId: params.plantId });
    if (params.mode === 'diagnose') {
      setMode('diagnose');
    }
  }

  const handleImageSelected = (uri: string, dimensions: string) => {
    setImageUri(uri);
    setImageDimensions(dimensions);
    setPhotoRevision((n) => n + 1);
  };

  const handleQuotaExceeded = (quota?: AiQuotaStatus) => {
    if (quota) {
      setAiQuota(quota);
    }
    setShowLimitModal(true);
  };

  const handleStartManualEntry = () => {
    setMode('identify');
    setErrorMessage(null);
    setManualEntryRevision((n) => n + 1);
  };

  const quotaColors =
    aiQuota?.remaining === 0
      ? {
          bg: palette.criticalBg,
          border: palette.criticalBorder,
          text: palette.criticalText,
        }
      : (aiQuota?.remaining ?? 2) <= 1
        ? {
            bg: palette.attentionBg,
            border: palette.attentionBorder,
            text: palette.attentionText,
          }
        : {
            bg: palette.primarySoft,
            border: palette.primaryBorder,
            text: palette.primary,
          };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="scan" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          <View style={styles.headerBlock}>
            <View style={styles.eyebrowRow}>
              <Text style={[styles.eyebrow, { color: palette.primary }]}>
                AI BOTANIST & SCANNER
              </Text>
              {aiQuota ? (
                <Pressable
                  onPress={() => {
                    if (aiQuota.remaining <= 0) setShowLimitModal(true);
                  }}
                  style={[
                    styles.quotaPill,
                    {
                      backgroundColor: quotaColors.bg,
                      borderColor: quotaColors.border,
                    },
                  ]}>
                  <Sparkles size={11} color={quotaColors.text} />
                  <Text
                    style={[styles.quotaPillText, { color: quotaColors.text }]}>
                    {aiQuota.remaining} / {aiQuota.limit} free AI scans left
                    today
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
              Add or Scan Plant
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
              Identify a new plant or run a context-aware AI Health Scan
              combining leaf photos with your care timeline.
            </Text>
          </View>

          <View
            style={[
              styles.segmentedBar,
              {
                backgroundColor: palette.bgSubtle,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <Pressable
              onPress={() => {
                setMode('identify');
                setErrorMessage(null);
              }}
              style={[
                styles.segmentBtn,
                mode === 'identify' && { backgroundColor: palette.primary },
              ]}>
              <Sprout
                size={16}
                color={
                  mode === 'identify'
                    ? palette.textInverse
                    : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  {
                    color:
                      mode === 'identify'
                        ? palette.textInverse
                        : palette.textSecondary,
                  },
                ]}>
                1. Identify & Add Plant
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode('diagnose');
                setErrorMessage(null);
              }}
              style={[
                styles.segmentBtn,
                mode === 'diagnose' && { backgroundColor: palette.primary },
              ]}>
              <Stethoscope
                size={16}
                color={
                  mode === 'diagnose'
                    ? palette.textInverse
                    : palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  {
                    color:
                      mode === 'diagnose'
                        ? palette.textInverse
                        : palette.textSecondary,
                  },
                ]}>
                2. AI Health Scan
              </Text>
            </Pressable>
          </View>

          <PhotoCaptureCard
            imageUri={imageUri}
            imageDimensions={imageDimensions}
            onImageSelected={handleImageSelected}
            onError={setErrorMessage}
          />

          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: palette.criticalBg,
                  borderColor: palette.criticalBorder,
                },
              ]}>
              <AlertCircle size={16} color={palette.criticalText} />
              <Text
                style={[
                  styles.errorBannerText,
                  { color: palette.criticalText },
                ]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {mode === 'identify' ? (
            <IdentifyPlantFlow
              imageUri={imageUri}
              photoRevision={photoRevision}
              manualEntryRevision={manualEntryRevision}
              aiQuota={aiQuota}
              onQuotaExceeded={handleQuotaExceeded}
              onError={setErrorMessage}
            />
          ) : (
            <HealthDiagnosisFlow
              imageUri={imageUri}
              initialPlantId={params.plantId}
              aiQuota={aiQuota}
              onQuotaExceeded={handleQuotaExceeded}
              onError={setErrorMessage}
            />
          )}
        </View>
      </ScrollView>

      <AiLimitModal
        visible={showLimitModal}
        quota={aiQuota}
        onClose={() => setShowLimitModal(false)}
        onAddManual={handleStartManualEntry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BottomTabInset + Spacing.xl,
    alignItems: 'center',
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
  },
  headerBlock: {
    gap: Spacing.xs,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...Typography.eyebrow,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.body,
  },
  segmentedBar: {
    flexDirection: 'row',
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
  },
  quotaPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
