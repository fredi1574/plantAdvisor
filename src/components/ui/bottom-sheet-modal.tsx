import { CheckCircle2, Trash2, X } from 'lucide-react-native';
import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BorderWidth,
  CardShadow,
  MaxContentWidth,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface BottomSheetModalProps {
  visible: boolean;
  eyebrow: string;
  title: string;
  headerIcon: ReactNode;
  saveLabel: string;
  closeAccessibilityLabel?: string;
  deleteAccessibilityLabel?: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  children: ReactNode;
}

/**
 * Reusable themed bottom-sheet form modal with backdrop dismiss, header,
 * scrollable body, and standardized Cancel / Save / optional Delete footer.
 */
export function BottomSheetModal({
  visible,
  eyebrow,
  title,
  headerIcon,
  saveLabel,
  closeAccessibilityLabel = 'Close modal',
  deleteAccessibilityLabel = 'Delete item',
  onClose,
  onSave,
  onDelete,
  children,
}: BottomSheetModalProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View
            style={[
              styles.sheetHeader,
              {
                borderBottomColor: palette.bgSubtle,
                backgroundColor: palette.bgPrimary,
              },
            ]}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.headerIconPill,
                  { backgroundColor: palette.primarySoft },
                ]}>
                {headerIcon}
              </View>
              <View>
                <Text style={[styles.sheetEyebrow, { color: palette.primary }]}>
                  {eyebrow}
                </Text>
                <Text
                  style={[styles.sheetTitle, { color: palette.textPrimary }]}>
                  {title}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeIconBtn,
                { backgroundColor: palette.bgSubtle },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={closeAccessibilityLabel}>
              <X size={20} color={palette.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          <View
            style={[
              styles.sheetFooter,
              {
                borderTopColor: palette.bgSubtle,
                backgroundColor: palette.bgPrimary,
                paddingBottom: Math.max(Spacing.md, insets.bottom),
              },
            ]}>
            {onDelete && (
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => [
                  styles.deleteOutlineBtn,
                  {
                    backgroundColor: palette.criticalBg,
                    borderColor: palette.criticalBorder,
                  },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={deleteAccessibilityLabel}>
                <Trash2 size={16} color={palette.criticalText} />
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
                pressed && { opacity: 0.75 },
              ]}>
              <Text
                style={[styles.cancelBtnText, { color: palette.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={saveLabel}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: palette.primary },
                pressed && { opacity: 0.85 },
              ]}>
              <CheckCircle2 size={16} color={palette.textInverse} />
              <Text
                style={[styles.saveBtnText, { color: palette.textInverse }]}>
                {saveLabel}
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '90%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    overflow: 'hidden',
    ...CardShadow,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: BorderWidth.hairline,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    maxHeight: 500,
  },
  formContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: BorderWidth.hairline,
  },
  deleteOutlineBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 'auto',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
