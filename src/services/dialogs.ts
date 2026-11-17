import { Alert, Platform } from 'react-native';

interface ConfirmActionOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * Displays a native confirmation Alert on iOS/Android or `window.confirm` on Web.
 */
export function confirmAction({
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: ConfirmActionOptions): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
