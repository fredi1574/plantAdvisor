import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function triggerLightHaptic(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Ignore on unsupported devices
  });
}

export function triggerSelectionHaptic(): void {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => {
    // Ignore on unsupported devices
  });
}

export function triggerSuccessHaptic(): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success
  ).catch(() => {
    // Ignore on unsupported devices
  });
}
