import { router } from 'expo-router';
import {
  ChevronRight,
  LogOut,
  RotateCcw,
  Sprout,
  Trash2,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountModal } from '@/components/modals/delete-account-modal';
import { AppearanceCard } from '@/components/profile/appearance-card';
import { GuestCloudCard } from '@/components/profile/guest-cloud-card';
import { NotificationsCard } from '@/components/profile/notifications-card';
import { ProfileEditorCard } from '@/components/profile/profile-editor-card';
import { ProfileOverviewCard } from '@/components/profile/profile-overview-card';
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
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const plantCount = usePlantStore((s) => s.plants.length);
  const entryCount = usePlantStore((s) => s.entries.length);
  const resetToSeedData = usePlantStore((s) => s.resetToSeedData);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { message: toast, showToast } = useToast(3200);

  const handleSignOut = () => {
    confirmAction({
      title: 'Sign Out',
      message: 'Sign out of your FloraLog cloud account?',
      confirmLabel: 'Sign Out',
      destructive: true,
      onConfirm: async () => {
        await signOut();
        router.replace('/auth');
      },
    });
  };

  const handleResetToSampleGarden = () => {
    confirmAction({
      title: 'Reset to Sample Garden',
      message:
        'Replace your current local garden with the sample conservatory? This cannot be undone.',
      confirmLabel: 'Reset',
      destructive: true,
      onConfirm: () => {
        resetToSeedData();
        triggerSuccessHaptic();
        showToast('Restored the sample conservatory.');
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
            eyebrow="GARDENER ACCOUNT & CLOUD"
            title="Profile & Sync"
            icon={<Sprout size={16} color={palette.primary} />}
          />

          {!user ? (
            <GuestCloudCard plantCount={plantCount} entryCount={entryCount} />
          ) : (
            <>
              <ProfileOverviewCard
                user={user}
                profile={profile}
                onShowToast={showToast}
              />
              <ProfileEditorCard
                user={user}
                profile={profile}
                onShowToast={showToast}
              />
            </>
          )}

          <AppearanceCard onShowToast={showToast} />
          <NotificationsCard onShowToast={showToast} />

          <View style={styles.section}>
            <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
              DATA &amp; ACCOUNT
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
                onPress={handleResetToSampleGarden}
                accessibilityRole="button"
                accessibilityLabel="Reset to Sample Garden"
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
                      Reset to Sample Garden
                    </Text>
                    <Text
                      style={[
                        styles.settingsRowSub,
                        { color: palette.textSecondary },
                      ]}>
                      Restore the default sample conservatory on this device
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
                    accessibilityLabel="Sign Out"
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
                        Sign Out
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
                    accessibilityLabel="Delete Account"
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
                        Delete Account
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
