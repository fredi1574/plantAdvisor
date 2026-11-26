import {
  buildGardenFeedData,
  buildLatestRootLengthMap,
  computeGardenStats,
  countPropagationReady,
  filterAndSortPlants,
  groupPlantsByLocation,
} from '@/hooks/use-garden-feed';
import type { NotebookEntry, UserPlant } from '@/types/plant';

const DAY_MS = 24 * 60 * 60 * 1000;

function makePlant(overrides: Partial<UserPlant> & { id: string }): UserPlant {
  const now = Date.now();
  return {
    nickname: `Plant ${overrides.id}`,
    species: {
      id: `sp-${overrides.id}`,
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
          rotWarningNote: 'Let dry completely.',
        },
      },
    },
    location: 'South Window',
    isIndoor: true,
    lightExposure: 'bright_direct',
    hasDrainageHole: true,
    potMaterial: 'terracotta',
    photoUri: 'https://example.com/plant.jpg',
    acquiredAt: new Date(now - 30 * DAY_MS).toISOString(),
    lastWateredAt: new Date(now - 2 * DAY_MS).toISOString(),
    customWateringIntervalDays: 10,
    ...overrides,
  };
}

describe('useGardenFeed pure helpers', () => {
  const now = Date.now();

  const thirstySucculent = makePlant({
    id: 'p-1',
    nickname: 'Zebra Jade',
    location: 'South Window',
    acquiredAt: new Date(now - 60 * DAY_MS).toISOString(),
    lastWateredAt: new Date(now - 15 * DAY_MS).toISOString(),
    customWateringIntervalDays: 10,
    latestHealthAssessment: {
      id: 'ha-1',
      plantId: 'p-1',
      createdAt: new Date(now - DAY_MS).toISOString(),
      healthStatus: 'critical',
      detectedSymptoms: ['Soft stem'],
      diagnosisSummary: 'Overwatered',
      followUpQuestions: [],
      recommendedActions: [],
      adjustedWateringIntervalDays: 14,
    },
  });

  const thrivingFoliage = makePlant({
    id: 'p-2',
    nickname: 'Alba Monstera',
    location: 'Living Room',
    acquiredAt: new Date(now - 5 * DAY_MS).toISOString(),
    lastWateredAt: new Date(now - 1 * DAY_MS).toISOString(),
    customWateringIntervalDays: 7,
    species: {
      ...thirstySucculent.species,
      id: 'sp-2',
      commonName: 'Swiss Cheese Plant',
      scientificName: 'Monstera deliciosa',
      plantType: 'foliage',
    },
    latestHealthAssessment: {
      id: 'ha-2',
      plantId: 'p-2',
      createdAt: new Date(now - DAY_MS).toISOString(),
      healthStatus: 'thriving',
      detectedSymptoms: [],
      diagnosisSummary: 'Healthy',
      followUpQuestions: [],
      recommendedActions: [],
      adjustedWateringIntervalDays: 7,
    },
  });

  const propCutting = makePlant({
    id: 'p-3',
    nickname: 'Pothos Cutting',
    location: '   ',
    acquiredAt: new Date(now - 15 * DAY_MS).toISOString(),
    lastWateredAt: new Date(now - 2 * DAY_MS).toISOString(),
    customWateringIntervalDays: 5,
    species: {
      ...thirstySucculent.species,
      id: 'sp-3',
      commonName: 'Golden Pothos',
      scientificName: 'Epipremnum aureum',
      plantType: 'propagation',
    },
    latestHealthAssessment: {
      id: 'ha-3',
      plantId: 'p-3',
      createdAt: new Date(now - DAY_MS).toISOString(),
      healthStatus: 'needs_attention',
      detectedSymptoms: ['Pale leaf'],
      diagnosisSummary: 'Low light',
      followUpQuestions: [],
      recommendedActions: [],
      adjustedWateringIntervalDays: 5,
    },
  });

  const floweringOrchid = makePlant({
    id: 'p-4',
    nickname: 'Moth Orchid',
    location: 'South Window',
    acquiredAt: new Date(now - 40 * DAY_MS).toISOString(),
    lastWateredAt: new Date(now - 1 * DAY_MS).toISOString(),
    customWateringIntervalDays: 9,
    species: {
      ...thirstySucculent.species,
      commonName: 'Phalaenopsis',
      scientificName: 'Phalaenopsis amabilis',
      plantType: 'flowering',
    },
  });

  const allPlants = [
    thirstySucculent,
    thrivingFoliage,
    propCutting,
    floweringOrchid,
  ];

  it('computes accurate garden stats across water, health, and plant types', () => {
    const stats = computeGardenStats(allPlants);
    expect(stats).toEqual({
      total: 4,
      needsWaterCount: 1,
      needsAttentionCount: 2,
      succulentCount: 1,
      propagationCount: 1,
      foliageCount: 1,
      floweringCount: 1,
    });
  });

  it('filters by search query across nickname, commonName, scientificName, and location', () => {
    expect(
      filterAndSortPlants(allPlants, {
        filter: 'all',
        searchQuery: 'epipremnum',
        sortBy: 'alpha',
      }).map((p) => p.id)
    ).toEqual(['p-3']);

    expect(
      filterAndSortPlants(allPlants, {
        filter: 'all',
        searchQuery: 'living room',
        sortBy: 'alpha',
      }).map((p) => p.id)
    ).toEqual(['p-2']);
  });

  it('filters by care urgency, health attention, and botanical type', () => {
    expect(
      filterAndSortPlants(allPlants, {
        filter: 'needs_water',
        searchQuery: '',
        sortBy: 'needs_water',
      }).map((p) => p.id)
    ).toEqual(['p-1']);

    expect(
      filterAndSortPlants(allPlants, {
        filter: 'needs_attention',
        searchQuery: '',
        sortBy: 'health',
      }).map((p) => p.id)
    ).toEqual(['p-1', 'p-3']);

    expect(
      filterAndSortPlants(allPlants, {
        filter: 'propagation',
        searchQuery: '',
        sortBy: 'alpha',
      }).map((p) => p.id)
    ).toEqual(['p-3']);
  });

  it('sorts plants by needs_water, health, alpha, and newest', () => {
    expect(
      filterAndSortPlants(allPlants, {
        filter: 'all',
        searchQuery: '',
        sortBy: 'needs_water',
      }).map((p) => p.id)
    ).toEqual(['p-1', 'p-3', 'p-2', 'p-4']);

    expect(
      filterAndSortPlants(allPlants, {
        filter: 'all',
        searchQuery: '',
        sortBy: 'health',
      }).map((p) => p.id)
    ).toEqual(['p-1', 'p-3', 'p-2', 'p-4']);

    expect(
      filterAndSortPlants(allPlants, {
        filter: 'all',
        searchQuery: '',
        sortBy: 'alpha',
      }).map((p) => p.id)
    ).toEqual(['p-2', 'p-4', 'p-3', 'p-1']);

    expect(
      filterAndSortPlants(allPlants, {
        filter: 'all',
        searchQuery: '',
        sortBy: 'recent',
      }).map((p) => p.id)
    ).toEqual(['p-2', 'p-3', 'p-4', 'p-1']);
  });

  it('groups plants by location and uses Unspecified Spot for empty locations', () => {
    const grouped = groupPlantsByLocation(allPlants);
    expect(grouped.map((g) => [g.location, g.items.map((p) => p.id)])).toEqual([
      ['South Window', ['p-1', 'p-4']],
      ['Living Room', ['p-2']],
      ['Unspecified Spot', ['p-3']],
    ]);
  });

  it('builds flat or location-grouped feed data and returns empty when no matches', () => {
    expect(buildGardenFeedData(0, [], false)).toEqual([]);
    expect(buildGardenFeedData(4, [], true)).toEqual([]);

    const flat = buildGardenFeedData(4, [thirstySucculent], false);
    expect(flat).toEqual([{ kind: 'plant', plant: thirstySucculent }]);

    const grouped = buildGardenFeedData(4, [thirstySucculent, floweringOrchid], true);
    expect(grouped).toEqual([
      {
        kind: 'location_group',
        location: 'South Window',
        items: [thirstySucculent, floweringOrchid],
      },
    ]);
  });

  it('tracks latest propagation root length and readiness count only on the propagation bench', () => {
    const entries: NotebookEntry[] = [
      {
        id: 'e-1',
        plantId: 'p-3',
        eventType: 'propagation',
        timestamp: '2026-11-10T10:00:00.000Z',
        title: 'Root check',
        notes: 'Growing fast',
        metrics: { rootLengthCm: 5.5 },
      },
    ];

    const inactiveMap = buildLatestRootLengthMap(allPlants, entries, false);
    expect(inactiveMap.size).toBe(0);
    expect(countPropagationReady(inactiveMap, false)).toBe(0);

    const activeMap = buildLatestRootLengthMap(allPlants, entries, true);
    expect(activeMap.get('p-3')).toBe(5.5);
    expect(activeMap.has('p-1')).toBe(false);
    expect(countPropagationReady(activeMap, true)).toBe(1);
  });
});
