/**
 * FloraLog — Calendar & Care Schedule Projection Engine (`PLAN.md` Section 2)
 * Projects upcoming watering/care duties across a multi-week horizon and maps
 * historical notebook entries to calendar dates for heatmaps and daily agendas.
 */

import { getDaysUntilNextWater } from '@/store/usePlantStore';
import type { CareEventType, NotebookEntry, UserPlant } from '@/types/plant';

export interface ProjectedPlantCareTask {
  plant: UserPlant;
  dateKey: string; // YYYY-MM-DD
  daysFromToday: number;
  isOverdue: boolean;
  isDueToday: boolean;
  actionLabel: string;
  cycleIndex: number; // 0 = next immediate watering, 1+ = subsequent cycle projections
}

export interface DayCareSchedule {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  daysFromToday: number;
  isToday: boolean;
  dayOfWeekShort: string; // 'Mon', 'Tue', etc.
  dayOfMonth: number;
  monthShort: string; // 'Jan', 'Feb', etc.
  fullLabel: string; // 'Today, Nov 8' | 'Tomorrow, Nov 9' | 'Wed, Nov 11'
  projectedTasks: ProjectedPlantCareTask[];
  completedEntries: NotebookEntry[];
  hasWaterTask: boolean;
  hasFertilizeHistory: boolean;
  hasPropagationMilestone: boolean;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
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
 * Formats a Date into local YYYY-MM-DD key.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a new Date set to local midnight (00:00:00.000) for the given Date + offset days.
 */
export function getLocalDayStart(baseDate: Date, offsetDays: number = 0): Date {
  const d = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + offsetDays,
    0,
    0,
    0,
    0
  );
  return d;
}

/**
 * Builds a human-friendly header label for a date relative to today.
 */
export function formatAgendaDayLabel(date: Date, daysFromToday: number): string {
  const dayName = SHORT_DAYS[date.getDay()];
  const monthName = SHORT_MONTHS[date.getMonth()];
  const dayNum = date.getDate();

  if (daysFromToday === 0) {
    return `Today · ${dayName}, ${monthName} ${dayNum}`;
  }
  if (daysFromToday === 1) {
    return `Tomorrow · ${dayName}, ${monthName} ${dayNum}`;
  }
  if (daysFromToday === -1) {
    return `Yesterday · ${dayName}, ${monthName} ${dayNum}`;
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
    ? 'Refresh Water'
    : isSucculent
      ? 'Soak & Dry'
      : 'Water';

  if (isOverdue) {
    return `Overdue · ${verb} Now`;
  }
  if (daysFromToday === 0) {
    return `Due Today for ${verb}`;
  }
  if (daysFromToday === 1) {
    return `${verb} Tomorrow`;
  }
  return `Due in ${daysFromToday} days`;
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
 * Projects watering and care events for the next `rangeDays` (default 30 days).
 * Overdue plants are anchored on Today (day 0) with subsequent cycles projected forward.
 */
export function getProjectedCareEvents(
  plants: UserPlant[],
  entries: NotebookEntry[] = [],
  rangeDays: number = 30
): DayCareSchedule[] {
  const now = new Date();
  const historicalMap = getHistoricalCareEvents(entries);
  const projectedByDateKey: Record<string, ProjectedPlantCareTask[]> = {};

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

      const task: ProjectedPlantCareTask = {
        plant,
        dateKey,
        daysFromToday: offset,
        isOverdue: taskIsOverdue,
        isDueToday: offset === 0,
        actionLabel: getCareActionPillLabel(plant, offset, taskIsOverdue),
        cycleIndex,
      };

      if (!projectedByDateKey[dateKey]) {
        projectedByDateKey[dateKey] = [];
      }
      projectedByDateKey[dateKey].push(task);
      cycleIndex += 1;
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
      dayOfWeekShort: SHORT_DAYS[date.getDay()],
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
 * Returns human-friendly label for a care event type.
 */
export function getCareEventTypeLabel(eventType: CareEventType): string {
  switch (eventType) {
    case 'water':
      return 'Watered';
    case 'fertilize':
      return 'Fertilized';
    case 'repot':
      return 'Repotted';
    case 'prune':
      return 'Pruned';
    case 'propagation':
      return 'Propagation Log';
    case 'ai_scan':
      return 'AI Health Scan';
    case 'note':
    default:
      return 'Garden Note';
  }
}

