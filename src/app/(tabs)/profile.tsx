import { router } from 'expo-router';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  Sparkles,
  Sprout,
  User as UserIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CardShadow,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlantStore } from '@/store/usePlantStore';
import type { ExperienceLevel } from '@/types/plant';

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner Sprout',
  enthusiast: 'Plant Enthusiast',
  master_gardener: 'Master Botanist',
};

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const isSyncing = usePlantStore((s) => s.isSyncing);
  const syncWithSupabase = usePlantStore((s) => s.syncWithSupabase);

  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftLevel, setDraftLevel] = useState<ExperienceLevel | null>(null);
  const [draftBio, setDraftBio] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const displayName =
    draftName ??
    profile?.displayName ??
    user?.email?.split('@')[0] ??
    'Gardener';
  const experienceLevel: ExperienceLevel =
    draftLevel ?? profile?.experienceLevel ?? 'enthusiast';
  const bio = draftBio ?? profile?.bio ?? '';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSaveProfile = async () => {
    const res = await updateProfile({
      displayName,
      experienceLevel,
      bio,
    });
    if (res.ok) {
      setDraftName(null);
      setDraftLevel(null);
      setDraftBio(null);
      showToast('Gardener profile saved to Supabase! 🌿');
    } else if (res.error) {
      showToast(res.error);
    }
  };

  const handleManualSync = async () => {
    await syncWithSupabase();
    showToast('Garden synced with Supabase cloud!');
  };

  const handleSignOut = () => {
    const performSignOut = async () => {
      await signOut();
      router.replace('/auth');
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Sign out of your FloraLog cloud account?')
      ) {
        void performSignOut();
      }
    } else {
      Alert.alert('Sign Out', 'Sign out of your FloraLog cloud account?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => void performSignOut(),
        },
      ]);
    }
  };

  const initials = (
    profile?.displayName ||
    user?.email ||
    'FL'
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.brandBadgeRow}>
              <Sprout size={18} color={Palette.primary} />
              <Text style={styles.brandEyebrow}>GARDENER ACCOUNT & CLOUD</Text>
            </View>
            <Text style={styles.headerTitle}>Profile & Sync</Text>
          </View>

          {toast && (
            <View style={styles.toastBanner}>
              <CheckCircle2 size={16} color={Palette.thrivingText} />
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}

          {/* Signed-Out Guest State */}
          {!user ? (
            <View style={styles.card}>
              <View style={styles.statusPillOffline}>
                <CloudOff size={14} color={Palette.attentionText} />
                <Text style={styles.statusPillOfflineText}>
                  Offline Guest Mode
                </Text>
              </View>

              <Text style={styles.cardTitle}>
                Back Up Your Garden in the Cloud
              </Text>
              <Text style={styles.cardDescription}>
                Your {plants.length} {plants.length === 1 ? 'plant' : 'plants'}{' '}
                and {entries.length} care{' '}
                {entries.length === 1 ? 'entry are' : 'entries are'} currently
                stored only on this device. Sign in or create a free account to
                sync your garden with Supabase across Android, iOS, and Web.
              </Text>

              <Pressable
                onPress={() => router.push('/auth')}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.9 },
                ]}>
                <LogIn size={18} color={Palette.textInverse} />
                <Text style={styles.primaryBtnText}>
                  Sign In or Create Account
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Signed-In Overview Card */}
              <View style={styles.card}>
                <View style={styles.profileHeaderRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                      {profile?.displayName || 'Gardener'}
                    </Text>
                    <Text style={styles.profileEmail}>{user.email}</Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.levelBadge}>
                        <Sparkles size={12} color={Palette.primary} />
                        <Text style={styles.levelBadgeText}>
                          {
                            LEVEL_LABELS[
                              profile?.experienceLevel ?? 'enthusiast'
                            ]
                          }
                        </Text>
                      </View>
                      <View style={styles.statusPillOnline}>
                        <Cloud size={12} color={Palette.thrivingText} />
                        <Text style={styles.statusPillOnlineText}>
                          Supabase Synced
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.statsBar}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{plants.length}</Text>
                    <Text style={styles.statLabel}>Plants</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{entries.length}</Text>
                    <Text style={styles.statLabel}>Care Logs</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <Pressable
                    onPress={handleManualSync}
                    disabled={isSyncing}
                    style={({ pressed }) => [
                      styles.syncNowBtn,
                      pressed && { opacity: 0.8 },
                    ]}>
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={Palette.primary} />
                    ) : (
                      <RefreshCw size={15} color={Palette.primary} />
                    )}
                    <Text style={styles.syncNowText}>
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Edit Profile Card */}
              <View style={styles.card}>
                <View style={styles.sectionTitleRow}>
                  <UserIcon size={17} color={Palette.primary} />
                  <Text style={styles.sectionTitle}>Gardener Profile</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDraftName}
                    placeholder="Your name or handle"
                    placeholderTextColor={Palette.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Experience Level</Text>
                  <View style={styles.chipsRow}>
                    {(
                      ['beginner', 'enthusiast', 'master_gardener'] as const
                    ).map((lvl) => {
                      const active = experienceLevel === lvl;
                      return (
                        <Pressable
                          key={lvl}
                          onPress={() => setDraftLevel(lvl)}
                          style={[styles.chip, active && styles.chipActive]}>
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}>
                            {LEVEL_LABELS[lvl]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Growing Environment / Notes
                  </Text>
                  <TextInput
                    value={bio}
                    onChangeText={setDraftBio}
                    placeholder="e.g. South-facing apartment balcony, Zone 9b succulents"
                    placeholderTextColor={Palette.textMuted}
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <Pressable
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.9 },
                    isLoading && { opacity: 0.65 },
                  ]}>
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={Palette.textInverse}
                    />
                  ) : (
                    <>
                      <Save size={16} color={Palette.textInverse} />
                      <Text style={styles.primaryBtnText}>Save Profile</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Sign Out Button */}
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  pressed && { opacity: 0.8 },
                ]}>
                <LogOut size={16} color={Palette.criticalText} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 48,
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  headerBlock: {
    gap: 4,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Palette.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.thrivingBg,
    borderWidth: 1,
    borderColor: Palette.thrivingBorder,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.thrivingText,
  },
  card: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: Spacing.md,
    ...CardShadow,
  },
  statusPillOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Palette.attentionBg,
    borderWidth: 1,
    borderColor: Palette.attentionBorder,
  },
  statusPillOfflineText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.attentionText,
  },
  statusPillOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Palette.thrivingBg,
    borderWidth: 1,
    borderColor: Palette.thrivingBorder,
  },
  statusPillOnlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.thrivingText,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    paddingVertical: 13,
    marginTop: 4,
  },
  primaryBtnText: {
    color: Palette.textInverse,
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: Palette.primarySoft,
    borderWidth: 2,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.primary,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: Palette.textSecondary,
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
    backgroundColor: Palette.primarySoft,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: Palette.borderSubtle,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Palette.primarySoft,
  },
  syncNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  input: {
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15,
    color: Palette.textPrimary,
  },
  textArea: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  chipActive: {
    backgroundColor: Palette.primarySoft,
    borderColor: Palette.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Palette.criticalBg,
    borderWidth: 1,
    borderColor: Palette.criticalBorder,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.criticalText,
  },
});
