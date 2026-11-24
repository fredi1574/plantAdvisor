import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { ChevronRight, Clock, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
    onShowToast(t('profile.notifications.rescheduledToast', { time: label }));
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
    const label =
      i18n.language === 'ru'
        ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        : formatReminderTime(hour, minute);

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
        onShowToast(t('profile.notifications.permissionDeniedToast'));
        return;
      }
    }
    await setNotificationPrefs({ enabled });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    onShowToast(
      enabled
        ? t('profile.notifications.enabledToast')
        : t('profile.notifications.pausedToast')
    );
  };

  const handleToggleDailyDigest = async (dailyDigestEnabled: boolean) => {
    await setNotificationPrefs({ dailyDigestEnabled });
    const count = await getScheduledReminderCount();
    setScheduledCount(count);
    onShowToast(
      dailyDigestEnabled
        ? t('profile.notifications.digestOnToast')
        : t('profile.notifications.digestOffToast')
    );
  };

  const handleSendTestReminder = async () => {
    const ok = await sendTestCareNotification(plants);
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    if (ok) {
      onShowToast(t('profile.notifications.testSentToast'));
    } else {
      onShowToast(t('profile.notifications.grantPermissionToast'));
    }
  };

  const isOnlineStatus =
    notificationPrefs.enabled && permissionStatus === 'granted';
  const formattedTime =
    i18n.language === 'ru'
      ? `${String(notificationPrefs.reminderHour).padStart(2, '0')}:${String(
          notificationPrefs.reminderMinute
        ).padStart(2, '0')}`
      : formatReminderTime(
          notificationPrefs.reminderHour,
          notificationPrefs.reminderMinute
        );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          {t('profile.notifications.eyebrow')}
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
              ? t('profile.notifications.statusPaused')
              : permissionStatus === 'granted'
                ? Platform.OS === 'web'
                  ? t('profile.notifications.statusActive')
                  : t('profile.notifications.statusScheduled', {
                      count: scheduledCount,
                    })
                : t('profile.notifications.statusPermissionNeeded')}
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
            label={t('profile.notifications.wateringRemindersLabel')}
            description={t('profile.notifications.wateringRemindersDesc')}
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
                label={t('profile.notifications.dailyDigestLabel')}
                description={t('profile.notifications.dailyDigestDesc')}
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
                    {t('profile.notifications.preferredTimeWeb')}
                  </Text>
                </View>
                <View style={styles.webPresetsRow}>
                  {WEB_TIME_PRESETS.map((preset) => {
                    const selected =
                      notificationPrefs.reminderHour === preset.hour &&
                      notificationPrefs.reminderMinute === preset.minute;
                    const displayLabel =
                      i18n.language === 'ru'
                        ? `${String(preset.hour).padStart(2, '0')}:00`
                        : preset.label;
                    return (
                      <Chip
                        key={preset.label}
                        label={displayLabel}
                        size="md"
                        selected={selected}
                        onPress={() =>
                          void handleSelectReminderTime(
                            preset.hour,
                            preset.minute,
                            displayLabel
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
                  accessibilityLabel={`${t('profile.notifications.reminderTime')} ${formattedTime}`}>
                  <View style={styles.actionRowLeft}>
                    <Clock size={16} color={palette.primary} />
                    <Text
                      style={[styles.rowTitle, { color: palette.textPrimary }]}>
                      {t('profile.notifications.reminderTime')}
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
                    is24Hour={i18n.language === 'ru'}
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
              {t('profile.notifications.sendTest')}
            </Text>
          </View>
          <ChevronRight size={15} color={palette.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.footnote, { color: palette.textMuted }]}>
        {t('profile.notifications.footnote')}
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
