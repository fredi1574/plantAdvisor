import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { DayAgendaCard } from '@/components/calendar/day-agenda-card';
import type {
  DayCareSchedule,
  ProjectedPlantCareTask,
} from '@/services/calendarUtils';
import type { NotebookEntry, UserPlant } from '@/types/plant';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

function makePlant(id: string, nickname: string): UserPlant {
  return {
    id,
    nickname,
    location: 'South Living Room Sill',
    isIndoor: true,
    lightExposure: 'bright_direct',
    hasDrainageHole: true,
    potMaterial: 'terracotta',
    photoUri: 'https://example.com/plant.jpg',
    acquiredAt: '2026-10-01T10:00:00.000Z',
    lastWateredAt: '2026-11-10T10:00:00.000Z',
    customWateringIntervalDays: 7,
    species: {
      id: `sp-${id}`,
      commonName: 'Jade Plant',
      scientificName: 'Crassula ovata',
      family: 'Crassulaceae',
      plantType: 'succulent',
      baselineCare: {
        idealLight: 'Bright direct',
        baseWateringDays: 14,
        soilRecommendation: 'Gritty mix',
        succulentGuardrails: {
          isSucculentOrCactus: true,
          neverMistFoliage: true,
          soakAndDryRequired: true,
          minimumDryBackDays: 12,
          rotWarningNote: 'Allow dry-back.',
        },
      },
    },
  };
}

describe('DayAgendaCard', () => {
  const plantA = makePlant('p-a', 'Sunny Jade');
  const plantB = makePlant('p-b', 'Silver Pothos');
  const plantLookup: Record<string, UserPlant> = {
    [plantA.id]: plantA,
    [plantB.id]: plantB,
  };

  it('renders a calm rest-day state when there are no tasks or completed logs', async () => {
    const emptySchedule: DayCareSchedule = {
      dateKey: '2026-11-26',
      date: new Date('2026-11-26T12:00:00.000Z'),
      daysFromToday: 0,
      isToday: true,
      dayOfWeekShort: 'Thu',
      dayOfMonth: 26,
      monthShort: 'Nov',
      fullLabel: 'Today · Nov 26',
      projectedTasks: [],
      completedEntries: [],
      hasWaterTask: false,
      hasFertilizeHistory: false,
      hasPropagationMilestone: false,
    };

    await render(
      <DayAgendaCard
        schedule={emptySchedule}
        plantLookup={plantLookup}
        onCompleteTask={jest.fn()}
      />
    );

    expect(screen.getByText('Rest Day for Your Garden')).toBeTruthy();
    expect(
      screen.getByText('No plants scheduled for care on this day')
    ).toBeTruthy();
  });

  it('renders due tasks, Water All button, Snooze +2d, and completed entries', async () => {
    const waterTaskA: ProjectedPlantCareTask = {
      plant: plantA,
      dateKey: '2026-11-26',
      taskKind: 'water',
      isOverdue: true,
      isDueToday: true,
      daysFromToday: 0,
      actionLabel: 'Soak & Dry',
      cycleIndex: 0,
    };
    const waterTaskB: ProjectedPlantCareTask = {
      plant: plantB,
      dateKey: '2026-11-26',
      taskKind: 'water',
      isOverdue: false,
      isDueToday: true,
      daysFromToday: 0,
      actionLabel: 'Water',
      cycleIndex: 0,
    };
    const feedTask: ProjectedPlantCareTask = {
      plant: plantB,
      dateKey: '2026-11-26',
      taskKind: 'fertilize',
      isOverdue: false,
      isDueToday: true,
      daysFromToday: 0,
      actionLabel: 'Fertilize',
      cycleIndex: 0,
    };
    const completedEntry: NotebookEntry = {
      id: 'log-1',
      plantId: plantA.id,
      eventType: 'prune',
      timestamp: '2026-11-26T08:00:00.000Z',
      title: 'Trimmed spent lower leaves',
      notes: 'Clean cut.',
    };

    const schedule: DayCareSchedule = {
      dateKey: '2026-11-26',
      date: new Date('2026-11-26T12:00:00.000Z'),
      daysFromToday: 0,
      isToday: true,
      dayOfWeekShort: 'Thu',
      dayOfMonth: 26,
      monthShort: 'Nov',
      fullLabel: 'Today · Nov 26',
      projectedTasks: [waterTaskA, waterTaskB, feedTask],
      completedEntries: [completedEntry],
      hasWaterTask: true,
      hasFertilizeHistory: false,
      hasPropagationMilestone: false,
    };

    const onCompleteTask = jest.fn();
    const onSnoozeTask = jest.fn();
    const onWaterAllDueToday = jest.fn();

    await render(
      <DayAgendaCard
        schedule={schedule}
        plantLookup={plantLookup}
        onCompleteTask={onCompleteTask}
        onSnoozeTask={onSnoozeTask}
        onWaterAllDueToday={onWaterAllDueToday}
      />
    );

    await fireEvent.press(screen.getByLabelText('Water all 2 due plants'));
    expect(onWaterAllDueToday).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      screen.getByLabelText('Snooze watering for Sunny Jade by 2 days')
    );
    expect(onSnoozeTask).toHaveBeenCalledWith(waterTaskA);

    await fireEvent.press(screen.getByLabelText('Mark Watered for Sunny Jade'));
    expect(onCompleteTask).toHaveBeenCalledWith(waterTaskA);

    await fireEvent.press(screen.getByLabelText('Log Feed for Silver Pothos'));
    expect(onCompleteTask).toHaveBeenCalledWith(feedTask);

    expect(screen.getByText('Trimmed spent lower leaves')).toBeTruthy();
  });
});
