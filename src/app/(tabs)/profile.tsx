import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import {
  Bell,
  BellOff,
  Clock,
  CloudOff,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Save,
  Send,
  Sprout,
  Sun,
  User as UserIcon
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BorderWidth,
  BottomTabInset,
  CardShadow,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
  type ThemePalette,
} from '@/constants/theme';
import { BotanicalBackground } from '@/components/botanical-background';
import { FeedbackBanner } from '@/components/feedback-banner';
import { ScreenHeader } from '@/components/screen-header';
import { usePalette } from '@/hooks/use-theme';
import { useThemeStore, type ThemePreference } from '@/store/useThemeStore';
import {
  getNotificationPermissionStatus,
  getScheduledReminderCount,
  requestNotificationPermissions,
  sendTestCareNotification,
} from '@/services/notificationService';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlantStore } from '@/store/usePlantStore';
import type { ExperienceLevel } from '@/types/plant';

function formatReminderTime(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const hh = String(hour12).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner Sprout',
  enthusiast: 'Plant Enthusiast',
  master_gardener: 'Master Botanist',
};

export default function ProfileScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const isSyncing = usePlantStore((s) => s.isSyncing);
  const syncWithSupabase = usePlantStore((s) => s.syncWithSupabase);
  const notificationPrefs = usePlantStore((s) => s.notificationPrefs);
  const setNotificationPrefs = usePlantStore((s) => s.setNotificationPrefs);

  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftLevel, setDraftLevel] = useState<ExperienceLevel | null>(null);
  const [draftBio, setDraftBio] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'unsupported'
  >('undetermined');
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  // Native OS Time Picker State
  const [showNativePicker, setShowNativePicker] = useState(false);

  const handleNativeTimeChange = async (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    // On Android, dismissing the dialog sends type 'dismissed'
    if (Platform.OS === 'android') {
      setShowNativePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const label = formatReminderTime(hour, minute);

    if (Platform.OS === 'ios') {
      // iOS spinner/compact keeps running; we can hide or keep open
      setShowNativePicker(false);
    }

    await handleSelectReminderTime(hour, minute, label);
  };

  useEffect(() => {
    void (async () => {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      const count = await getScheduledReminderCount();
      setScheduledCount(count);
    })();
  }, [plants, notificationPrefs]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestNotificationPermissions();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        showToast(
          'Notification permissions are disabled in system settings.'
        );
        return;
      }
    }
    await setNotificationPrefs({ enabled });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    showToast(
      enabled
        ? 'Local plant care reminders enabled! 🔔'
        : 'Care reminders paused.'
    );
  };

  const handleToggleDailyDigest = async (dailyDigestEnabled: boolean) => {
    await setNotificationPrefs({ dailyDigestEnabled });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    showToast(
      dailyDigestEnabled
        ? 'Daily morning garden digest enabled!'
        : 'Daily morning digest turned off.'
    );
  };

  const handleSelectReminderTime = async (
    hour: number,
    minute: number,
    label: string
  ) => {
    await setNotificationPrefs({
      reminderHour: hour,
      reminderMinute: minute,
    });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    showToast(`Reminders rescheduled for ${label}.`);
  };

  const handleSendTestReminder = async () => {
    const ok = await sendTestCareNotification(plants);
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    if (ok) {
      showToast('Test care reminder scheduled (arriving in ~2s)! 🌿');
    } else {
      showToast('Please grant notification permissions to receive reminders.');
    }
  };

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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="account" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          <ScreenHeader
            eyebrow="GARDENER ACCOUNT & CLOUD"
            title="Profile & Sync"
            icon={<Sprout size={16} color={palette.primary} />}
          />

          <FeedbackBanner message={toast} />

          {/* Signed-Out Guest State */}
          {!user ? (
            <View style={styles.card}>
              <View style={styles.statusPillOffline}>
                <CloudOff size={14} color={palette.attentionText} />
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
                <LogIn size={18} color={palette.textInverse} />
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
                      <ActivityIndicator size="small" color={palette.primary} />
                    ) : (
                      <RefreshCw size={15} color={palette.primary} />
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
                  <UserIcon size={17} color={palette.primary} />
                  <Text style={styles.sectionTitle}>Gardener Profile</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDraftName}
                    placeholder="Your name or handle"
                    placeholderTextColor={palette.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Growing Environment / Notes
                  </Text>
                  <TextInput
                    value={bio}
                    onChangeText={setDraftBio}
                    placeholder="e.g. South-facing apartment balcony, Zone 9b succulents"
                    placeholderTextColor={palette.textMuted}
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
                      color={palette.textInverse}
                    />
                  ) : (
                    <>
                      <Save size={16} color={palette.textInverse} />
                      <Text style={styles.primaryBtnText}>Save Profile</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {/* Appearance / Theme Mode Card */}
          <View
            style={[
              styles.appearanceCard,
              {
                backgroundColor: palette.bgSurface,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <View style={styles.sectionTitleRow}>
              <Sun size={17} color={palette.primary} />
              <Text
                style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Appearance
              </Text>
            </View>
            <Text
              style={[
                styles.cardDescription,
                { color: palette.textSecondary },
              ]}>
              Choose Light, Dark (Night Conservatory), or follow your device
              system setting.
            </Text>

            <View style={styles.appearanceRow}>
              {(
                [
                  { key: 'system', label: 'System', Icon: Monitor },
                  { key: 'light', label: 'Light', Icon: Sun },
                  { key: 'dark', label: 'Dark', Icon: Moon },
                ] as const satisfies readonly {
                  key: ThemePreference;
                  label: string;
                  Icon: typeof Sun;
                }[]
              ).map(({ key, label, Icon }) => {
                const isSelected = themePreference === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setThemePreference(key);
                      showToast(`Theme set to ${label}.`);
                    }}
                    style={({ pressed }) => [
                      styles.appearancePill,
                      {
                        backgroundColor: isSelected
                          ? palette.primary
                          : palette.bgSubtle,
                        borderColor: isSelected
                          ? palette.primary
                          : palette.borderSubtle,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}>
                    <Icon
                      size={14}
                      color={
                        isSelected ? palette.textInverse : palette.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.appearancePillText,
                        {
                          color: isSelected
                            ? palette.textInverse
                            : palette.textPrimary,
                        },
                      ]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Local Care Notifications Preferences Card */}
          <View style={styles.card}>
            <View style={styles.notificationHeaderRow}>
              <View style={styles.sectionTitleRow}>
                {notificationPrefs.enabled ? (
                  <Bell size={17} color={palette.primary} />
                ) : (
                  <BellOff size={17} color={palette.textMuted} />
                )}
                <Text style={styles.sectionTitle}>Local Care Notifications</Text>
              </View>
              <View
                style={
                  notificationPrefs.enabled && permissionStatus === 'granted'
                    ? styles.statusPillOnline
                    : styles.statusPillOffline
                }>
                <Text
                  style={
                    notificationPrefs.enabled && permissionStatus === 'granted'
                      ? styles.statusPillOnlineText
                      : styles.statusPillOfflineText
                  }>
                  {!notificationPrefs.enabled
                    ? 'Paused'
                    : permissionStatus === 'granted'
                      ? Platform.OS === 'web'
                        ? 'Active'
                        : `${scheduledCount} Scheduled`
                      : 'Permission Needed'}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDescription}>
              100% on-device watering alarms. Whenever you water a plant or update
              its interval, FloraLog automatically reschedules its next due-date
              reminder.
            </Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>Watering Reminders</Text>
                <Text style={styles.toggleSublabel}>
                  Notify me on the day each plant is due for water
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enabled}
                onValueChange={(val) => void handleToggleNotifications(val)}
                trackColor={{
                  false: palette.borderSubtle,
                  true: palette.primary,
                }}
                thumbColor={palette.textInverse}
              />
            </View>

            {notificationPrefs.enabled && (
              <>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleLabel}>
                      Daily Garden Morning Digest
                    </Text>
                    <Text style={styles.toggleSublabel}>
                      Summary of plants needing attention today
                    </Text>
                  </View>
                  <Switch
                    value={notificationPrefs.dailyDigestEnabled}
                    onValueChange={(val) => void handleToggleDailyDigest(val)}
                    trackColor={{
                      false: palette.borderSubtle,
                      true: palette.primary,
                    }}
                    thumbColor={palette.textInverse}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <View style={styles.timeLabelRow}>
                    <Clock size={14} color={palette.textSecondary} />
                    <Text style={styles.label}>Preferred Reminder Time</Text>
                  </View>

                  <Pressable
                    onPress={() => setShowNativePicker(true)}
                    style={({ pressed }) => [
                      styles.customTimePickerTrigger,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Preferred reminder time ${formatReminderTime(
                      notificationPrefs.reminderHour,
                      notificationPrefs.reminderMinute
                    )}. Tap to change.`}>
                    <View style={styles.customTimeDisplayRow}>
                      <View style={styles.customTimeIconBadge}>
                        <Clock size={16} color={palette.primary} />
                      </View>
                      <View>
                        <Text style={styles.customTimeValueText}>
                          {formatReminderTime(
                            notificationPrefs.reminderHour,
                            notificationPrefs.reminderMinute
                          )}
                        </Text>
                        <Text style={styles.customTimeSubText}>
                          Opens system clock & time picker
                        </Text>
                      </View>
                    </View>

                    <View style={styles.customTimeChangePill}>
                      <Text style={styles.customTimeChangePillText}>
                        Change
                      </Text>
                    </View>
                  </Pressable>

                  {/* Native OS DateTimePicker */}
                  {showNativePicker && (
                    <DateTimePicker
                      value={
                        new Date(
                          new Date().setHours(
                            notificationPrefs.reminderHour,
                            notificationPrefs.reminderMinute,
                            0,
                            0
                          )
                        )
                      }
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleNativeTimeChange}
                    />
                  )}
                </View>
              </>
            )}

            <Pressable
              onPress={() => void handleSendTestReminder()}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.85 },
              ]}>
              <Send size={15} color={palette.primary} />
              <Text style={styles.secondaryBtnText}>
                Send Test Care Notification
              </Text>
            </Pressable>
          </View>

          {user && (
            /* Sign Out Button */
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutBtn,
                pressed && { opacity: 0.8 },
              ]}>
              <LogOut size={16} color={palette.criticalText} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
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
    color: palette.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.5,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: palette.thrivingBg,
    borderWidth: 1,
    borderColor: palette.thrivingBorder,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.thrivingText,
  },
  card: {
    backgroundColor: palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
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
    backgroundColor: palette.attentionBg,
    borderWidth: 1,
    borderColor: palette.attentionBorder,
  },
  statusPillOfflineText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.attentionText,
  },
  statusPillOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: palette.thrivingBg,
    borderWidth: 1,
    borderColor: palette.thrivingBorder,
  },
  statusPillOnlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.thrivingText,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: Radius.md,
    paddingVertical: 13,
    marginTop: 4,
  },
  primaryBtnText: {
    color: palette.textInverse,
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
    backgroundColor: palette.primarySoft,
    borderWidth: 2,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.primary,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: palette.textSecondary,
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
    backgroundColor: palette.primarySoft,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.primary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.bgPrimary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: palette.borderSubtle,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: palette.primarySoft,
  },
  syncNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  input: {
    backgroundColor: palette.bgPrimary,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15,
    color: palette.textPrimary,
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
    backgroundColor: palette.bgPrimary,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  chipActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  chipTextActive: {
    color: palette.primary,
    fontWeight: '700',
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: palette.bgPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  toggleTextCol: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  toggleSublabel: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customTimePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.bgPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: palette.borderSubtle,
  },
  customTimeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customTimeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTimeValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.2,
  },
  customTimeSubText: {
    fontSize: 11,
    color: palette.textSecondary,
    marginTop: 1,
  },
  customTimeChangePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  customTimeChangePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
    marginTop: 2,
  },
  secondaryBtnText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: palette.criticalBg,
    borderWidth: 1,
    borderColor: palette.criticalBorder,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.criticalText,
  },
  appearanceCard: {
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  appearancePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + Spacing.half,
    paddingVertical: Spacing.sm + Spacing.half,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  appearancePillText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
