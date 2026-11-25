import i18n from '@/i18n';
import type { UserPlant } from '@/types/plant';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Formats a Date into a local YYYY-MM-DD date key.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes signed days remaining until the plant's next watering due date.
 * Values <= 0 indicate due today (0) or overdue (< 0).
 */
export function getDaysUntilNextWater(
  plant: Pick<UserPlant, 'lastWateredAt' | 'customWateringIntervalDays'>,
  nowMs: number = Date.now()
): number {
  const lastWateredMs = new Date(plant.lastWateredAt).getTime();
  const nextDueMs = lastWateredMs + plant.customWateringIntervalDays * DAY_MS;
  return Math.ceil((nextDueMs - nowMs) / DAY_MS);
}

/**
 * Returns true if the plant is due for watering today or overdue.
 */
export function doesPlantNeedWatering(
  plant: Pick<UserPlant, 'lastWateredAt' | 'customWateringIntervalDays'>,
  nowMs: number = Date.now()
): boolean {
  return getDaysUntilNextWater(plant, nowMs) <= 0;
}

export interface DefaultWateringCopy {
  title: string;
  notes: string;
  soilMoisture: 'bone_dry' | 'slightly_damp';
}

/**
 * Builds species-appropriate default watering log title, notes, and soil moisture.
 */
export function buildDefaultWateringCopy(
  plant: UserPlant,
  notePrefix?: string
): DefaultWateringCopy {
  const isPropagation = plant.species.plantType === 'propagation';
  const isSucculent = plant.species.plantType === 'succulent';

  const title = isPropagation
    ? i18n.t('careLogDefaults.waterPropTitle')
    : isSucculent
      ? i18n.t('careLogDefaults.waterSucculentTitle')
      : i18n.t('careLogDefaults.waterDefaultTitle');

  const baseNote = isPropagation
    ? i18n.t('careLogDefaults.waterPropNotes')
    : isSucculent
      ? i18n.t('careLogDefaults.waterSucculentNotes')
      : i18n.t('careLogDefaults.waterDefaultNotes');

  return {
    title,
    notes: notePrefix ? `${notePrefix}${baseNote}` : baseNote,
    soilMoisture: isSucculent ? 'bone_dry' : 'slightly_damp',
  };
}
