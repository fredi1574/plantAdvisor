import { AlertTriangle, Trash2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface DeleteAccountModalProps {
  visible: boolean;
  email?: string;
  onClose: () => void;
  onConfirmDelete: () => Promise<{ ok: boolean; error?: string }>;
}

const CONFIRM_KEYWORD = 'DELETE';

/**
 * Confirmed self-service account deletion dialog (Apple App Store & Google Play compliant).
 * Requires typing "DELETE" before permanently removing the account and all cloud/local data.
 */
export function DeleteAccountModal({
  visible,
  email,
  onClose,
  onConfirmDelete,
}: DeleteAccountModalProps) {
  const palette = usePalette();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_KEYWORD;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      const res = await onConfirmDelete();
      if (!res.ok) {
        setErrorMessage(
          res.error || 'Could not delete your account. Please try again.'
        );
        return;
      }
      setConfirmText('');
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.criticalBorder,
            },
          ]}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: palette.criticalBg,
                  borderColor: palette.criticalBorder,
                },
              ]}>
              <AlertTriangle size={18} color={palette.criticalText} />
            </View>
            <Pressable
              onPress={handleClose}
              disabled={isDeleting}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close delete account dialog"
              style={[styles.closeBtn, { backgroundColor: palette.bgSubtle }]}>
              <X size={16} color={palette.textSecondary} />
            </Pressable>
          </View>

          <Text
            style={[
              styles.title,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            Delete Account Permanently?
          </Text>

          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            This will permanently erase{' '}
            {email ? (
              <Text style={[styles.boldText, { color: palette.textPrimary }]}>
                {email}
              </Text>
            ) : (
              'your account'
            )}
            , including all saved plants, chronological care logs, AI health
            scans, and uploaded photos. This action cannot be undone.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              Type{' '}
              <Text style={{ color: palette.criticalText }}>
                {CONFIRM_KEYWORD}
              </Text>{' '}
              to confirm
            </Text>
            <BotanicalInput
              surface="primary"
              compact={false}
              value={confirmText}
              onChangeText={(val) => {
                setConfirmText(val);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isDeleting}
              placeholder={CONFIRM_KEYWORD}
              accessibilityLabel="Type DELETE to confirm account deletion"
              style={styles.input}
            />
          </View>

          <FeedbackBanner message={errorMessage} variant="error" />

          <View style={styles.actionsCol}>
            <SpringPressable
              onPress={() => void handleDelete()}
              disabled={!isConfirmed || isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Permanently Delete Account"
              accessibilityState={{ disabled: !isConfirmed || isDeleting }}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: palette.criticalDot,
                  opacity: !isConfirmed || isDeleting ? 0.45 : 1,
                },
              ]}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Trash2 size={15} color="#FFFFFF" />
              )}
              <Text style={styles.deleteBtnText}>
                {isDeleting
                  ? 'Deleting Account...'
                  : 'Permanently Delete Account'}
              </Text>
            </SpringPressable>

            <Pressable
              onPress={handleClose}
              disabled={isDeleting}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <Text
                style={[styles.cancelBtnText, { color: palette.textPrimary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.sectionTitle,
  },
  subtitle: {
    ...Typography.body,
    lineHeight: 21,
  },
  boldText: {
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    letterSpacing: 1,
  },
  actionsCol: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
