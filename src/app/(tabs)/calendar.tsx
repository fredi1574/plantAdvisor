import { CalendarDays } from 'lucide-react-native';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import { confirmAction } from '@/services/dialogs';
import {
  doesPlantNeedWatering,
  usePlantStore,
} from '@/store/usePlantStore';

export default function CalendarScreen() {
  const palette = usePalette();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const waterAllNeedingWater = usePlantStore((s) => s.waterAllNeedingWater);

  const { message: feedbackMessage, showToast } = useToast();

  const handleWaterAllDueToday = () => {
    const needsWaterCount = plants.filter(doesPlantNeedWatering).length;
    if (needsWaterCount === 0) return;

    confirmAction({
      title: 'Water All Plants',
      message: `Mark all ${needsWaterCount} ${
        needsWaterCount === 1 ? 'plant' : 'plants'
      } needing water as watered?`,
      confirmLabel: 'Mark Watered',
      onConfirm: () => {
        const count = waterAllNeedingWater();
        if (count > 0) {
          showToast(
            `All ${count} ${count === 1 ? 'plant' : 'plants'} marked as watered!`
          );
        }
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="schedule" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          <ScreenHeader
            eyebrow="BOTANICAL AGENDA & CARE HORIZON"
            title="Care Schedule"
            icon={<CalendarDays size={16} color={palette.primary} />}
          />

          <FeedbackBanner message={feedbackMessage} />

          <CareScheduleView
            plants={plants}
            entries={entries}
            onWaterPlantNow={(plantId, nickname) => {
              waterPlantNow(plantId);
              showToast(`Marked "${nickname}" as watered!`);
            }}
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
