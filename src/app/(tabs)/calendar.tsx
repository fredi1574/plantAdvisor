import { CalendarDays, CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CareScheduleView } from '@/components/care-schedule-view';
import {
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import {
  doesPlantNeedWatering,
  usePlantStore,
} from '@/store/usePlantStore';

export default function CalendarScreen() {
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
          `All ${count} ${count === 1 ? 'plant' : 'plants'} marked as watered! 🌿`
        );
      }
    };

    const confirmText = `Mark all ${needsWaterCount} ${needsWaterCount === 1 ? 'plant' : 'plants'
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.brandBadgeRow}>
              <CalendarDays size={18} color={Palette.primary} />
              <Text style={styles.brandEyebrow}>
                BOTANICAL AGENDA & CARE HORIZON
              </Text>
            </View>
            <Text style={styles.headerTitle}>Care Schedule</Text>
          </View>

          {feedbackMessage && (
            <View style={styles.feedbackBanner}>
              <CheckCircle2 size={16} color="#15803D" />
              <Text style={styles.feedbackBannerText}>{feedbackMessage}</Text>
            </View>
          )}

          <CareScheduleView
            plants={plants}
            entries={entries}
            onWaterPlantNow={(plantId, nickname) => {
              waterPlantNow(plantId);
              showToast(`Marked "${nickname}" as watered! 💧`);
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
    backgroundColor: Palette.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl * 1.5,
    alignItems: 'center',
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
  },
  headerBlock: {
    gap: 2,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Palette.primary,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
});

