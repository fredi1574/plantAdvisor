import type { User } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import {
  Camera,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  Sprout,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerSuccessHaptic } from '@/services/haptics';
import { pickPlantImage } from '@/services/imagePicker';
import { uploadPlantPhotoIfNeeded } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlantStore } from '@/store/usePlantStore';
import type { ExperienceLevel, UserProfile } from '@/types/plant';

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner Sprout',
  enthusiast: 'Plant Enthusiast',
  master_gardener: 'Master Botanist',
};

interface ProfileOverviewCardProps {
  user: User;
  profile: UserProfile | null;
  onShowToast: (message: string) => void;
}

/**
 * Signed-in gardener identity summary card with avatar upload, garden stats, and cloud sync trigger.
 */
export function ProfileOverviewCard({
  user,
  profile,
  onShowToast,
}: ProfileOverviewCardProps) {
  const palette = usePalette();
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const plantCount = usePlantStore((s) => s.plants.length);
  const entryCount = usePlantStore((s) => s.entries.length);
  const isSyncing = usePlantStore((s) => s.isSyncing);
  const pendingSyncCount = usePlantStore((s) => s.pendingSyncCount);
  const lastSyncedAt = usePlantStore((s) => s.lastSyncedAt);
  const syncError = usePlantStore((s) => s.syncError);
  const syncWithSupabase = usePlantStore((s) => s.syncWithSupabase);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const initials = (profile?.displayName || user.email || 'FL')
    .slice(0, 2)
    .toUpperCase();

  const hasSyncAttention = (Boolean(syncError) || pendingSyncCount > 0) && !isSyncing;

  const handlePickAvatar = async () => {
    const picked = await pickPlantImage('library', {
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!picked.ok) {
      if (picked.reason !== 'canceled' && picked.message) {
        onShowToast(picked.message);
      }
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadPlantPhotoIfNeeded(picked.uri, 'avatar');
      const res = await updateProfile({
        avatarUrl: uploadedUrl ?? picked.uri,
      });
      if (res.ok) {
        triggerSuccessHaptic();
        onShowToast('Profile photo updated.');
      } else {
        onShowToast(res.error ?? 'Could not update profile photo.');
      }
    } catch {
      onShowToast('Failed to upload profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleManualSync = async () => {
    await syncWithSupabase();
    const latestError = usePlantStore.getState().syncError;
    onShowToast(
      latestError ? latestError : 'Garden synced with Supabase cloud!'
    );
  };

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.profileHeaderRow}>
        <Pressable
          onPress={() => void handlePickAvatar()}
          disabled={isUploadingAvatar}
          style={({ pressed }) => [
            styles.avatarCircle,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primary,
            },
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo">
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <Text style={[styles.avatarText, { color: palette.primary }]}>
              {initials}
            </Text>
          )}
          <View
            style={[
              styles.avatarCameraBadge,
              {
                backgroundColor: palette.primary,
                borderColor: palette.bgSurface,
              },
            ]}>
            {isUploadingAvatar ? (
              <ActivityIndicator size="small" color={palette.textInverse} />
            ) : (
              <Camera size={11} color={palette.textInverse} />
            )}
          </View>
        </Pressable>

        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: palette.textPrimary }]}>
            {profile?.displayName || 'Gardener'}
          </Text>
          <Text style={[styles.profileEmail, { color: palette.textSecondary }]}>
            {user.email}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: palette.primarySoft },
              ]}>
              <Sprout size={12} color={palette.primary} />
              <Text style={[styles.levelBadgeText, { color: palette.primary }]}>
                {EXPERIENCE_LEVEL_LABELS[profile?.experienceLevel ?? 'enthusiast']}
              </Text>
            </View>

            <View
              style={[
                styles.levelBadge,
                { backgroundColor: palette.primarySoft },
                hasSyncAttention && {
                  backgroundColor: palette.attentionBg,
                  borderWidth: BorderWidth.hairline,
                  borderColor: palette.attentionBorder,
                },
              ]}>
              {isSyncing ? (
                <RefreshCw size={12} color={palette.primary} />
              ) : hasSyncAttention ? (
                <CloudOff size={12} color={palette.attentionText} />
              ) : lastSyncedAt ? (
                <CheckCircle2 size={12} color={palette.primary} />
              ) : (
                <Cloud size={12} color={palette.primary} />
              )}
              <Text
                style={[
                  styles.levelBadgeText,
                  {
                    color: hasSyncAttention
                      ? palette.attentionText
                      : palette.primary,
                  },
                ]}>
                {isSyncing
                  ? 'Syncing…'
                  : pendingSyncCount > 0
                    ? `Offline — ${pendingSyncCount} pending`
                    : syncError
                      ? 'Offline — Saved Locally'
                      : lastSyncedAt
                        ? 'Synced'
                        : 'Cloud Ready'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.statsBar,
          {
            backgroundColor: palette.bgPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: palette.textPrimary }]}>
            {plantCount}
          </Text>
          <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
            Plants
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: palette.textPrimary }]}>
            {entryCount}
          </Text>
          <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
            Care Logs
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]}
        />
        <Pressable
          onPress={() => void handleManualSync()}
          disabled={isSyncing}
          style={({ pressed }) => [
            styles.syncNowBtn,
            { backgroundColor: palette.primarySoft },
            pressed && { opacity: 0.8 },
          ]}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <RefreshCw size={15} color={palette.primary} />
          )}
          <Text style={[styles.syncNowText, { color: palette.primary }]}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: BorderWidth.hairline,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 26,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  syncNowText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
