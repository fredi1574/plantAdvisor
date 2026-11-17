import {
  computePlantReminderDate,
  isDateInVacationWindow,
  type NotificationPreferences,
} from '@/services/notificationService';
import type { UserPlant } from '@/types/plant';

const prefs: NotificationPreferences = {
  enabled: true,
  reminderHour: 9,
  reminderMinute: 30,
  dailyDigestEnabled: true,
};

const makePlant = (daysAgoWatered: number, intervalDays: number): UserPlant => ({
  id: 'notif-plant-1',
  nickname: 'Aloe',
  photoUri: 'https://example.com/aloe.jpg',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  location: 'Sill',
  isIndoor: true,
  lightExposure: 'bright_direct',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lastWateredAt: new Date(
    Date.now() - daysAgoWatered * 24 * 60 * 60 * 1000
  ).toISOString(),
  customWateringIntervalDays: intervalDays,
  species: {
    id: 'sp-aloe',
    commonName: 'Aloe Vera',
    scientificName: 'Aloe barbadensis miller',
    family: 'Asphodelaceae',
    plantType: 'succulent',
    baselineCare: {
      idealLight: 'Bright sun',
      baseWateringDays: intervalDays,
      soilRecommendation: 'Gritty mix',
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays: 12,
        rotWarningNote: 'Never mist.',
      },
    },
  },
});

describe('computePlantReminderDate', () => {
  it('returns a future Date at the preferred reminderHour and reminderMinute', () => {
    const plant = makePlant(1, 14);
    const reminder = computePlantReminderDate(plant, prefs);

    expect(reminder.getHours()).toBe(9);
    expect(reminder.getMinutes()).toBe(30);
    expect(reminder.getTime()).toBeGreaterThan(Date.now());
  });

  it('rolls overdue plants to the next available preferred slot in the future', () => {
    const overduePlant = makePlant(20, 14);
    const reminder = computePlantReminderDate(overduePlant, prefs);

    expect(reminder.getHours()).toBe(9);
    expect(reminder.getMinutes()).toBe(30);
    expect(reminder.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('isDateInVacationWindow', () => {
  it('matches dates inclusively within the vacation range', () => {
    const config = {
      enabled: true,
      startDate: '2026-11-10',
      endDate: '2026-11-20',
      snoozeNotifications: true,
    };

    expect(isDateInVacationWindow(config, new Date('2026-11-15T12:00:00'))).toBe(
      true
    );
    expect(isDateInVacationWindow(config, new Date('2026-11-25T12:00:00'))).toBe(
      false
    );
    expect(
      isDateInVacationWindow(
        { ...config, enabled: false },
        new Date('2026-11-15T12:00:00')
      )
    ).toBe(false);
  });
});
