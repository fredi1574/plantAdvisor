import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CareMonthCalendar } from '@/components/calendar/care-month-calendar';
import { DayAgendaCard } from '@/components/calendar/day-agenda-card';
import { AnimatedEntrance } from '@/components/ui/animated-wrappers';
import { Spacing } from '@/constants/theme';
import {
  buildCalendarMonthGrid,
  buildFallbackDaySchedule,
  getHistoricalCareEvents,
  getProjectedCareEvents,
  type DayCareSchedule,
  type ProjectedPlantCareTask,
} from '@/services/calendarUtils';
import type { NotebookEntry, UserPlant } from '@/types/plant';

interface CareScheduleViewProps {
  plants: UserPlant[];
  entries: NotebookEntry[];
  onCompleteTask: (task: ProjectedPlantCareTask) => void;
  onSnoozeTask?: (task: ProjectedPlantCareTask) => void;
  onWaterAllDueToday?: () => void;
}

/**
 * Coordinates the selected day agenda and month heatmap calendar.
 */
export function CareScheduleView({
  plants,
  entries,
  onCompleteTask,
  onSnoozeTask,
  onWaterAllDueToday,
}: CareScheduleViewProps) {
  const { i18n } = useTranslation();
  const [monthOffset, setMonthOffset] = useState(0);

  const projectionDays = useMemo(
    () => Math.max(62, (monthOffset + 2) * 32),
    [monthOffset]
  );

  const timeline = useMemo(
    () => getProjectedCareEvents(plants, entries, projectionDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plants, entries, projectionDays, i18n.language]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthOffset, timelineByDate, historicalMap, i18n.language]
  );

  const selectedDaySchedule = useMemo<DayCareSchedule | undefined>(() => {
    const found = timelineByDate[selectedDateKey];
    if (found) return found;
    if (selectedDateKey) {
      const fallback = buildFallbackDaySchedule(selectedDateKey, historicalMap);
      if (fallback) return fallback;
    }
    return timeline[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineByDate, selectedDateKey, historicalMap, timeline, i18n.language]);

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
            onSnoozeTask={onSnoozeTask}
            onWaterAllDueToday={onWaterAllDueToday}
          />
        </AnimatedEntrance>
      )}

      <AnimatedEntrance index={1}>
        <CareMonthCalendar
          calendarMonth={calendarMonth}
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
