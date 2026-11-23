import { useLocalSearchParams } from 'expo-router';
import { Sparkles, Sprout, Stethoscope } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiLimitModal } from '@/components/modals/ai-limit-modal';
import { HealthDiagnosisFlow } from '@/components/scan/health-diagnosis-flow';
import { IdentifyPlantFlow } from '@/components/scan/identify-plant-flow';
import { PhotoCaptureCard } from '@/components/scan/photo-capture-card';
import { MOTION_SPRINGS } from '@/components/ui/animated-wrappers';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import {
  BorderWidth,
  BottomTabInset,
  Fonts,
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
import { triggerLightHaptic } from '@/services/haptics';
import type { AiQuotaStatus } from '@/types/plant';

type ScanWorkflowMode = 'identify' | 'diagnose';

const MODE_OPTIONS: {
  key: ScanWorkflowMode;
  labelKey: string;
}[] = [
  { key: 'identify', labelKey: 'scan.modeIdentify' },
  { key: 'diagnose', labelKey: 'scan.modeDiagnose' },
];

export default function ScanScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{ mode?: string; plantId?: string }>();

  const [mode, setMode] = useState<ScanWorkflowMode>(
    params.mode === 'diagnose' ? 'diagnose' : 'identify'
  );
  const [segmentBarWidth, setSegmentBarWidth] = useState(0);
  const [imageUri, setImageUri] = useState('');
  const [imageDimensions, setImageDimensions] = useState('');
  const [photoRevision, setPhotoRevision] = useState(0);
  const [manualEntryRevision, setManualEntryRevision] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaStatus | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const segmentPad = Spacing.xs;
  const activeModeIndex = mode === 'diagnose' ? 1 : 0;
  const segmentSlotWidth =
    segmentBarWidth > 0 ? (segmentBarWidth - segmentPad * 2) / 2 : 0;
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (segmentSlotWidth <= 0) return;
    const targetX = segmentPad + activeModeIndex * segmentSlotWidth;
    if (reducedMotion) {
      indicatorX.value = targetX;
    } else {
      indicatorX.value = withSpring(targetX, MOTION_SPRINGS.pill);
    }
  }, [activeModeIndex, segmentSlotWidth, segmentPad, indicatorX, reducedMotion]);

  const activePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

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
                {t('scan.eyebrow')}
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
                    {t('scan.quotaLeft', {
                      remaining: aiQuota.remaining,
                      limit: aiQuota.limit,
                    })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text
              style={[
                styles.headerTitle,
                { color: palette.textPrimary, fontFamily: Fonts?.serif },
              ]}>
              {t('scan.title')}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
              {t('scan.subtitle')}
            </Text>
          </View>

          <View
            accessibilityRole="tablist"
            onLayout={(e) => setSegmentBarWidth(e.nativeEvent.layout.width)}
            style={[
              styles.segmentedBar,
              {
                backgroundColor: palette.bgSubtle,
                borderColor: palette.borderSubtle,
              },
            ]}>
            {segmentSlotWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeSegmentPill,
                  {
                    width: segmentSlotWidth,
                    backgroundColor: palette.primary,
                  },
                  activePillStyle,
                ]}
              />
            )}

            {MODE_OPTIONS.map((option) => {
              const isSelected = mode === option.key;
              const color = isSelected
                ? palette.textInverse
                : palette.textSecondary;

              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    if (!isSelected) {
                      triggerLightHaptic();
                      setMode(option.key);
                      setErrorMessage(null);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.segmentBtn,
                    pressed && !isSelected && styles.segmentBtnPressed,
                  ]}>
                  {option.key === 'identify' ? (
                    <Sprout size={16} color={color} />
                  ) : (
                    <Stethoscope size={16} color={color} />
                  )}
                  <Text style={[styles.segmentBtnText, { color }]}>
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FeedbackBanner message={errorMessage} variant="error" />

          {mode === 'identify' ? (
            <>
              <PhotoCaptureCard
                stepLabel="STEP 1 · SPECIMEN PHOTO"
                imageUri={imageUri}
                imageDimensions={imageDimensions}
                onImageSelected={handleImageSelected}
                onError={setErrorMessage}
              />
              <IdentifyPlantFlow
                imageUri={imageUri}
                photoRevision={photoRevision}
                manualEntryRevision={manualEntryRevision}
                aiQuota={aiQuota}
                onQuotaExceeded={handleQuotaExceeded}
                onError={setErrorMessage}
              />
            </>
          ) : (
            <HealthDiagnosisFlow
              imageUri={imageUri}
              imageDimensions={imageDimensions}
              onImageSelected={handleImageSelected}
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
    position: 'relative',
    flexDirection: 'row',
    padding: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.hairline,
  },
  activeSegmentPill: {
    position: 'absolute',
    left: 0,
    top: Spacing.xs,
    bottom: Spacing.xs,
    borderRadius: Radius.pill - 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill - 4,
  },
  segmentBtnPressed: {
    opacity: 0.72,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
