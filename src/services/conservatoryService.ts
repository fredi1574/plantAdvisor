/**
 * FloraLog — Derived Conservatory Progression & Herbarium Engine (v1)
 *
 * Pure, deterministic, offline-first computation of botanical ranks,
 * care-rhythm adherence, pressed-leaf seals, and the species herbarium
 * directly from existing `UserPlant`, `NotebookEntry`, and `HealthAssessment`
 * records — zero database schema migrations or mutable XP counters required.
 */

import { PROPAGATION_READY_ROOT_CM } from '@/components/garden/propagation-readiness-bar';
import type {
  HealthAssessment,
  NotebookEntry,
  PlantType,
  UserPlant,
} from '@/types/plant';
import { DAY_MS, getDaysUntilNextWater, toLocalDateKey } from '@/utils/watering';

export type ConservatoryRankId =
  | 'seedling_keeper'
  | 'windowsill_tender'
  | 'propagation_alchemist'
  | 'botanical_chronicler'
  | 'conservatory_curator';

export type BotanicalSealId =
  | 'first_roots'
  | 'family_collector'
  | 'garden_harmony'
  | 'dry_back_discipline'
  | 'chronicle_keeper'
  | 'root_whisperer'
  | 'plant_medic'
  | 'comeback_story';

export type SealCategory = 'collection' | 'care' | 'journal';
export type SealTone = 'sage' | 'terracotta' | 'water';

export interface ConservatoryRankDefinition {
  id: ConservatoryRankId;
  tier: number;
  minScore: number;
}

export const CONSERVATORY_RANKS: readonly ConservatoryRankDefinition[] = [
  { id: 'seedling_keeper', tier: 1, minScore: 0 },
  { id: 'windowsill_tender', tier: 2, minScore: 80 },
  { id: 'propagation_alchemist', tier: 3, minScore: 220 },
  { id: 'botanical_chronicler', tier: 4, minScore: 450 },
  { id: 'conservatory_curator', tier: 5, minScore: 800 },
] as const;

export const ALL_PLANT_TYPES: readonly PlantType[] = [
  'succulent',
  'foliage',
  'propagation',
  'flowering',
] as const;

export interface ConservatoryRankProgress {
  id: ConservatoryRankId;
  tier: number;
  score: number;
  minScore: number;
  nextRankId: ConservatoryRankId | null;
  nextScore: number | null;
  progress: number; // 0..1
  pointsToNext: number;
}

export interface BotanicalSeal {
  id: BotanicalSealId;
  category: SealCategory;
  tone: SealTone;
  current: number;
  target: number;
  progress: number; // 0..1
  unlocked: boolean;
}

export interface CareRhythmSummary {
  /** Consecutive calendar weeks with at least one care or observation entry. */
  rhythmWeeks: number;
  /** Number of plants currently on or ahead of schedule (not overdue). */
  onScheduleCount: number;
  /** Number of plants currently overdue for watering. */
  overdueCount: number;
  /** Percentage (0-100) of plants currently on schedule. */
  harmonyPercent: number;
  /** Distinct active care days in the current local month. */
  monthlyActiveDays: number;
  /** Distinct plants with a latest assessment of `thriving`. */
  thrivingCount: number;
}

export interface HerbariumPlate {
  key: string;
  commonName: string;
  scientificName: string;
  family: string;
  plantType: PlantType;
  specimenCount: number;
  photoUri: string;
  oldestAcquiredAt: string;
  ageDays: number;
  isThriving: boolean;
}

export interface HerbariumSummary {
  plates: HerbariumPlate[];
  distinctFamilies: string[];
  plantTypesCovered: PlantType[];
  oldestPlantDays: number;
}

export interface ConservatorySnapshot {
  rank: ConservatoryRankProgress;
  rhythm: CareRhythmSummary;
  seals: BotanicalSeal[];
  unlockedSealCount: number;
  herbarium: HerbariumSummary;
}

export interface ConservatoryMilestoneEvent {
  kind: 'rank' | 'seal';
  id: ConservatoryRankId | BotanicalSealId;
}

/**
 * Normalizes a Date to the local Monday 00:00:00 start of its calendar week.
 */
function getLocalWeekStart(date: Date): Date {
  const day = date.getDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (day + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  );
}

/**
 * Counts consecutive calendar weeks (ending on this week or last week so
 * Monday mornings don't break rhythm) with at least one logged entry.
 */
export function computeCareRhythmWeeks(
  entries: NotebookEntry[],
  now: Date = new Date()
): number {
  const activeWeeks = new Set<string>();
  for (const entry of entries) {
    const parsed = new Date(entry.timestamp);
    if (Number.isNaN(parsed.getTime())) continue;
    activeWeeks.add(toLocalDateKey(getLocalWeekStart(parsed)));
  }

  if (activeWeeks.size === 0) return 0;

  const currentWeekStart = getLocalWeekStart(now);
  const currentKey = toLocalDateKey(currentWeekStart);

  const cursor = new Date(currentWeekStart.getTime());
  if (!activeWeeks.has(currentKey)) {
    cursor.setDate(cursor.getDate() - 7);
    if (!activeWeeks.has(toLocalDateKey(cursor))) {
      return 0;
    }
  }

  let weeks = 0;
  while (activeWeeks.has(toLocalDateKey(cursor))) {
    weeks += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return weeks;
}

/**
 * Deduplicates assessments across `healthAssessments` and each plant's
 * `latestHealthAssessment`, preferring `latestHealthAssessment` when IDs match
 * so toggled action checkboxes are always reflected.
 */
function collectAllAssessments(
  plants: UserPlant[],
  healthAssessments: HealthAssessment[]
): HealthAssessment[] {
  const byId = new Map<string, HealthAssessment>();
  for (const ha of healthAssessments) {
    byId.set(ha.id, ha);
  }
  for (const plant of plants) {
    if (plant.latestHealthAssessment) {
      byId.set(plant.latestHealthAssessment.id, plant.latestHealthAssessment);
    }
  }
  return Array.from(byId.values());
}

/**
 * Counts mindful succulent soak-and-dry waterings:
 * - First recorded watering for a succulent counts if `soilMoisture === 'bone_dry'`.
 * - Subsequent waterings count when spaced at least `minimumDryBackDays` (default 12)
 *   apart from the previous watering, preventing overwatering from earning credit.
 */
function countMindfulSucculentWaterings(
  plants: UserPlant[],
  entries: NotebookEntry[]
): number {
  const succulentById = new Map<string, UserPlant>();
  for (const plant of plants) {
    if (
      plant.species.plantType === 'succulent' ||
      plant.species.baselineCare.succulentGuardrails?.isSucculentOrCactus
    ) {
      succulentById.set(plant.id, plant);
    }
  }

  if (succulentById.size === 0) return 0;

  const wateringsByPlant = new Map<string, NotebookEntry[]>();
  for (const entry of entries) {
    if (entry.eventType !== 'water') continue;
    if (!succulentById.has(entry.plantId)) continue;
    const ms = new Date(entry.timestamp).getTime();
    if (Number.isNaN(ms)) continue;
    const list = wateringsByPlant.get(entry.plantId) ?? [];
    list.push(entry);
    wateringsByPlant.set(entry.plantId, list);
  }

  let disciplinedCount = 0;
  for (const [plantId, list] of wateringsByPlant.entries()) {
    const plant = succulentById.get(plantId);
    if (!plant) continue;
    const minDryBack = Math.max(
      10,
      plant.species.baselineCare.succulentGuardrails?.minimumDryBackDays || 12
    );

    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let prevMs: number | null = null;
    for (const entry of sorted) {
      const ts = new Date(entry.timestamp).getTime();
      if (prevMs === null) {
        if (entry.metrics?.soilMoisture === 'bone_dry') {
          disciplinedCount += 1;
        }
      } else {
        const gapDays = (ts - prevMs) / DAY_MS;
        if (gapDays >= minDryBack) {
          disciplinedCount += 1;
        }
      }
      prevMs = ts;
    }
  }

  return disciplinedCount;
}

/**
 * Counts distinct plants that reached propagation readiness (>= 5 cm roots)
 * or graduated from propagation into soil.
 */
function countRootWhispererMilestones(entries: NotebookEntry[]): number {
  const qualifiedPlantIds = new Set<string>();
  const plantsWithPropLogs = new Set<string>();
  const plantsWithRepotLogs = new Set<string>();

  for (const entry of entries) {
    if (
      typeof entry.metrics?.rootLengthCm === 'number' &&
      !Number.isNaN(entry.metrics.rootLengthCm) &&
      entry.metrics.rootLengthCm >= PROPAGATION_READY_ROOT_CM
    ) {
      qualifiedPlantIds.add(entry.plantId);
    }
    if (entry.id.startsWith('log-grad')) {
      qualifiedPlantIds.add(entry.plantId);
    }
    if (entry.eventType === 'propagation') {
      plantsWithPropLogs.add(entry.plantId);
    }
    if (entry.eventType === 'repot') {
      plantsWithRepotLogs.add(entry.plantId);
    }
  }

  for (const plantId of plantsWithPropLogs) {
    if (plantsWithRepotLogs.has(plantId)) {
      qualifiedPlantIds.add(plantId);
    }
  }

  return qualifiedPlantIds.size;
}

/**
 * Counts distinct plants that recovered from `critical` or `needs_attention`
 * to `thriving` across chronologically ordered health assessments.
 */
function countPlantRevivals(assessments: HealthAssessment[]): number {
  const byPlant = new Map<string, HealthAssessment[]>();
  for (const ha of assessments) {
    const ms = new Date(ha.createdAt).getTime();
    if (Number.isNaN(ms)) continue;
    const list = byPlant.get(ha.plantId) ?? [];
    list.push(ha);
    byPlant.set(ha.plantId, list);
  }

  let revivals = 0;
  for (const list of byPlant.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let sawDistress = false;
    let recovered = false;
    for (const ha of sorted) {
      if (ha.healthStatus === 'critical' || ha.healthStatus === 'needs_attention') {
        sawDistress = true;
      } else if (ha.healthStatus === 'thriving' && sawDistress) {
        recovered = true;
      }
    }
    if (recovered) {
      revivals += 1;
    }
  }

  return revivals;
}

function buildHerbarium(plants: UserPlant[], nowMs: number): HerbariumSummary {
  const plateMap = new Map<string, HerbariumPlate>();
  const familySet = new Set<string>();
  const typeSet = new Set<PlantType>();
  let oldestPlantDays = 0;

  for (const plant of plants) {
    const sci = plant.species.scientificName.trim();
    const common = plant.species.commonName.trim();
    const family = plant.species.family.trim();
    const key = (sci || common || plant.id).toLowerCase();

    if (family) {
      familySet.add(family);
    }
    typeSet.add(plant.species.plantType);

    const acquiredMs = new Date(plant.acquiredAt).getTime();
    const ageDays = Number.isNaN(acquiredMs)
      ? 0
      : Math.max(0, Math.floor((nowMs - acquiredMs) / DAY_MS));
    if (ageDays > oldestPlantDays) {
      oldestPlantDays = ageDays;
    }

    const isThriving = plant.latestHealthAssessment?.healthStatus === 'thriving';
    const existing = plateMap.get(key);
    if (!existing) {
      plateMap.set(key, {
        key,
        commonName: common || plant.nickname,
        scientificName: sci || common || plant.nickname,
        family: family || 'Botanical',
        plantType: plant.species.plantType,
        specimenCount: 1,
        photoUri: plant.photoUri,
        oldestAcquiredAt: plant.acquiredAt,
        ageDays,
        isThriving,
      });
    } else {
      existing.specimenCount += 1;
      if (ageDays > existing.ageDays) {
        existing.ageDays = ageDays;
        existing.oldestAcquiredAt = plant.acquiredAt;
      }
      if (isThriving) {
        existing.isThriving = true;
      }
    }
  }

  const plates = Array.from(plateMap.values()).sort((a, b) =>
    a.scientificName.localeCompare(b.scientificName)
  );

  return {
    plates,
    distinctFamilies: Array.from(familySet).sort((a, b) => a.localeCompare(b)),
    plantTypesCovered: ALL_PLANT_TYPES.filter((t) => typeSet.has(t)),
    oldestPlantDays,
  };
}

function resolveRank(score: number): ConservatoryRankProgress {
  let current = CONSERVATORY_RANKS[0];
  let next: ConservatoryRankDefinition | null = CONSERVATORY_RANKS[1] ?? null;

  for (let i = 0; i < CONSERVATORY_RANKS.length; i += 1) {
    if (score >= CONSERVATORY_RANKS[i].minScore) {
      current = CONSERVATORY_RANKS[i];
      next = CONSERVATORY_RANKS[i + 1] ?? null;
    }
  }

  if (!next) {
    return {
      id: current.id,
      tier: current.tier,
      score,
      minScore: current.minScore,
      nextRankId: null,
      nextScore: null,
      progress: 1,
      pointsToNext: 0,
    };
  }

  const span = Math.max(1, next.minScore - current.minScore);
  const progress = Math.min(1, Math.max(0, (score - current.minScore) / span));

  return {
    id: current.id,
    tier: current.tier,
    score,
    minScore: current.minScore,
    nextRankId: next.id,
    nextScore: next.minScore,
    progress,
    pointsToNext: Math.max(0, next.minScore - score),
  };
}

/**
 * Purely derives the complete Conservatory profile (rank, care rhythm,
 * pressed-leaf seals, and species herbarium) from current garden state.
 */
export function computeConservatorySnapshot(
  plants: UserPlant[],
  entries: NotebookEntry[],
  healthAssessments: HealthAssessment[] = [],
  now: Date = new Date()
): ConservatorySnapshot {
  const nowMs = now.getTime();
  const herbarium = buildHerbarium(plants, nowMs);
  const allAssessments = collectAllAssessments(plants, healthAssessments);

  // Care rhythm & schedule harmony
  let onScheduleCount = 0;
  let overdueCount = 0;
  let thrivingCount = 0;
  for (const plant of plants) {
    const daysUntil = getDaysUntilNextWater(plant, nowMs);
    if (daysUntil < 0) {
      overdueCount += 1;
    } else {
      onScheduleCount += 1;
    }
    if (plant.latestHealthAssessment?.healthStatus === 'thriving') {
      thrivingCount += 1;
    }
  }

  const harmonyPercent =
    plants.length === 0
      ? 100
      : Math.round((onScheduleCount / plants.length) * 100);

  const activeDayKeys = new Set<string>();
  const monthlyActiveDayKeys = new Set<string>();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let photoEntryCount = 0;
  let measuredEntryCount = 0;
  let richJournalEntryCount = 0;

  for (const entry of entries) {
    const parsed = new Date(entry.timestamp);
    if (!Number.isNaN(parsed.getTime())) {
      const key = toLocalDateKey(parsed);
      activeDayKeys.add(key);
      if (
        parsed.getFullYear() === currentYear &&
        parsed.getMonth() === currentMonth
      ) {
        monthlyActiveDayKeys.add(key);
      }
    }

    const hasPhoto = Boolean(entry.photoUri);
    const hasGrowthMetric =
      typeof entry.metrics?.rootLengthCm === 'number' ||
      typeof entry.metrics?.stemHeightCm === 'number' ||
      typeof entry.metrics?.leafCount === 'number';

    if (hasPhoto) photoEntryCount += 1;
    if (hasGrowthMetric) measuredEntryCount += 1;
    if (hasPhoto || hasGrowthMetric) richJournalEntryCount += 1;
  }

  const rhythmWeeks = computeCareRhythmWeeks(entries, now);
  const mindfulSucculentWaterings = countMindfulSucculentWaterings(
    plants,
    entries
  );
  const rootMilestones = countRootWhispererMilestones(entries);
  const revivals = countPlantRevivals(allAssessments);

  let completedActionsCount = 0;
  for (const ha of allAssessments) {
    for (const act of ha.recommendedActions) {
      if (act.completed) completedActionsCount += 1;
    }
  }

  const makeSeal = (
    id: BotanicalSealId,
    category: SealCategory,
    tone: SealTone,
    current: number,
    target: number,
    unlockedOverride?: boolean
  ): BotanicalSeal => {
    const clampedCurrent = Math.max(0, current);
    const unlocked = unlockedOverride ?? clampedCurrent >= target;
    return {
      id,
      category,
      tone,
      current: clampedCurrent,
      target,
      progress: unlocked ? 1 : Math.min(1, clampedCurrent / Math.max(1, target)),
      unlocked,
    };
  };

  const harmonyTarget = Math.max(3, plants.length);
  const harmonyUnlocked = plants.length >= 3 && overdueCount === 0;

  const seals: BotanicalSeal[] = [
    makeSeal('first_roots', 'collection', 'sage', plants.length, 3),
    makeSeal(
      'family_collector',
      'collection',
      'terracotta',
      herbarium.distinctFamilies.length,
      3
    ),
    makeSeal(
      'garden_harmony',
      'care',
      'water',
      onScheduleCount,
      harmonyTarget,
      harmonyUnlocked
    ),
    makeSeal(
      'dry_back_discipline',
      'care',
      'terracotta',
      mindfulSucculentWaterings,
      3
    ),
    makeSeal('chronicle_keeper', 'journal', 'sage', richJournalEntryCount, 5),
    makeSeal('root_whisperer', 'journal', 'terracotta', rootMilestones, 1),
    makeSeal('plant_medic', 'care', 'sage', completedActionsCount, 3),
    makeSeal('comeback_story', 'journal', 'water', revivals, 1),
  ];

  const unlockedSealCount = seals.filter((s) => s.unlocked).length;

  // Balanced, anti-spam botanical stewardship score:
  // Rewards specimen variety, unique active days (not tap spamming), on-schedule care,
  // mindful journaling/measurements, completed care actions, and earned seals.
  const stewardshipScore =
    plants.length * 20 +
    herbarium.distinctFamilies.length * 25 +
    herbarium.plantTypesCovered.length * 15 +
    activeDayKeys.size * 10 +
    onScheduleCount * 15 +
    mindfulSucculentWaterings * 20 +
    photoEntryCount * 12 +
    measuredEntryCount * 10 +
    completedActionsCount * 15 +
    revivals * 40 +
    unlockedSealCount * 35;

  const rank = resolveRank(stewardshipScore);

  return {
    rank,
    rhythm: {
      rhythmWeeks,
      onScheduleCount,
      overdueCount,
      harmonyPercent,
      monthlyActiveDays: monthlyActiveDayKeys.size,
      thrivingCount,
    },
    seals,
    unlockedSealCount,
    herbarium,
  };
}

/**
 * Compares a previous and next Conservatory snapshot to identify newly earned
 * rank promotions or botanical seals suitable for a subtle celebration toast.
 */
export function detectNewConservatoryMilestones(
  previous: ConservatorySnapshot,
  next: ConservatorySnapshot
): ConservatoryMilestoneEvent[] {
  const events: ConservatoryMilestoneEvent[] = [];

  if (next.rank.tier > previous.rank.tier) {
    events.push({ kind: 'rank', id: next.rank.id });
  }

  const prevUnlocked = new Set(
    previous.seals.filter((s) => s.unlocked).map((s) => s.id)
  );
  for (const seal of next.seals) {
    if (seal.unlocked && !prevUnlocked.has(seal.id)) {
      events.push({ kind: 'seal', id: seal.id });
    }
  }

  return events;
}
