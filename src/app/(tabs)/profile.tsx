import { router } from 'expo-router';
import { LogOut, RotateCcw, Sprout, Trash2 } from 'lucide-react-native';
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
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
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

          <SurfaceCard style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <RotateCcw size={18} color={palette.primary} />
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                Sample Conservatory
              </Text>
            </View>
            <Text style={[styles.description, { color: palette.textSecondary }]}>
              Restore the default sample conservatory plants and care logs on
              this device.
            </Text>

            <Pressable
              onPress={handleResetToSampleGarden}
              style={({ pressed }) => [
                styles.dangerOutlineBtn,
                {
                  borderColor: palette.criticalBorder,
                  backgroundColor: palette.criticalBg,
                },
                pressed && { opacity: 0.85 },
              ]}>
              <RotateCcw size={14} color={palette.criticalText} />
              <Text
                style={[
                  styles.dangerOutlineBtnText,
                  { color: palette.criticalText },
                ]}>
                Reset to Sample Garden
              </Text>
            </Pressable>
          </SurfaceCard>

          {user && (
            <View style={styles.accountActionsStack}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  {
                    backgroundColor: palette.bgSurface,
                    borderColor: palette.borderSubtle,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <LogOut size={16} color={palette.textPrimary} />
                <Text
                  style={[styles.signOutText, { color: palette.textPrimary }]}>
                  Sign Out
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsDeleteModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Delete Account"
                style={({ pressed }) => [
                  styles.signOutBtn,
                  {
                    backgroundColor: palette.criticalBg,
                    borderColor: palette.criticalBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <Trash2 size={16} color={palette.criticalText} />
                <Text
                  style={[styles.signOutText, { color: palette.criticalText }]}>
                  Delete Account
                </Text>
              </Pressable>
            </View>
          )}
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
    gap: Spacing.lg,
  },
  card: {
    borderRadius: Radius.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  dangerOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  dangerOutlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  accountActionsStack: {
    gap: Spacing.sm,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
