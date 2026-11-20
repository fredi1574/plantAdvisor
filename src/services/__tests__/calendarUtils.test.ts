import {
  buildCalendarMonthGrid,
  buildFallbackDaySchedule,
  getHistoricalCareEvents,
  getProjectedCareEvents,
  toLocalDateKey,
} from '@/services/calendarUtils';
import type { NotebookEntry, UserPlant } from '@/types/plant';

const makePlant = (
  id: string,
  daysAgoWatered: number,
  intervalDays: number,
  overrides: Partial<UserPlant> = {}
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
  ...overrides,
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
    expect(
      todayTasks.some(
        (t) =>
          t.plant.id === 'overdue' && t.isOverdue && t.taskKind === 'water'
      )
    ).toBe(true);

    const day10Tasks = schedule[10].projectedTasks;
    expect(
      day10Tasks.some((t) => t.plant.id === 'overdue' && t.cycleIndex === 1)
    ).toBe(true);
  });

  it('anchors fertilize schedule from the latest fertilize entry regardless of entry order', () => {
    const plant = makePlant('fert-plant', 2, 10, {
      fertilizeIntervalDays: 14,
    });
    const olderFert = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000
    ).toISOString();
    const recentFert = new Date(
      Date.now() - 4 * 24 * 60 * 60 * 1000
    ).toISOString();

    const entries: NotebookEntry[] = [
      {
        id: 'fert-old',
        plantId: 'fert-plant',
        eventType: 'fertilize',
        timestamp: olderFert,
        title: 'Old feed',
        notes: '',
      },
      {
        id: 'fert-new',
        plantId: 'fert-plant',
        eventType: 'fertilize',
        timestamp: recentFert,
        title: 'Recent feed',
        notes: '',
      },
    ];

    const schedule = getProjectedCareEvents([plant], entries, 20);
    const todayFert = schedule[0].projectedTasks.filter(
      (t) => t.taskKind === 'fertilize'
    );
    expect(todayFert).toHaveLength(0);

    const futureFert = schedule
      .slice(1)
      .flatMap((d) => d.projectedTasks)
      .filter((t) => t.taskKind === 'fertilize');
    expect(futureFert.length).toBeGreaterThan(0);
    expect(futureFert[0].daysFromToday).toBeGreaterThanOrEqual(9);
  });
});

describe('buildCalendarMonthGrid & buildFallbackDaySchedule', () => {
  it('builds a complete 7-column padded grid for a month', () => {
    const fixedToday = new Date(2026, 10, 20); // Nov 20, 2026
    const grid = buildCalendarMonthGrid(0, {}, {}, fixedToday);

    expect(grid.monthName).toBe('November');
    expect(grid.year).toBe('2026');
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true);

    const dayCells = grid.weeks.flat().filter((c) => c.kind === 'day');
    expect(dayCells).toHaveLength(30);
    expect(dayCells.some((c) => c.kind === 'day' && c.isToday && c.dayNum === 20)).toBe(
      true
    );
  });

  it('builds a fallback day schedule with historical logs for past dates', () => {
    const fixedToday = new Date(2026, 10, 20);
    const pastEntry: NotebookEntry = {
      id: 'past-1',
      plantId: 'p1',
      eventType: 'fertilize',
      timestamp: '2026-10-12T10:00:00.000Z',
      title: 'Autumn Feed',
      notes: 'Half strength',
    };
    const historicalMap = { '2026-10-12': [pastEntry] };
    const fallback = buildFallbackDaySchedule(
      '2026-10-12',
      historicalMap,
      fixedToday
    );

    expect(fallback).toBeDefined();
    expect(fallback?.completedEntries).toHaveLength(1);
    expect(fallback?.hasFertilizeHistory).toBe(true);
    expect(fallback?.daysFromToday).toBeLessThan(0);
  });
});
