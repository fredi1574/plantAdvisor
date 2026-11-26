import { useMemo } from 'react';

import type {
  GardenFilterMode,
  GardenSortMode,
  GardenStats,
} from '@/components/garden/garden-controls-card';
import {
  getLatestRootLengthCm,
  PROPAGATION_READY_ROOT_CM,
} from '@/components/garden/propagation-readiness-bar';
import {
  doesPlantNeedWatering,
  getDaysUntilNextWater,
} from '@/store/usePlantStore';
import type { HealthStatus, NotebookEntry, UserPlant } from '@/types/plant';

export type GardenViewMode = 'list' | 'grid';

export interface GardenLocationGroupItem {
  location: string;
  items: UserPlant[];
}

export type GardenFeedItem =
  | { kind: 'plant'; plant: UserPlant }
  | { kind: 'location_group'; location: string; items: UserPlant[] };

const HEALTH_PRIORITY: Record<HealthStatus, number> = {
  critical: 0,
  needs_attention: 1,
  thriving: 2,
};

export function computeGardenStats(plants: UserPlant[]): GardenStats {
  let needsWaterCount = 0;
  let needsAttentionCount = 0;
  let succulentCount = 0;
  let propagationCount = 0;
  let foliageCount = 0;
  let floweringCount = 0;

  for (const plant of plants) {
    if (doesPlantNeedWatering(plant)) needsWaterCount += 1;
    const health = plant.latestHealthAssessment?.healthStatus;
    if (health === 'needs_attention' || health === 'critical') {
      needsAttentionCount += 1;
    }
    if (plant.species.plantType === 'succulent') succulentCount += 1;
    else if (plant.species.plantType === 'propagation') propagationCount += 1;
    else if (plant.species.plantType === 'foliage') foliageCount += 1;
    else if (plant.species.plantType === 'flowering') floweringCount += 1;
  }

  return {
    total: plants.length,
    needsWaterCount,
    needsAttentionCount,
    succulentCount,
    propagationCount,
    foliageCount,
    floweringCount,
  };
}

export function filterAndSortPlants(
  plants: UserPlant[],
  options: {
    filter: GardenFilterMode;
    searchQuery: string;
    sortBy: GardenSortMode;
  }
): UserPlant[] {
  const { filter, searchQuery, sortBy } = options;
  const q = searchQuery.trim().toLowerCase();

  const list = plants.filter((plant) => {
    if (q) {
      const matchesQuery =
        plant.nickname.toLowerCase().includes(q) ||
        plant.species.commonName.toLowerCase().includes(q) ||
        plant.species.scientificName.toLowerCase().includes(q) ||
        plant.location.toLowerCase().includes(q);
      if (!matchesQuery) return false;
    }
    if (filter === 'needs_water') return doesPlantNeedWatering(plant);
    if (filter === 'needs_attention') {
      const status = plant.latestHealthAssessment?.healthStatus;
      return status === 'needs_attention' || status === 'critical';
    }
    if (filter !== 'all') {
      return plant.species.plantType === filter;
    }
    return true;
  });

  return [...list].sort((a, b) => {
    if (sortBy === 'needs_water') {
      return getDaysUntilNextWater(a) - getDaysUntilNextWater(b);
    }
    if (sortBy === 'health') {
      const pa = a.latestHealthAssessment
        ? HEALTH_PRIORITY[a.latestHealthAssessment.healthStatus]
        : 3;
      const pb = b.latestHealthAssessment
        ? HEALTH_PRIORITY[b.latestHealthAssessment.healthStatus]
        : 3;
      if (pa !== pb) return pa - pb;
      return getDaysUntilNextWater(a) - getDaysUntilNextWater(b);
    }
    if (sortBy === 'alpha') {
      return a.nickname.localeCompare(b.nickname);
    }
    return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
  });
}

export function groupPlantsByLocation(
  plants: UserPlant[]
): GardenLocationGroupItem[] {
  const map = new Map<string, UserPlant[]>();
  for (const plant of plants) {
    const loc = plant.location.trim() || 'Unspecified Spot';
    const existing = map.get(loc);
    if (existing) {
      existing.push(plant);
    } else {
      map.set(loc, [plant]);
    }
  }
  return Array.from(map.entries()).map(([location, items]) => ({
    location,
    items,
  }));
}

export function buildGardenFeedData(
  totalPlantsCount: number,
  filteredPlants: UserPlant[],
  groupByLocation: boolean
): GardenFeedItem[] {
  if (totalPlantsCount === 0 || filteredPlants.length === 0) return [];
  if (groupByLocation) {
    return groupPlantsByLocation(filteredPlants).map((group) => ({
      kind: 'location_group',
      location: group.location,
      items: group.items,
    }));
  }
  return filteredPlants.map((plant) => ({ kind: 'plant', plant }));
}

export function buildLatestRootLengthMap(
  plants: UserPlant[],
  entries: NotebookEntry[],
  isPropagationBench: boolean
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  if (!isPropagationBench) return map;
  for (const plant of plants) {
    if (plant.species.plantType === 'propagation') {
      map.set(plant.id, getLatestRootLengthCm(entries, plant.id));
    }
  }
  return map;
}

export function countPropagationReady(
  latestRootLengthByPlantId: Map<string, number | null>,
  isPropagationBench: boolean
): number {
  if (!isPropagationBench) return 0;
  let ready = 0;
  for (const rootCm of latestRootLengthByPlantId.values()) {
    if (rootCm !== null && rootCm >= PROPAGATION_READY_ROOT_CM) {
      ready += 1;
    }
  }
  return ready;
}

export interface UseGardenFeedParams {
  plants: UserPlant[];
  entries: NotebookEntry[];
  filter: GardenFilterMode;
  searchQuery: string;
  sortBy: GardenSortMode;
  groupByLocation: boolean;
  viewMode: GardenViewMode;
}

export function useGardenFeed({
  plants,
  entries,
  filter,
  searchQuery,
  sortBy,
  groupByLocation,
  viewMode,
}: UseGardenFeedParams) {
  const isPropagationBench = filter === 'propagation';

  const stats = useMemo(() => computeGardenStats(plants), [plants]);

  const latestRootLengthByPlantId = useMemo(
    () => buildLatestRootLengthMap(plants, entries, isPropagationBench),
    [entries, isPropagationBench, plants]
  );

  const propagationReadyCount = useMemo(
    () => countPropagationReady(latestRootLengthByPlantId, isPropagationBench),
    [isPropagationBench, latestRootLengthByPlantId]
  );

  const filteredPlants = useMemo(
    () => filterAndSortPlants(plants, { filter, searchQuery, sortBy }),
    [plants, filter, searchQuery, sortBy]
  );

  const feedData = useMemo(
    () => buildGardenFeedData(plants.length, filteredPlants, groupByLocation),
    [plants.length, filteredPlants, groupByLocation]
  );

  const numColumns = !groupByLocation && viewMode === 'grid' ? 2 : 1;

  return {
    stats,
    filteredPlants,
    feedData,
    isPropagationBench,
    latestRootLengthByPlantId,
    propagationReadyCount,
    numColumns,
  };
}
