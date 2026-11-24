import { CalendarDays } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CareScheduleView } from '@/components/calendar/care-schedule-view';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import type { ProjectedPlantCareTask } from '@/services/calendarUtils';
import { confirmAction } from '@/services/dialogs';
import { triggerLightHaptic } from '@/services/haptics';
import {
  doesPlantNeedWatering,
  usePlantStore,
} from '@/store/usePlantStore';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const isSyncing = usePlantStore((s) => s.isSyncing);
  const syncWithSupabase = usePlantStore((s) => s.syncWithSupabase);
  const completeScheduledCareTask = usePlantStore(
    (s) => s.completeScheduledCareTask
  );
  const waterAllNeedingWater = usePlantStore((s) => s.waterAllNeedingWater);
  const undoWatering = usePlantStore((s) => s.undoWatering);

  const {
    message: feedbackMessage,
    action: feedbackAction,
    showToast,
    dismissToast,
  } = useToast();

  const handleCompleteTask = (task: ProjectedPlantCareTask) => {
    completeScheduledCareTask(task.plant.id, task.taskKind);
    if (task.taskKind === 'fertilize') {
      showToast(t('schedule.fertilizedToast', { name: task.plant.nickname }));
    } else if (task.taskKind === 'rotate') {
      showToast(t('schedule.rotatedToast', { name: task.plant.nickname }));
    } else {
      const undoSnapshot = usePlantStore.getState().lastWateringUndo;
      showToast(t('schedule.wateredToast', { name: task.plant.nickname }), {
        action: undoSnapshot
          ? {
              label: t('common.undo'),
              onPress: () => {
                undoWatering(undoSnapshot);
                showToast(
                  t('schedule.undoWateredToast', { name: task.plant.nickname })
                );
              },
            }
          : undefined,
      });
    }
  };

  const handleWaterAllDueToday = () => {
    const needsWaterCount = plants.filter((p) => doesPlantNeedWatering(p)).length;
    if (needsWaterCount === 0) return;

    confirmAction({
      title: t('schedule.waterAllTitle'),
      message: t('schedule.waterAllMessage', { count: needsWaterCount }),
      confirmLabel: t('schedule.waterAllConfirm'),
      onConfirm: () => {
        const count = waterAllNeedingWater();
        if (count > 0) {
          const undoSnapshot = usePlantStore.getState().lastWateringUndo;
          showToast(t('schedule.waterAllToast', { count }), {
            action: undoSnapshot
              ? {
                  label: t('common.undo'),
                  onPress: () => {
                    const restored = undoWatering(undoSnapshot);
                    showToast(
                      t('schedule.undoWaterAllToast', { count: restored })
                    );
                  },
                }
              : undefined,
          });
        }
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="schedule" />

      <FeedbackBanner
        floating
        message={feedbackMessage}
        action={feedbackAction}
        onDismiss={dismissToast}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => {
              triggerLightHaptic();
              void (async () => {
                await syncWithSupabase();
                const latestError = usePlantStore.getState().syncError;
                if (latestError) {
                  showToast(latestError);
                }
              })();
            }}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }>
        <View style={styles.maxContainer}>
          <ScreenHeader
            eyebrow={t('schedule.eyebrow')}
            title={t('schedule.title')}
            icon={<CalendarDays size={16} color={palette.primary} />}
          />

          <CareScheduleView
            plants={plants}
            entries={entries}
            onCompleteTask={handleCompleteTask}
            onWaterAllDueToday={handleWaterAllDueToday}
          />
        </View>
      </ScrollView>
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
});
