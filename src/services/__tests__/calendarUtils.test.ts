import {
  getHistoricalCareEvents,
  getProjectedCareEvents,
  toLocalDateKey,
} from '@/services/calendarUtils';
import type { NotebookEntry, UserPlant } from '@/types/plant';

const makePlant = (
  id: string,
  daysAgoWatered: number,
  intervalDays: number
): UserPlant => ({
  id,
  nickname: `Plant ${id}`,
  photoUri: 'https://example.com/plant.jpg',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  location: 'Window',
  isIndoor: true,
  lightExposure: 'bright_indirect',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lastWateredAt: new Date(
    Date.now() - daysAgoWatered * 24 * 60 * 60 * 1000
  ).toISOString(),
  customWateringIntervalDays: intervalDays,
  species: {
    id: `sp-${id}`,
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
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

describe('getHistoricalCareEvents', () => {
  it('groups valid entries by local YYYY-MM-DD key and ignores invalid dates', () => {
    const now = new Date();
    const expectedKey = toLocalDateKey(now);
    const entries: NotebookEntry[] = [
      {
        id: 'e1',
        plantId: 'p1',
        eventType: 'water',
        timestamp: now.toISOString(),
        title: 'Watered',
        notes: 'Soaked',
      },
      {
        id: 'e2',
        plantId: 'p1',
        eventType: 'note',
        timestamp: 'not-a-valid-date',
        title: 'Invalid',
        notes: 'Skip',
      },
    ];

    const grouped = getHistoricalCareEvents(entries);
    expect(grouped[expectedKey]).toHaveLength(1);
    expect(grouped[expectedKey][0].id).toBe('e1');
    expect(Object.keys(grouped)).toHaveLength(1);
  });
});

describe('getProjectedCareEvents', () => {
  it('anchors overdue plants on today (day 0) and projects subsequent cycles', () => {
    const overduePlant = makePlant('overdue', 15, 10);
    const schedule = getProjectedCareEvents([overduePlant], [], 25);

    expect(schedule).toHaveLength(25);
    const todayTasks = schedule[0].projectedTasks;
    expect(todayTasks.some((t) => t.plant.id === 'overdue' && t.isOverdue)).toBe(
      true
    );

    const day10Tasks = schedule[10].projectedTasks;
    expect(
      day10Tasks.some((t) => t.plant.id === 'overdue' && t.cycleIndex === 1)
    ).toBe(true);
  });
});
