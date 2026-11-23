import { router } from 'expo-router';
import {
  ChevronRight,
  FileText,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Trash2,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountModal } from '@/components/modals/delete-account-modal';
import {
  LegalInfoModal,
  type LegalDocumentType,
} from '@/components/modals/legal-info-modal';
import { AppearanceCard } from '@/components/profile/appearance-card';
import { GuestCloudCard } from '@/components/profile/guest-cloud-card';
import { NotificationsCard } from '@/components/profile/notifications-card';
import { ProfileOverviewCard } from '@/components/profile/profile-overview-card';
import { RoomPresetsSection } from '@/components/profile/room-presets-section';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  BorderWidth,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/services/dialogs';
import { triggerSuccessHaptic } from '@/services/haptics';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlantStore } from '@/store/usePlantStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const plantCount = usePlantStore((s) => s.plants.length);
  const entryCount = usePlantStore((s) => s.entries.length);
  const resetToSeedData = usePlantStore((s) => s.resetToSeedData);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocumentType | null>(null);
  const { message: toast, showToast } = useToast(3200);

  const handleSignOut = () => {
    confirmAction({
      title: t('profile.dataAndAccount.signOut'),
      message: t('profile.dataAndAccount.signOutMessage'),
      confirmLabel: t('profile.dataAndAccount.signOut'),
      destructive: true,
      onConfirm: async () => {
        await signOut();
        router.replace('/auth');
      },
    });
  };

  const handleResetToSampleGarden = () => {
    confirmAction({
      title: t('profile.dataAndAccount.resetTitle'),
      message: t('profile.dataAndAccount.resetMessage'),
      confirmLabel: t('profile.dataAndAccount.resetConfirm'),
      destructive: true,
      onConfirm: () => {
        resetToSeedData();
        triggerSuccessHaptic();
        showToast(t('profile.dataAndAccount.resetToast'));
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="account" />

      <FeedbackBanner floating message={toast} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          <ScreenHeader
            eyebrow={t('profile.eyebrow')}
            title={t('profile.title')}
            icon={<Sprout size={16} color={palette.primary} />}
          />

          {!user ? (
            <GuestCloudCard plantCount={plantCount} entryCount={entryCount} />
          ) : (
            <ProfileOverviewCard
              user={user}
              profile={profile}
              onShowToast={showToast}
            />
          )}

          <AppearanceCard onShowToast={showToast} />
          <NotificationsCard onShowToast={showToast} />
          <RoomPresetsSection onShowToast={showToast} />

          <View style={styles.section}>
            <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
              {t('profile.dataAndAccount.eyebrow')}
            </Text>

            <View
              style={[
                styles.groupedBox,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <Pressable
                onPress={() => setLegalDoc('privacy')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.dataAndAccount.privacyPolicy')}
                style={({ pressed }) => [
                  styles.settingsRow,
                  pressed && { backgroundColor: palette.bgSubtle },
                ]}>
                <View style={styles.settingsRowLeft}>
                  <ShieldCheck size={16} color={palette.primary} />
                  <Text
                    style={[
                      styles.settingsRowTitle,
                      { color: palette.textPrimary },
                    ]}>
                    {t('profile.dataAndAccount.privacyPolicy')}
                  </Text>
                </View>
                <ChevronRight size={15} color={palette.textMuted} />
              </Pressable>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: palette.borderSubtle },
                ]}
              />

              <Pressable
                onPress={() => setLegalDoc('terms')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.dataAndAccount.termsOfService')}
                style={({ pressed }) => [
                  styles.settingsRow,
                  pressed && { backgroundColor: palette.bgSubtle },
                ]}>
                <View style={styles.settingsRowLeft}>
                  <FileText size={16} color={palette.primary} />
                  <Text
                    style={[
                      styles.settingsRowTitle,
                      { color: palette.textPrimary },
                    ]}>
                    {t('profile.dataAndAccount.termsOfService')}
                  </Text>
                </View>
                <ChevronRight size={15} color={palette.textMuted} />
              </Pressable>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: palette.borderSubtle },
                ]}
              />

              <Pressable
                onPress={handleResetToSampleGarden}
                accessibilityRole="button"
                accessibilityLabel={t('profile.dataAndAccount.resetTitle')}
                style={({ pressed }) => [
                  styles.settingsRow,
                  pressed && { backgroundColor: palette.bgSubtle },
                ]}>
                <View style={styles.settingsRowLeft}>
                  <RotateCcw size={16} color={palette.primary} />
                  <View style={styles.settingsRowTextCol}>
                    <Text
                      style={[
                        styles.settingsRowTitle,
                        { color: palette.textPrimary },
                      ]}>
                      {t('profile.dataAndAccount.resetTitle')}
                    </Text>
                    <Text
                      style={[
                        styles.settingsRowSub,
                        { color: palette.textSecondary },
                      ]}>
                      {t('profile.dataAndAccount.resetSubtitle')}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={15} color={palette.textMuted} />
              </Pressable>

              {user && (
                <>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: palette.borderSubtle },
                    ]}
                  />
                  <Pressable
                    onPress={handleSignOut}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.dataAndAccount.signOut')}
                    style={({ pressed }) => [
                      styles.settingsRow,
                      pressed && { backgroundColor: palette.bgSubtle },
                    ]}>
                    <View style={styles.settingsRowLeft}>
                      <LogOut size={16} color={palette.textPrimary} />
                      <Text
                        style={[
                          styles.settingsRowTitle,
                          { color: palette.textPrimary },
                        ]}>
                        {t('profile.dataAndAccount.signOut')}
                      </Text>
                    </View>
                    <ChevronRight size={15} color={palette.textMuted} />
                  </Pressable>

                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: palette.borderSubtle },
                    ]}
                  />
                  <Pressable
                    onPress={() => setIsDeleteModalOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      'profile.dataAndAccount.deleteAccount'
                    )}
                    style={({ pressed }) => [
                      styles.settingsRow,
                      pressed && { backgroundColor: palette.criticalBg },
                    ]}>
                    <View style={styles.settingsRowLeft}>
                      <Trash2 size={16} color={palette.criticalText} />
                      <Text
                        style={[
                          styles.settingsRowTitle,
                          { color: palette.criticalText },
                        ]}>
                        {t('profile.dataAndAccount.deleteAccount')}
                      </Text>
                    </View>
                    <ChevronRight size={15} color={palette.criticalText} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={isDeleteModalOpen}
        email={user?.email}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={async () => {
          const res = await deleteAccount();
          if (res.ok) {
            triggerSuccessHaptic();
            router.replace('/auth');
          }
          return res;
        }}
      />

      <LegalInfoModal
        visible={legalDoc !== null}
        document={legalDoc ?? 'privacy'}
        onClose={() => setLegalDoc(null)}
      />
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
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.lg + 2,
  },
  section: {
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.eyebrow,
    paddingHorizontal: Spacing.xs,
  },
  groupedBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.sm,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingsRowTextCol: {
    flex: 1,
    gap: 2,
  },
  settingsRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsRowSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: BorderWidth.hairline,
    marginLeft: Spacing.md,
  },
});
