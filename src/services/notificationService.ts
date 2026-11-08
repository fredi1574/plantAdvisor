/**
 * FloraLog — Local Care Notification Service (`expo-notifications`)
 * 100% on-device local notification scheduling for plant watering reminders
 * and daily morning garden digests.
 */

import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { UserPlant } from '@/types/plant';

export interface NotificationPreferences {
  enabled: boolean;
  reminderHour: number; // 0-23, default 9 (09:00 AM)
  reminderMinute: number; // 0-59, default 0
  dailyDigestEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  reminderHour: 9,
  reminderMinute: 0,
  dailyDigestEnabled: true,
};

export const WATERING_CHANNEL_ID = 'watering-reminders';

const PLANT_REMINDER_PREFIX = 'floralog-plant-water-';
const DAILY_DIGEST_ID = 'floralog-daily-digest';

let isConfigured = false;

/**
 * Configures foreground notification behavior and Android notification channel.
 */
export async function initializeNotifications(): Promise<void> {
  if (Platform.OS === 'web' || isConfigured) return;

  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await setNotificationChannelAsync(WATERING_CHANNEL_ID, {
        name: 'Watering & Care Reminders',
        description:
          'Timely reminders when your plants are due for water or care.',
        importance: AndroidImportance.HIGH,
        enableVibrate: true,
        lightColor: '#2D5A3C',
      });
    }

    isConfigured = true;
  } catch {
    // Gracefully handle Expo Go on Android SDK 53+ where native notification channel modules are omitted
  }
}

/**
 * Checks current notification permission status without prompting.
 */
export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unsupported'
> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'undetermined';
    }
    return 'unsupported';
  }

  try {
    const settings = await getPermissionsAsync();
    if (settings.granted) return 'granted';
    if (!settings.canAskAgain) return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

/**
 * Requests system notification permissions on iOS, Android 13+, or Web.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  try {
    await initializeNotifications();
    const existing = await getPermissionsAsync();
    if (existing.granted) return true;

    const requested = await requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

function getPlantNotificationId(plantId: string): string {
  return `${PLANT_REMINDER_PREFIX}${plantId}`;
}

/**
 * Computes the next scheduled reminder Date at the user's preferred hour/minute
 * on the day the plant is due for watering (or next upcoming slot if already overdue).
 */
export function computePlantReminderDate(
  plant: UserPlant,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): Date {
  const lastWateredMs = new Date(plant.lastWateredAt).getTime();
  const dueMs =
    lastWateredMs + plant.customWateringIntervalDays * 24 * 60 * 60 * 1000;

  const targetDate = new Date(dueMs);
  targetDate.setHours(prefs.reminderHour, prefs.reminderMinute, 0, 0);

  const now = new Date();
  if (targetDate.getTime() <= now.getTime()) {
    // Plant is already due or today's preferred hour has passed.
    // Schedule for today at preferred hour if still in the future, otherwise tomorrow at preferred hour.
    const nextSlot = new Date(now);
    nextSlot.setHours(prefs.reminderHour, prefs.reminderMinute, 0, 0);
    if (nextSlot.getTime() <= now.getTime() + 60 * 1000) {
      nextSlot.setDate(nextSlot.getDate() + 1);
    }
    return nextSlot;
  }

  return targetDate;
}

/**
 * Cancels an existing scheduled watering notification for a specific plant.
 */
export async function cancelPlantReminder(plantId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelScheduledNotificationAsync(getPlantNotificationId(plantId));
  } catch {
    // Ignore if not found
  }
}

/**
 * Schedules or updates a local watering reminder for a single plant at the preferred time.
 */
export async function schedulePlantWateringReminder(
  plant: UserPlant,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  await cancelPlantReminder(plant.id);

  if (!prefs.enabled) return null;

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return null;

  try {
    await initializeNotifications();
    const triggerDate = computePlantReminderDate(plant, prefs);
    const isSucculent = plant.species.plantType === 'succulent';
    const isPropagation = plant.species.plantType === 'propagation';

    const title = isPropagation
      ? `💧 Refresh Water for ${plant.nickname}`
      : isSucculent
        ? `🌵 Soak & Dry Check: ${plant.nickname}`
        : `🌿 Time to Water ${plant.nickname}`;

    const body = isPropagation
      ? `Your ${plant.species.commonName} propagation is due for fresh oxygenated water.`
      : isSucculent
        ? `${plant.nickname} (${plant.species.commonName}) is due for water. Verify the soil is 100% bone-dry before soaking.`
        : `${plant.nickname} (${plant.species.commonName}) in ${plant.location} is ready for a thorough watering.`;

    const id = await scheduleNotificationAsync({
      identifier: getPlantNotificationId(plant.id),
      content: {
        title,
        body,
        sound: 'default',
        data: {
          plantId: plant.id,
          type: 'plant-watering-reminder',
        },
        ...(Platform.OS === 'android' ? { channelId: WATERING_CHANNEL_ID } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch {
    return null;
  }
}

/**
 * Schedules or updates the optional morning summary digest notification.
 * E.g. "3 plants need your attention today (Jade, Avocado, Monstera)"
 */
export async function scheduleDailyGardenDigest(
  plants: UserPlant[],
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    await cancelScheduledNotificationAsync(DAILY_DIGEST_ID);
  } catch {
    // Ignore
  }

  if (!prefs.enabled || !prefs.dailyDigestEnabled || plants.length === 0) {
    return null;
  }

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return null;

  try {
    await initializeNotifications();

    const now = Date.now();
    const dueTodayOrSoon = plants.filter((plant) => {
      const lastWateredMs = new Date(plant.lastWateredAt).getTime();
      const nextDueMs =
        lastWateredMs + plant.customWateringIntervalDays * 24 * 60 * 60 * 1000;
      const diffDays = Math.ceil((nextDueMs - now) / (24 * 60 * 60 * 1000));
      return diffDays <= 1;
    });

    const targetPlants = dueTodayOrSoon.length > 0 ? dueTodayOrSoon : plants;
    const namesPreview = targetPlants
      .slice(0, 3)
      .map((p) => p.nickname)
      .join(', ');

    const body =
      dueTodayOrSoon.length > 0
        ? `${dueTodayOrSoon.length} ${
            dueTodayOrSoon.length === 1 ? 'plant needs' : 'plants need'
          } your attention (${namesPreview}${
            dueTodayOrSoon.length > 3 ? '...' : ''
          }).`
        : `Your ${plants.length} ${
            plants.length === 1 ? 'plant is' : 'plants are'
          } on schedule (${namesPreview}). Tap to review today's care calendar.`;

    const id = await scheduleNotificationAsync({
      identifier: DAILY_DIGEST_ID,
      content: {
        title: '🌱 FloraLog Morning Garden Digest',
        body,
        sound: 'default',
        data: {
          type: 'daily-garden-digest',
        },
        ...(Platform.OS === 'android' ? { channelId: WATERING_CHANNEL_ID } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: prefs.reminderHour,
        minute: prefs.reminderMinute,
      },
    });

    return id;
  } catch {
    return null;
  }
}

/**
 * Cancels all scheduled FloraLog notifications.
 */
export async function cancelAllGardenNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore
  }
}

/**
 * Synchronizes all plant reminders and the daily digest with current garden state & preferences.
 */
export async function syncAllPlantNotifications(
  plants: UserPlant[],
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!prefs.enabled) {
    await cancelAllGardenNotifications();
    return;
  }

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await Promise.all(
    plants.map((plant) => schedulePlantWateringReminder(plant, prefs))
  );
  await scheduleDailyGardenDigest(plants, prefs);
}

/**
 * Fires an immediate test notification (in 2 seconds) so users can verify their setup.
 */
export async function sendTestCareNotification(
  plants: UserPlant[]
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        new Notification('🌿 FloraLog Care Reminder Test', {
          body:
            plants.length > 0
              ? `Reminders are active for ${plants[0].nickname} and ${Math.max(
                  0,
                  plants.length - 1
                )} other plants!`
              : 'Your local plant care notifications are working!',
        });
        return true;
      }
    }
    return false;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  try {
    await initializeNotifications();
    const sampleNames = plants
      .slice(0, 3)
      .map((p) => p.nickname)
      .join(', ');

    await scheduleNotificationAsync({
      content: {
        title: '🌿 FloraLog Care Reminder Active',
        body:
          plants.length > 0
            ? `${plants.length} ${
                plants.length === 1 ? 'plant is' : 'plants are'
              } being monitored (${sampleNames}). You'll be notified right on time!`
            : 'Local plant care notifications are configured and ready!',
        sound: 'default',
        data: { type: 'test-reminder' },
        ...(Platform.OS === 'android' ? { channelId: WATERING_CHANNEL_ID } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the count of currently scheduled notifications on device.
 */
export async function getScheduledReminderCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const scheduled = await getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}

