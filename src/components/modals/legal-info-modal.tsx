import { FileText, ShieldCheck, X } from 'lucide-react-native';
import React from 'react';
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

const LEGAL_CONTENT: Record<
  LegalDocumentType,
  {
    title: string;
    updatedAt: string;
    sections: { heading: string; body: string }[];
  }
> = {
  privacy: {
    title: 'Privacy Policy',
    updatedAt: 'Last updated: November 2026',
    sections: [
      {
        heading: '1. Data We Collect',
        body: 'FloraLog stores the plant profiles, care logs, room presets, and photos you choose to add. If you sign in, your email address and display name are stored in Supabase Auth to sync your garden across devices.',
      },
      {
        heading: '2. Camera, Photos & AI Scans',
        body: 'Camera and photo library permissions are used solely when you attach specimen photos or run an AI Plant Identification / Health Scan. Photos submitted for AI scans are sent securely to our Supabase Edge Function for analysis and are not sold or shared with third-party advertisers.',
      },
      {
        heading: '3. On-Device Notifications',
        body: 'Watering reminders and daily garden digests are scheduled 100% locally on your device using Expo Notifications. No push tracking tokens are collected.',
      },
      {
        heading: '4. Account & Data Deletion',
        body: 'You can permanently delete your account, cloud garden records, and uploaded photos at any time directly inside the app via Profile → Data & Account → Delete Account.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updatedAt: 'Last updated: November 2026',
    sections: [
      {
        heading: '1. Botanical Guidance Disclaimer',
        body: 'FloraLog provides AI-assisted plant identification, health observations, and care schedules for informational purposes. Always verify pet toxicity and urgent plant-care decisions with a qualified veterinarian or horticulturist.',
      },
      {
        heading: '2. Your Content',
        body: 'You retain full ownership of all photos, notes, and plant records you upload to FloraLog. You may edit or permanently delete your content at any time.',
      },
      {
        heading: '3. Fair Use of AI Scans',
        body: 'Daily AI scan quotas help keep the service fast and reliable for all gardeners. Automated scraping or abusive traffic against the AI endpoints is prohibited.',
      },
    ],
  },
};

/**
 * In-app Privacy Policy and Terms of Service reader modal for store compliance.
 */
export function LegalInfoModal({
  visible,
  document,
  onClose,
}: LegalInfoModalProps) {
  const palette = usePalette();
  const content = LEGAL_CONTENT[document];

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
