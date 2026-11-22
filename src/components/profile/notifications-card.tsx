import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { ChevronRight, Clock, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { SwitchRow } from '@/components/ui/switch-row';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
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
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          NOTIFICATIONS
        </Text>
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

      <View
        style={[
          styles.groupedBox,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <View style={styles.rowPad}>
          <SwitchRow
            label="Watering Reminders"
            description="Notify on the day each plant is due for water"
            value={notificationPrefs.enabled}
            onValueChange={(val) => void handleToggleNotifications(val)}
            contained={false}
          />
        </View>

        {notificationPrefs.enabled && (
          <>
            <View
              style={[
                styles.divider,
                { backgroundColor: palette.borderSubtle },
              ]}
            />
            <View style={styles.rowPad}>
              <SwitchRow
                label="Daily Morning Digest"
                description="Summary of plants needing attention today"
                value={notificationPrefs.dailyDigestEnabled}
                onValueChange={(val) => void handleToggleDailyDigest(val)}
                contained={false}
              />
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: palette.borderSubtle },
              ]}
            />

            {Platform.OS === 'web' ? (
              <View style={styles.webTimeBlock}>
                <View style={styles.timeLabelRow}>
                  <Clock size={14} color={palette.textSecondary} />
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                    Preferred Reminder Time
                  </Text>
                </View>
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
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowNativePicker(true)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { backgroundColor: palette.bgSubtle },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Preferred reminder time ${formattedTime}. Tap to change.`}>
                  <View style={styles.actionRowLeft}>
                    <Clock size={16} color={palette.primary} />
                    <Text
                      style={[styles.rowTitle, { color: palette.textPrimary }]}>
                      Reminder Time
                    </Text>
                  </View>
                  <View style={styles.actionRowRight}>
                    <Text
                      style={[
                        styles.rowValueText,
                        { color: palette.primary },
                      ]}>
                      {formattedTime}
                    </Text>
                    <ChevronRight size={15} color={palette.textMuted} />
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
          </>
        )}

        <View
          style={[styles.divider, { backgroundColor: palette.borderSubtle }]}
        />
        <Pressable
          onPress={() => void handleSendTestReminder()}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionRow,
            pressed && { backgroundColor: palette.bgSubtle },
          ]}>
          <View style={styles.actionRowLeft}>
            <Send size={15} color={palette.primary} />
            <Text style={[styles.rowTitle, { color: palette.primary }]}>
              Send Test Care Notification
            </Text>
          </View>
          <ChevronRight size={15} color={palette.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.footnote, { color: palette.textMuted }]}>
        100% on-device alarms. Reminders reschedule automatically whenever you
        water a plant or change its interval.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupedBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  rowPad: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  divider: {
    height: BorderWidth.hairline,
    marginLeft: Spacing.md,
  },
  webTimeBlock: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.sm,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  actionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footnote: {
    ...Typography.caption,
    paddingHorizontal: Spacing.xs,
    lineHeight: 17,
  },
});
