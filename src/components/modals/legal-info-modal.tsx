import { FileText, ShieldCheck, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

export type LegalDocumentType = 'privacy' | 'terms';

interface LegalInfoModalProps {
  visible: boolean;
  document: LegalDocumentType;
  onClose: () => void;
}

interface LegalDocContent {
  title: string;
  updatedAt: string;
  sections: { heading: string; body: string }[];
}

/**
 * In-app Privacy Policy and Terms of Service reader modal for store compliance.
 */
export function LegalInfoModal({
  visible,
  document,
  onClose,
}: LegalInfoModalProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const content = t(`legal.${document}`, {
    returnObjects: true,
  }) as LegalDocContent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: palette.primarySoft },
                ]}>
                {document === 'privacy' ? (
                  <ShieldCheck size={17} color={palette.primary} />
                ) : (
                  <FileText size={17} color={palette.primary} />
                )}
              </View>
              <View>
                <Text
                  style={[
                    styles.title,
                    { color: palette.textPrimary, fontFamily: Fonts?.serif },
                  ]}>
                  {content.title}
                </Text>
                <Text style={[styles.updatedAt, { color: palette.textMuted }]}>
                  {content.updatedAt}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Close ${content.title}`}
              style={[styles.closeBtn, { backgroundColor: palette.bgSubtle }]}>
              <X size={16} color={palette.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {content.sections.map((section) => (
              <View key={section.heading} style={styles.sectionBlock}>
                <Text
                  style={[
                    styles.sectionHeading,
                    { color: palette.textPrimary },
                  ]}>
                  {section.heading}
                </Text>
                <Text
                  style={[
                    styles.sectionBody,
                    { color: palette.textSecondary },
                  ]}>
                  {section.body}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
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
    maxWidth: 440,
    maxHeight: '80%',
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
    gap: Spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.sectionTitle,
  },
  updatedAt: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionBlock: {
    gap: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionBody: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
