import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CareMonthCalendar } from '@/components/calendar/care-month-calendar';
import { DayAgendaCard } from '@/components/calendar/day-agenda-card';
import { UpcomingTimelineCard } from '@/components/calendar/upcoming-timeline-card';
import { AnimatedEntrance } from '@/components/ui/animated-wrappers';
import { Spacing } from '@/constants/theme';
import {
  buildCalendarMonthGrid,
  buildFallbackDaySchedule,
  getHistoricalCareEvents,
  getMonthlyCareSummary,
  getProjectedCareEvents,
  type DayCareSchedule,
  type ProjectedPlantCareTask,
} from '@/services/calendarUtils';
import type { NotebookEntry, UserPlant } from '@/types/plant';

interface CareScheduleViewProps {
  plants: UserPlant[];
  entries: NotebookEntry[];
  onCompleteTask: (task: ProjectedPlantCareTask) => void;
  onWaterAllDueToday?: () => void;
}

/**
 * Coordinates the selected day agenda, upcoming 2-week timeline rail, and month heatmap calendar.
 */
export function CareScheduleView({
  plants,
  entries,
  onCompleteTask,
  onWaterAllDueToday,
}: CareScheduleViewProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const projectionDays = useMemo(
    () => Math.max(62, (monthOffset + 2) * 32),
    [monthOffset]
  );

  const timeline = useMemo(
    () => getProjectedCareEvents(plants, entries, projectionDays),
    [plants, entries, projectionDays]
  );

  const [selectedDateKey, setSelectedDateKey] = useState(
    () => timeline[0]?.dateKey ?? ''
  );

  const historicalMap = useMemo(
    () => getHistoricalCareEvents(entries),
    [entries]
  );

  const timelineByDate = useMemo(() => {
    const map: Record<string, DayCareSchedule> = {};
    for (const day of timeline) {
      map[day.dateKey] = day;
    }
    return map;
  }, [timeline]);

  const calendarMonth = useMemo(
    () => buildCalendarMonthGrid(monthOffset, timelineByDate, historicalMap),
    [monthOffset, timelineByDate, historicalMap]
  );

  const monthlySummary = useMemo(
    () =>
      getMonthlyCareSummary(
        entries,
        calendarMonth.yearNum,
        calendarMonth.monthNum
      ),
    [entries, calendarMonth.yearNum, calendarMonth.monthNum]
  );

  const selectedDaySchedule = useMemo<DayCareSchedule | undefined>(() => {
    const found = timelineByDate[selectedDateKey];
    if (found) return found;
    if (selectedDateKey) {
      const fallback = buildFallbackDaySchedule(selectedDateKey, historicalMap);
      if (fallback) return fallback;
    }
    return timeline[0];
  }, [timelineByDate, selectedDateKey, historicalMap, timeline]);

  const upcomingTimelineDays = useMemo(
    () =>
      timeline
        .slice(0, 14)
        .filter(
          (d) =>
            d.dateKey !== selectedDaySchedule?.dateKey &&
            d.projectedTasks.length > 0
        ),
    [timeline, selectedDaySchedule?.dateKey]
  );

  const upcomingTaskCount = useMemo(
    () =>
      upcomingTimelineDays.reduce(
        (acc, day) => acc + day.projectedTasks.length,
        0
      ),
    [upcomingTimelineDays]
  );

  const plantLookup = useMemo(() => {
    const map: Record<string, UserPlant> = {};
    for (const plant of plants) {
      map[plant.id] = plant;
    }
    return map;
  }, [plants]);

  return (
    <View style={styles.container}>
      {selectedDaySchedule && (
        <AnimatedEntrance
          key={selectedDaySchedule.dateKey}
          index={0}
          animateLayout>
          <DayAgendaCard
            schedule={selectedDaySchedule}
            plantLookup={plantLookup}
            onCompleteTask={onCompleteTask}
            onWaterAllDueToday={onWaterAllDueToday}
          />
        </AnimatedEntrance>
      )}

      <AnimatedEntrance index={1} animateLayout>
        <UpcomingTimelineCard
          upcomingDays={upcomingTimelineDays}
          totalTaskCount={upcomingTaskCount}
          onSelectDate={setSelectedDateKey}
          onCompleteTask={onCompleteTask}
        />
      </AnimatedEntrance>

      <AnimatedEntrance index={2}>
        <CareMonthCalendar
          calendarMonth={calendarMonth}
          monthlySummary={monthlySummary}
          selectedDateKey={selectedDaySchedule?.dateKey}
          onPrevMonth={() => setMonthOffset((m) => m - 1)}
          onNextMonth={() => setMonthOffset((m) => m + 1)}
          onSelectDate={setSelectedDateKey}
        />
      </AnimatedEntrance>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
});
