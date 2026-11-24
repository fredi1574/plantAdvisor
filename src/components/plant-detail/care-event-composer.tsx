import { Image } from 'expo-image';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  CareMetricsFields,
  EMPTY_CARE_METRICS_DRAFT,
  parseCareMetricsDraft,
  type CareMetricsDraft,
} from '@/components/modals/care-metrics-fields';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { CareEventIcon } from '@/components/ui/status-badges';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Spacing, type ThemePalette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import { pickPlantImage } from '@/services/imagePicker';
import { usePlantStore } from '@/store/usePlantStore';
import type { CareEventType, UserPlant } from '@/types/plant';

const getQuickActions = (
  palette: ThemePalette,
  t: (key: string) => string
): {
  type: CareEventType;
  label: string;
  defaultTitle: string;
  defaultNotes: string;
  color: string;
}[] => [
    {
      type: 'water',
      label: t('plantDetail.composer.actions.water.label'),
      defaultTitle: t('plantDetail.composer.actions.water.defaultTitle'),
      defaultNotes: t('plantDetail.composer.actions.water.defaultNotes'),
      color: palette.waterBlue,
    },
    {
      type: 'propagation',
      label: t('plantDetail.composer.actions.propagation.label'),
      defaultTitle: t('plantDetail.composer.actions.propagation.defaultTitle'),
      defaultNotes: t('plantDetail.composer.actions.propagation.defaultNotes'),
      color: palette.accentTerracotta,
    },
    {
      type: 'fertilize',
      label: t('plantDetail.composer.actions.fertilize.label'),
      defaultTitle: t('plantDetail.composer.actions.fertilize.defaultTitle'),
      defaultNotes: t('plantDetail.composer.actions.fertilize.defaultNotes'),
      color: palette.primary,
    },
    {
      type: 'prune',
      label: t('plantDetail.composer.actions.prune.label'),
      defaultTitle: t('plantDetail.composer.actions.prune.defaultTitle'),
      defaultNotes: t('plantDetail.composer.actions.prune.defaultNotes'),
      color: palette.primaryMuted,
    },
    {
      type: 'repot',
      label: t('plantDetail.composer.actions.repot.label'),
      defaultTitle: t('plantDetail.composer.actions.repot.defaultTitle'),
      defaultNotes: t('plantDetail.composer.actions.repot.defaultNotes'),
      color: palette.accentTerracotta,
    },
    {
      type: 'note',
      label: t('plantDetail.composer.actions.note.label'),
      defaultTitle: t('plantDetail.composer.actions.note.defaultTitle'),
      defaultNotes: t('plantDetail.composer.actions.note.defaultNotes'),
      color: palette.textSecondary,
    },
  ];

interface CareEventComposerProps {
  plant: UserPlant;
  onShowToast: (message: string) => void;
}

/**
 * Quick-action care event composer with collapsible photo attachment and growth metrics drawer.
 */
export function CareEventComposer({
  plant,
  onShowToast,
}: CareEventComposerProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const quickActions = useMemo(
    () => getQuickActions(palette, t),
    [palette, t]
  );

  const logCareEvent = usePlantStore((s) => s.logCareEvent);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);

  const [selectedQuickType, setSelectedQuickType] =
    useState<CareEventType>('water');
  const [showDetailedLog, setShowDetailedLog] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [metricsDraft, setMetricsDraft] = useState<CareMetricsDraft>(
    EMPTY_CARE_METRICS_DRAFT
  );

  const handlePickLogPhoto = async (source: 'camera' | 'library') => {
    const result = await pickPlantImage(source, { quality: 0.75 });
    if (result.ok) {
      setPhotoUri(result.uri);
    } else if (result.reason !== 'canceled' && result.message) {
      onShowToast(result.message);
    }
  };

  const handleQuickLog = (actionType: CareEventType) => {
    setSelectedQuickType(actionType);
    triggerLightHaptic();

    const metrics = parseCareMetricsDraft(metricsDraft, true);

    if (
      actionType === 'water' &&
      !customNote.trim() &&
      !photoUri &&
      !metrics
    ) {
      waterPlantNow(plant.id);
      return;
    }

    const template =
      quickActions.find((a) => a.type === actionType) ?? quickActions[0];

    logCareEvent({
      plantId: plant.id,
      eventType: actionType,
      title: template.defaultTitle,
      notes: customNote.trim() || template.defaultNotes,
      photoUri,
      metrics,
    });

    setCustomNote('');
    setPhotoUri(undefined);
    setMetricsDraft(EMPTY_CARE_METRICS_DRAFT);
    onShowToast(
      t('plantDetail.composer.loggedToast', {
        action: template.label,
        name: plant.nickname,
      })
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text
          style={[styles.sectionHeaderTitle, { color: palette.textPrimary }]}>
          {t('plantDetail.composer.title')}
        </Text>
        <Chip
          label={
            showDetailedLog
              ? t('plantDetail.composer.hideDetails')
              : t('plantDetail.composer.photoAndMetrics')
          }
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
        value={customNote}
        onChangeText={setCustomNote}
        placeholder={t('plantDetail.composer.notePlaceholder')}
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
                {t('editPlant.camera')}
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
                {t('editPlant.library')}
              </Text>
            </Pressable>
          </View>

          {Boolean(photoUri) && (
            <View style={styles.photoPreviewRow}>
              <Image
                source={{ uri: photoUri }}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <Chip
                label={t('plantDetail.composer.removePhoto')}
                icon={<X size={12} color={palette.textSecondary} />}
                onPress={() => setPhotoUri(undefined)}
              />
            </View>
          )}

          <CareMetricsFields
            value={metricsDraft}
            onChange={setMetricsDraft}
            compact
            showFieldLabels={false}
          />
        </SurfaceCard>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}>
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
                <CareEventIcon eventType={qa.type} size={15} color={qa.color} />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
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
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.half,
  },
});
