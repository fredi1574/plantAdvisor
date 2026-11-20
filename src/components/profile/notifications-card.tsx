import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Bell, BellOff, Clock, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import { SwitchRow } from '@/components/ui/switch-row';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  getNotificationPermissionStatus,
  getScheduledReminderCount,
  requestNotificationPermissions,
  sendTestCareNotification,
} from '@/services/notificationService';
import { usePlantStore } from '@/store/usePlantStore';

const WEB_TIME_PRESETS = [
  { hour: 8, minute: 0, label: '08:00 AM' },
  { hour: 9, minute: 0, label: '09:00 AM' },
  { hour: 12, minute: 0, label: '12:00 PM' },
  { hour: 18, minute: 0, label: '06:00 PM' },
] as const;

function formatReminderTime(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const hh = String(hour12).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

interface NotificationsCardProps {
  onShowToast: (message: string) => void;
}

/**
 * Local care notification preferences, native OS time picker (with Web preset fallback),
 * and test notification trigger.
 */
export function NotificationsCard({ onShowToast }: NotificationsCardProps) {
  const palette = usePalette();
  const plants = usePlantStore((s) => s.plants);
  const notificationPrefs = usePlantStore((s) => s.notificationPrefs);
  const setNotificationPrefs = usePlantStore((s) => s.setNotificationPrefs);

  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'unsupported'
  >('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [showNativePicker, setShowNativePicker] = useState(false);

  useEffect(() => {
    void (async () => {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      const count = await getScheduledReminderCount();
      setScheduledCount(count);
    })();
  }, [plants, notificationPrefs]);

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
    onShowToast(`Reminders rescheduled for ${label}.`);
  };

  const handleNativeTimeChange = async (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
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
      setShowNativePicker(false);
    }

    await handleSelectReminderTime(hour, minute, label);
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      const granted = await requestNotificationPermissions();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        onShowToast(
          'Notification permissions are disabled in system settings.'
        );
        return;
      }
    }
    await setNotificationPrefs({ enabled });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    onShowToast(
      enabled
        ? 'Local plant care reminders enabled! 🔔'
        : 'Care reminders paused.'
    );
  };

  const handleToggleDailyDigest = async (dailyDigestEnabled: boolean) => {
    await setNotificationPrefs({ dailyDigestEnabled });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    onShowToast(
      dailyDigestEnabled
        ? 'Daily morning garden digest enabled!'
        : 'Daily morning digest turned off.'
    );
  };

  const handleSendTestReminder = async () => {
    const ok = await sendTestCareNotification(plants);
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    if (ok) {
      onShowToast('Test care reminder scheduled (arriving in ~2s)! 🌿');
    } else {
      onShowToast(
        'Please grant notification permissions to receive reminders.'
      );
    }
  };

  const isOnlineStatus =
    notificationPrefs.enabled && permissionStatus === 'granted';
  const formattedTime = formatReminderTime(
    notificationPrefs.reminderHour,
    notificationPrefs.reminderMinute
  );

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.sectionTitleRow}>
          {notificationPrefs.enabled ? (
            <Bell size={17} color={palette.primary} />
          ) : (
            <BellOff size={17} color={palette.textMuted} />
          )}
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
            Local Care Notifications
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isOnlineStatus
                ? palette.thrivingBg
                : palette.attentionBg,
              borderColor: isOnlineStatus
                ? palette.thrivingBorder
                : palette.attentionBorder,
            },
          ]}>
          <Text
            style={[
              styles.statusPillText,
              {
                color: isOnlineStatus
                  ? palette.thrivingText
                  : palette.attentionText,
              },
            ]}>
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

      <Text style={[styles.description, { color: palette.textSecondary }]}>
        100% on-device watering alarms. Whenever you water a plant or update its
        interval, FloraLog automatically reschedules its next due-date reminder.
      </Text>

      <SwitchRow
        label="Watering Reminders"
        description="Notify me on the day each plant is due for water"
        value={notificationPrefs.enabled}
        onValueChange={(val) => void handleToggleNotifications(val)}
      />

      {notificationPrefs.enabled && (
        <>
          <SwitchRow
            label="Daily Garden Morning Digest"
            description="Summary of plants needing attention today"
            value={notificationPrefs.dailyDigestEnabled}
            onValueChange={(val) => void handleToggleDailyDigest(val)}
          />

          <View style={styles.fieldGroup}>
            <View style={styles.timeLabelRow}>
              <Clock size={14} color={palette.textSecondary} />
              <Text style={[styles.label, { color: palette.textPrimary }]}>
                Preferred Reminder Time
              </Text>
            </View>

            {Platform.OS === 'web' ? (
              <View style={styles.webPresetsRow}>
                {WEB_TIME_PRESETS.map((preset) => {
                  const selected =
                    notificationPrefs.reminderHour === preset.hour &&
                    notificationPrefs.reminderMinute === preset.minute;
                  return (
                    <Chip
                      key={preset.label}
                      label={preset.label}
                      size="md"
                      selected={selected}
                      onPress={() =>
                        void handleSelectReminderTime(
                          preset.hour,
                          preset.minute,
                          preset.label
                        )
                      }
                    />
                  );
                })}
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowNativePicker(true)}
                  style={({ pressed }) => [
                    styles.timePickerTrigger,
                    {
                      backgroundColor: palette.bgPrimary,
                      borderColor: palette.borderSubtle,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Preferred reminder time ${formattedTime}. Tap to change.`}>
                  <View style={styles.timeDisplayRow}>
                    <View
                      style={[
                        styles.timeIconBadge,
                        { backgroundColor: palette.primarySoft },
                      ]}>
                      <Clock size={16} color={palette.primary} />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.timeValueText,
                          { color: palette.textPrimary },
                        ]}>
                        {formattedTime}
                      </Text>
                      <Text
                        style={[
                          styles.timeSubText,
                          { color: palette.textSecondary },
                        ]}>
                        Opens system clock & time picker
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.changePill,
                      {
                        backgroundColor: palette.primarySoft,
                        borderColor: palette.primary,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.changePillText,
                        { color: palette.primary },
                      ]}>
                      Change
                    </Text>
                  </View>
                </Pressable>

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
                    onChange={(event, date) =>
                      void handleNativeTimeChange(event, date)
                    }
                  />
                )}
              </>
            )}
          </View>
        </>
      )}

      <Pressable
        onPress={() => void handleSendTestReminder()}
        style={({ pressed }) => [
          styles.secondaryBtn,
          {
            backgroundColor: palette.primarySoft,
            borderColor: palette.primary,
          },
          pressed && { opacity: 0.85 },
        ]}>
        <Send size={15} color={palette.primary} />
        <Text style={[styles.secondaryBtnText, { color: palette.primary }]}>
          Send Test Care Notification
        </Text>
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  webPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.medium,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValueText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  timeSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  changePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingVertical: 11,
    marginTop: 2,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
