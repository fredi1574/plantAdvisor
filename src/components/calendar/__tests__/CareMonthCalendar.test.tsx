import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { CareMonthCalendar } from '@/components/calendar/care-month-calendar';
import { DayAgendaCard } from '@/components/calendar/day-agenda-card';
import type {
  CalendarMonthGrid,
  DayCareSchedule,
} from '@/services/calendarUtils';
import type { UserPlant } from '@/types/plant';

const samplePlant: UserPlant = {
  id: 'p-1',
  nickname: 'Window Jade',
  photoUri: 'https://example.com/jade.jpg',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  location: 'South Sill',
  isIndoor: true,
  lightExposure: 'bright_direct',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lastWateredAt: '2026-11-01T00:00:00.000Z',
  customWateringIntervalDays: 14,
  species: {
    id: 'sp-1',
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    plantType: 'succulent',
    baselineCare: {
      idealLight: 'Bright sun',
      baseWateringDays: 14,
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
};

describe('CareMonthCalendar', () => {
  const calendarMonth: CalendarMonthGrid = {
    monthName: 'November',
    year: '2026',
    yearNum: 2026,
    monthNum: 10,
    weeks: [
      [
        {
          kind: 'day',
          key: '2026-11-20',
          dateKey: '2026-11-20',
          dayNum: 20,
          isToday: true,
          isPast: false,
          completedCount: 1,
        },
      ],
    ],
  };

  it('renders month header and handles navigation and date selection', async () => {
    const onPrevMonth = jest.fn();
    const onNextMonth = jest.fn();
    const onSelectDate = jest.fn();

    await render(
      <CareMonthCalendar
        calendarMonth={calendarMonth}
        selectedDateKey="2026-11-20"
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onSelectDate={onSelectDate}
      />
    );

    expect(screen.getByText('November')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Previous month'));
    expect(onPrevMonth).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByLabelText('Next month'));
    expect(onNextMonth).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByLabelText('November 20, 0 tasks due'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-11-20');
  });
});

describe('DayAgendaCard', () => {
  it('renders scheduled tasks and triggers task completion', async () => {
    const onCompleteTask = jest.fn();
    const schedule: DayCareSchedule = {
      date: new Date('2026-11-20T00:00:00.000Z'),
      dateKey: '2026-11-20',
      daysFromToday: 0,
      fullLabel: 'Today, Nov 20',
      dayOfWeekShort: 'Fri',
      dayOfMonth: 20,
      monthShort: 'Nov',
      isToday: true,
      hasWaterTask: true,
      completedEntries: [],
      hasFertilizeHistory: false,
      hasPropagationMilestone: false,
      projectedTasks: [
        {
          dateKey: '2026-11-20',
          plant: samplePlant,
          taskKind: 'water',
          daysFromToday: 0,
          cycleIndex: 0,
          isOverdue: false,
          isDueToday: true,
          actionLabel: 'Due today',
        },
      ],
    };

    await render(
      <DayAgendaCard
        schedule={schedule}
        plantLookup={{ [samplePlant.id]: samplePlant }}
        onCompleteTask={onCompleteTask}
      />
    );

    expect(screen.getByText('Today, Nov 20')).toBeTruthy();
    await fireEvent.press(
      screen.getByLabelText('Mark Watered for Window Jade')
    );
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });
});
