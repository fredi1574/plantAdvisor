import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotanicalBackground } from '@/components/botanical-background';
import { CareScheduleView } from '@/components/care-schedule-view';
import { FeedbackBanner } from '@/components/feedback-banner';
import { ScreenHeader } from '@/components/screen-header';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
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

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const handleWaterAllDueToday = () => {
    const needsWaterCount = plants.filter(doesPlantNeedWatering).length;
    if (needsWaterCount === 0) return;

    const performWatering = () => {
      const count = waterAllNeedingWater();
      if (count > 0) {
        showToast(
          `All ${count} ${count === 1 ? 'plant' : 'plants'} marked as watered!`
        );
      }
    };

    const confirmText = `Mark all ${needsWaterCount} ${
      needsWaterCount === 1 ? 'plant' : 'plants'
    } needing water as watered?`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmText)) {
        performWatering();
      }
    } else {
      Alert.alert('Water All Plants', confirmText, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Watered', style: 'default', onPress: performWatering },
      ]);
    }
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
