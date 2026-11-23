/**
 * FloraLog — Calendar & Care Schedule Projection Engine
 * Projects upcoming watering/care duties across a multi-week horizon, builds
 * month calendar grids, and maps historical notebook entries to dates.
 */

import i18n from '@/i18n';
import type { CareEventType, NotebookEntry, UserPlant } from '@/types/plant';
import { DAY_MS, getDaysUntilNextWater, toLocalDateKey } from '@/utils/watering';

export { toLocalDateKey };

export type ProjectedTaskKind = 'water' | 'fertilize' | 'rotate';

export interface ProjectedPlantCareTask {
  plant: UserPlant;
  dateKey: string; // YYYY-MM-DD
  daysFromToday: number;
  isOverdue: boolean;
  isDueToday: boolean;
  actionLabel: string;
  cycleIndex: number; // 0 = next immediate cycle, 1+ = subsequent cycle projections
  taskKind: ProjectedTaskKind;
}

export interface MonthlyCareSummary {
  totalCompleted: number;
  wateringCount: number;
  activeDays: number;
  consistencyPercent: number;
}

export interface DayCareSchedule {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  daysFromToday: number;
  isToday: boolean;
  dayOfWeekShort: string; // 'Mon', 'Tue', etc.
  dayOfMonth: number;
  monthShort: string; // 'Jan', 'Feb', etc.
  fullLabel: string; // 'Today · Nov 8' | 'Tomorrow · Nov 9' | 'Wed, Nov 11'
  projectedTasks: ProjectedPlantCareTask[];
  completedEntries: NotebookEntry[];
  hasWaterTask: boolean;
  hasFertilizeHistory: boolean;
  hasPropagationMilestone: boolean;
}

export type CalendarGridCell =
  | { kind: 'empty'; key: string }
  | {
      kind: 'day';
      key: string;
      dayNum: number;
      dateKey: string;
      isToday: boolean;
      isPast: boolean;
      schedule?: DayCareSchedule;
      completedCount: number;
    };

export interface CalendarMonthGrid {
  monthName: string;
  year: string;
  yearNum: number;
  monthNum: number;
  weeks: CalendarGridCell[][];
}

export const WEEKDAY_LABELS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Returns a new Date set to local midnight (00:00:00.000) for the given Date + offset days.
 */
export function getLocalDayStart(baseDate: Date, offsetDays: number = 0): Date {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + offsetDays,
    0,
    0,
    0,
    0
  );
}

/**
 * Builds a human-friendly header label for a date relative to today.
 */
export function formatAgendaDayLabel(date: Date, daysFromToday: number): string {
  const weekdays = i18n.t('schedule.weekdays', {
    returnObjects: true,
  }) as string[];
  const shortMonths = i18n.t('schedule.shortMonths', {
    returnObjects: true,
  }) as string[];
  const dayName =
    (Array.isArray(weekdays) ? weekdays[date.getDay()] : undefined) ??
    WEEKDAY_LABELS[date.getDay()];
  const monthName =
    (Array.isArray(shortMonths) ? shortMonths[date.getMonth()] : undefined) ??
    SHORT_MONTHS[date.getMonth()];
  const dayNum = date.getDate();

  if (daysFromToday === 0) {
    return `${i18n.t('schedule.today')} · ${dayName}, ${monthName} ${dayNum}`;
  }
  if (daysFromToday === 1) {
    return `${i18n.t('schedule.tomorrow')} · ${dayName}, ${monthName} ${dayNum}`;
  }
  if (daysFromToday === -1) {
    return `${i18n.t('schedule.yesterday')} · ${dayName}, ${monthName} ${dayNum}`;
  }
  return `${dayName}, ${monthName} ${dayNum}`;
}

/**
 * Returns a tailored care action pill label based on species type and due offset.
 */
export function getCareActionPillLabel(
  plant: UserPlant,
  daysFromToday: number,
  isOverdue: boolean
): string {
  const isSucculent = plant.species.plantType === 'succulent';
  const isPropagation = plant.species.plantType === 'propagation';

  const verb = isPropagation
    ? i18n.t('schedule.actionVerb.refreshWater')
    : isSucculent
      ? i18n.t('schedule.actionVerb.soakAndDry')
      : i18n.t('schedule.actionVerb.water');

  if (isOverdue) {
    return i18n.t('schedule.actionPill.overdue', { verb });
  }
  if (daysFromToday === 0) {
    return i18n.t('schedule.actionPill.dueToday', { verb });
  }
  if (daysFromToday === 1) {
    return i18n.t('schedule.actionPill.tomorrow', { verb });
  }
  return i18n.t('schedule.actionPill.dueIn', { count: daysFromToday });
}

/**
 * Maps historical `NotebookEntry[]` onto local `YYYY-MM-DD` date keys.
 */
export function getHistoricalCareEvents(
  entries: NotebookEntry[]
): Record<string, NotebookEntry[]> {
  const map: Record<string, NotebookEntry[]> = {};

  for (const entry of entries) {
    const parsed = new Date(entry.timestamp);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = toLocalDateKey(parsed);
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(entry);
  }

  return map;
}

/**
 * Finds the most recent entry timestamp (ms) matching a predicate, regardless of input order.
 */
function findLatestEntryTimestampMs(
  entries: NotebookEntry[],
  plantId: string,
  eventType: CareEventType
): number | null {
  let latestMs: number | null = null;
  for (const entry of entries) {
    if (entry.plantId !== plantId || entry.eventType !== eventType) continue;
    const ms = new Date(entry.timestamp).getTime();
    if (!Number.isNaN(ms) && (latestMs === null || ms > latestMs)) {
      latestMs = ms;
    }
  }
  return latestMs;
}

/**
 * Projects watering, fertilizing, and rotation events for the next `rangeDays` (default 30 days).
 * Overdue plants are anchored on Today (day 0) with subsequent cycles projected forward.
 */
export function getProjectedCareEvents(
  plants: UserPlant[],
  entries: NotebookEntry[] = [],
  rangeDays: number = 30
): DayCareSchedule[] {
  const now = new Date();
  const todayStartMs = getLocalDayStart(now, 0).getTime();
  const historicalMap = getHistoricalCareEvents(entries);
  const projectedByDateKey: Record<string, ProjectedPlantCareTask[]> = {};

  const pushTask = (task: ProjectedPlantCareTask) => {
    if (!projectedByDateKey[task.dateKey]) {
      projectedByDateKey[task.dateKey] = [];
    }
    projectedByDateKey[task.dateKey].push(task);
  };

  for (const plant of plants) {
    const interval = Math.max(1, plant.customWateringIntervalDays || 7);
    const rawDaysUntil = getDaysUntilNextWater(plant);
    const isOverdue = rawDaysUntil < 0;
    const firstDueOffset = Math.max(0, rawDaysUntil);

    let cycleIndex = 0;
    for (
      let offset = firstDueOffset;
      offset < rangeDays;
      offset += interval
    ) {
      const targetDate = getLocalDayStart(now, offset);
      const dateKey = toLocalDateKey(targetDate);
      const taskIsOverdue = cycleIndex === 0 && isOverdue;

      pushTask({
        plant,
        dateKey,
        daysFromToday: offset,
        isOverdue: taskIsOverdue,
        isDueToday: offset === 0,
        actionLabel: getCareActionPillLabel(plant, offset, taskIsOverdue),
        cycleIndex,
        taskKind: 'water',
      });
      cycleIndex += 1;
    }

    // Optional recurring fertilizing schedule
    if (plant.fertilizeIntervalDays && plant.fertilizeIntervalDays >= 1) {
      const fertInterval = Math.round(plant.fertilizeIntervalDays);
      const lastFertMs = findLatestEntryTimestampMs(entries, plant.id, 'fertilize');
      const anchorMs = lastFertMs ?? new Date(plant.acquiredAt).getTime();
      const daysSince = Math.max(0, Math.floor((todayStartMs - anchorMs) / DAY_MS));
      const rawFertUntil = fertInterval - daysSince;
      const fertOverdue = rawFertUntil < 0;
      const firstFertOffset = Math.max(0, rawFertUntil);

      let fertCycle = 0;
      for (
        let offset = firstFertOffset;
        offset < rangeDays;
        offset += fertInterval
      ) {
        const targetDate = getLocalDayStart(now, offset);
        const dateKey = toLocalDateKey(targetDate);
        const isTaskOverdue = fertCycle === 0 && fertOverdue;
        pushTask({
          plant,
          dateKey,
          daysFromToday: offset,
          isOverdue: isTaskOverdue,
          isDueToday: offset === 0,
          actionLabel: isTaskOverdue
            ? 'Overdue · Fertilize'
            : offset === 0
              ? 'Due Today for Fertilize'
              : offset === 1
                ? 'Fertilize Tomorrow'
                : `Fertilize in ${offset} days`,
          cycleIndex: fertCycle,
          taskKind: 'fertilize',
        });
        fertCycle += 1;
      }
    }

    // Optional recurring pot rotation schedule
    if (plant.rotateIntervalDays && plant.rotateIntervalDays >= 1) {
      const rotInterval = Math.round(plant.rotateIntervalDays);
      const anchorMs = new Date(plant.acquiredAt).getTime();
      const daysSince = Math.max(0, Math.floor((todayStartMs - anchorMs) / DAY_MS));
      const firstRotOffset =
        daysSince === 0
          ? rotInterval
          : (rotInterval - (daysSince % rotInterval)) % rotInterval;

      let rotCycle = 0;
      for (
        let offset = firstRotOffset;
        offset < rangeDays;
        offset += rotInterval
      ) {
        const targetDate = getLocalDayStart(now, offset);
        const dateKey = toLocalDateKey(targetDate);
        pushTask({
          plant,
          dateKey,
          daysFromToday: offset,
          isOverdue: false,
          isDueToday: offset === 0,
          actionLabel:
            offset === 0
              ? 'Rotate Pot Today'
              : offset === 1
                ? 'Rotate Pot Tomorrow'
                : `Rotate Pot in ${offset} days`,
          cycleIndex: rotCycle,
          taskKind: 'rotate',
        });
        rotCycle += 1;
      }
    }
  }

  const timeline: DayCareSchedule[] = [];

  for (let offset = 0; offset < rangeDays; offset += 1) {
    const date = getLocalDayStart(now, offset);
    const dateKey = toLocalDateKey(date);
    const projectedTasks = projectedByDateKey[dateKey] ?? [];
    const completedEntries = historicalMap[dateKey] ?? [];

    const hasWaterTask =
      projectedTasks.length > 0 ||
      completedEntries.some((e) => e.eventType === 'water');
    const hasFertilizeHistory = completedEntries.some(
      (e) => e.eventType === 'fertilize'
    );
    const hasPropagationMilestone =
      projectedTasks.some((t) => t.plant.species.plantType === 'propagation') ||
      completedEntries.some((e) => e.eventType === 'propagation');

    timeline.push({
      dateKey,
      date,
      daysFromToday: offset,
      isToday: offset === 0,
      dayOfWeekShort: WEEKDAY_LABELS[date.getDay()],
      dayOfMonth: date.getDate(),
      monthShort: SHORT_MONTHS[date.getMonth()],
      fullLabel: formatAgendaDayLabel(date, offset),
      projectedTasks,
      completedEntries,
      hasWaterTask,
      hasFertilizeHistory,
      hasPropagationMilestone,
    });
  }

  return timeline;
}

/**
 * Builds a 7-column calendar month grid padded with leading/trailing empty cells.
 */
export function buildCalendarMonthGrid(
  monthOffset: number,
  timelineByDate: Record<string, DayCareSchedule>,
  historicalMap: Record<string, NotebookEntry[]>,
  today: Date = new Date()
): CalendarMonthGrid {
  const viewDate = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1
  );
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toLocalDateKey(today);

  const cells: CalendarGridCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ kind: 'empty', key: `pad-start-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const cellDate = new Date(year, month, d);
    const dateKey = toLocalDateKey(cellDate);
    const schedule = timelineByDate[dateKey];
    const completedCount =
      schedule?.completedEntries.length ?? historicalMap[dateKey]?.length ?? 0;

    cells.push({
      kind: 'day',
      key: dateKey,
      dayNum: d,
      dateKey,
      isToday: dateKey === todayKey,
      isPast: dateKey < todayKey,
      schedule,
      completedCount,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'empty', key: `pad-end-${cells.length}` });
  }

  const weeks: CalendarGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const months = i18n.t('schedule.months', {
    returnObjects: true,
  }) as string[];
  const monthName =
    (Array.isArray(months) ? months[month] : undefined) ?? MONTH_NAMES[month];

  return {
    monthName,
    year: String(year),
    yearNum: year,
    monthNum: month,
    weeks,
  };
}

/**
 * Builds a `DayCareSchedule` for historical or out-of-window calendar dates not present in the projected timeline.
 */
export function buildFallbackDaySchedule(
  dateKey: string,
  historicalMap: Record<string, NotebookEntry[]>,
  today: Date = new Date()
): DayCareSchedule | undefined {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return undefined;

  const dateObj = new Date(y, m - 1, d);
  const todayStart = getLocalDayStart(today, 0);
  const diffDays = Math.round((dateObj.getTime() - todayStart.getTime()) / DAY_MS);
  const completed = historicalMap[dateKey] ?? [];

  return {
    dateKey,
    date: dateObj,
    daysFromToday: diffDays,
    isToday: diffDays === 0,
    dayOfWeekShort: WEEKDAY_LABELS[dateObj.getDay()],
    dayOfMonth: d,
    monthShort: SHORT_MONTHS[m - 1] ?? '',
    fullLabel: formatAgendaDayLabel(dateObj, diffDays),
    projectedTasks: [],
    completedEntries: completed,
    hasWaterTask: completed.some((e) => e.eventType === 'water'),
    hasFertilizeHistory: completed.some((e) => e.eventType === 'fertilize'),
    hasPropagationMilestone: completed.some((e) => e.eventType === 'propagation'),
  };
}

/**
 * Returns human-friendly label for a care event type.
 */
export function getCareEventTypeLabel(eventType: CareEventType): string {
  return i18n.t(`schedule.eventTypes.${eventType}`, {
    defaultValue: i18n.t('schedule.eventTypes.note'),
  });
}

export function getMonthlyCareSummary(
  entries: NotebookEntry[],
  year: number,
  month: number
): MonthlyCareSummary {
  const activeDayKeys = new Set<string>();
  let totalCompleted = 0;
  let wateringCount = 0;

  for (const entry of entries) {
    const d = new Date(entry.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() === year && d.getMonth() === month) {
      totalCompleted += 1;
      if (entry.eventType === 'water') wateringCount += 1;
      activeDayKeys.add(toLocalDateKey(d));
    }
  }

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const elapsedDays = isCurrentMonth
    ? Math.max(1, now.getDate())
    : new Date(year, month + 1, 0).getDate();
  const consistencyPercent = Math.min(
    100,
    Math.round((activeDayKeys.size / elapsedDays) * 100)
  );

  return {
    totalCompleted,
    wateringCount,
    activeDays: activeDayKeys.size,
    consistencyPercent,
  };
}
