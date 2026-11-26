import {
  computeCareRhythmWeeks,
  computeConservatorySnapshot,
  detectNewConservatoryMilestones,
} from '@/services/conservatoryService';
import type {
  HealthAssessment,
  NotebookEntry,
  PlantType,
  UserPlant,
} from '@/types/plant';

const NOW = new Date('2026-11-26T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * DAY_MS).toISOString();

function makePlant(
  id: string,
  options: {
    commonName?: string;
    scientificName?: string;
    family?: string;
    plantType?: PlantType;
    daysAgoWatered?: number;
    intervalDays?: number;
    acquiredDaysAgo?: number;
    latestHealthAssessment?: HealthAssessment;
  } = {}
): UserPlant {
  const plantType = options.plantType ?? 'foliage';
  const isSucculent = plantType === 'succulent';
  const intervalDays = options.intervalDays ?? (isSucculent ? 14 : 7);

  return {
    id,
    nickname: options.commonName ?? `Plant ${id}`,
    photoUri: `https://example.com/${id}.jpg`,
    acquiredAt: daysAgo(options.acquiredDaysAgo ?? 30),
    location: 'South Sill',
    isIndoor: true,
    lightExposure: 'bright_indirect',
    hasDrainageHole: true,
    potMaterial: 'terracotta',
    lastWateredAt: daysAgo(options.daysAgoWatered ?? 2),
    customWateringIntervalDays: intervalDays,
    species: {
      id: `sp-${id}`,
      commonName: options.commonName ?? `Species ${id}`,
      scientificName: options.scientificName ?? `Genus ${id}`,
      family: options.family ?? 'Araceae',
      plantType,
      baselineCare: {
        idealLight: 'Bright indirect',
        baseWateringDays: intervalDays,
        soilRecommendation: 'Well-draining mix',
        succulentGuardrails: {
          isSucculentOrCactus: isSucculent,
          neverMistFoliage: isSucculent,
          soakAndDryRequired: isSucculent,
          minimumDryBackDays: isSucculent ? 12 : 4,
          rotWarningNote: 'Let soil dry appropriately.',
        },
      },
    },
    latestHealthAssessment: options.latestHealthAssessment,
  };
}

describe('computeCareRhythmWeeks', () => {
  it('returns 0 when there are no valid entries', () => {
    expect(computeCareRhythmWeeks([], NOW)).toBe(0);
    expect(
      computeCareRhythmWeeks(
        [
          {
            id: 'bad',
            plantId: 'p1',
            eventType: 'note',
            timestamp: 'invalid-date',
            title: 'Bad',
            notes: '',
          },
        ],
        NOW
      )
    ).toBe(0);
  });

  it('counts consecutive active calendar weeks including grace when current week has no log yet', () => {
    // NOW is Thursday Nov 26, 2026 -> entries 7d and 14d ago are previous 2 consecutive weeks
    const entries: NotebookEntry[] = [
      {
        id: 'w1',
        plantId: 'p1',
        eventType: 'water',
        timestamp: daysAgo(7),
        title: 'Last week',
        notes: '',
      },
      {
        id: 'w2',
        plantId: 'p1',
        eventType: 'water',
        timestamp: daysAgo(14),
        title: 'Two weeks ago',
        notes: '',
      },
      {
        id: 'w4-gap',
        plantId: 'p1',
        eventType: 'water',
        timestamp: daysAgo(35),
        title: 'Gap week',
        notes: '',
      },
    ];

    expect(computeCareRhythmWeeks(entries, NOW)).toBe(2);
  });
});

describe('computeConservatorySnapshot', () => {
  it('handles an empty garden gracefully with baseline rank and zero unlocked seals', () => {
    const snap = computeConservatorySnapshot([], [], [], NOW);

    expect(snap.rank.id).toBe('seedling_keeper');
    expect(snap.rank.tier).toBe(1);
    expect(snap.rank.score).toBe(0);
    expect(snap.unlockedSealCount).toBe(0);
    expect(snap.rhythm.harmonyPercent).toBe(100);
    expect(snap.herbarium.plates).toHaveLength(0);
  });

  it('enforces succulent dry-back discipline and refuses credit for overwatering', () => {
    const jade = makePlant('jade', {
      commonName: 'Jade Plant',
      scientificName: 'Crassula ovata',
      family: 'Crassulaceae',
      plantType: 'succulent',
      daysAgoWatered: 2,
      intervalDays: 14,
    });

    const entries: NotebookEntry[] = [
      // First watering with bone_dry -> counts (1)
      {
        id: 'w1',
        plantId: 'jade',
        eventType: 'water',
        timestamp: daysAgo(32),
        title: 'Deep soak',
        notes: '',
        metrics: { soilMoisture: 'bone_dry' },
      },
      // Overwatered 4 days later -> MUST NOT count
      {
        id: 'w2',
        plantId: 'jade',
        eventType: 'water',
        timestamp: daysAgo(28),
        title: 'Too soon',
        notes: '',
        metrics: { soilMoisture: 'slightly_damp' },
      },
      // 14 days after w2 -> counts (2)
      {
        id: 'w3',
        plantId: 'jade',
        eventType: 'water',
        timestamp: daysAgo(14),
        title: 'Proper soak',
        notes: '',
        metrics: { soilMoisture: 'bone_dry' },
      },
      // 13 days after w3 -> counts (3) -> unlocks seal!
      {
        id: 'w4',
        plantId: 'jade',
        eventType: 'water',
        timestamp: daysAgo(1),
        title: 'Proper soak 2',
        notes: '',
        metrics: { soilMoisture: 'bone_dry' },
      },
    ];

    const snap = computeConservatorySnapshot([jade], entries, [], NOW);
    const dryBack = snap.seals.find((s) => s.id === 'dry_back_discipline');
    expect(dryBack?.current).toBe(3);
    expect(dryBack?.unlocked).toBe(true);
  });

  it('detects revival arcs, completed medic actions, propagation milestones, and deduplicated herbarium plates', () => {
    const olderDistress: HealthAssessment = {
      id: 'ha-old',
      plantId: 'p1',
      createdAt: daysAgo(20),
      healthStatus: 'critical',
      detectedSymptoms: ['Root stress'],
      diagnosisSummary: 'Critical stress',
      followUpQuestions: [],
      recommendedActions: [
        { id: 'a1', instruction: 'Repot', urgency: 'immediate', completed: true },
        { id: 'a2', instruction: 'Trim roots', urgency: 'soon', completed: true },
      ],
      adjustedWateringIntervalDays: 10,
    };
    const recoveredLatest: HealthAssessment = {
      id: 'ha-new',
      plantId: 'p1',
      createdAt: daysAgo(2),
      healthStatus: 'thriving',
      detectedSymptoms: ['New healthy shoot'],
      diagnosisSummary: 'Recovered cleanly',
      followUpQuestions: [],
      recommendedActions: [
        { id: 'a3', instruction: 'Maintain light', urgency: 'routine', completed: true },
      ],
      adjustedWateringIntervalDays: 8,
    };

    const plants = [
      makePlant('p1', {
        commonName: 'Monstera',
        scientificName: 'Monstera deliciosa',
        family: 'Araceae',
        plantType: 'foliage',
        daysAgoWatered: 2,
        intervalDays: 8,
        acquiredDaysAgo: 100,
        latestHealthAssessment: recoveredLatest,
      }),
      makePlant('p1b', {
        commonName: 'Monstera',
        scientificName: 'Monstera deliciosa',
        family: 'Araceae',
        plantType: 'foliage',
        daysAgoWatered: 1,
        intervalDays: 8,
        acquiredDaysAgo: 40,
      }),
      makePlant('p2', {
        commonName: 'Jade Plant',
        scientificName: 'Crassula ovata',
        family: 'Crassulaceae',
        plantType: 'succulent',
        daysAgoWatered: 4,
        intervalDays: 14,
      }),
      makePlant('p3', {
        commonName: 'Avocado Cutting',
        scientificName: 'Persea americana',
        family: 'Lauraceae',
        plantType: 'propagation',
        daysAgoWatered: 1,
        intervalDays: 5,
      }),
    ];

    const entries: NotebookEntry[] = [
      {
        id: 'e1',
        plantId: 'p3',
        eventType: 'propagation',
        timestamp: daysAgo(1),
        title: 'Roots ready',
        notes: '',
        photoUri: 'https://example.com/roots.jpg',
        metrics: { rootLengthCm: 6.2 },
      },
      {
        id: 'e2',
        plantId: 'p1',
        eventType: 'note',
        timestamp: daysAgo(3),
        title: 'New leaf',
        notes: '',
        metrics: { leafCount: 7 },
      },
      {
        id: 'e3',
        plantId: 'p1',
        eventType: 'note',
        timestamp: daysAgo(6),
        title: 'Stem measured',
        notes: '',
        metrics: { stemHeightCm: 42 },
      },
      {
        id: 'e4',
        plantId: 'p2',
        eventType: 'note',
        timestamp: daysAgo(10),
        title: 'Photo log',
        notes: '',
        photoUri: 'https://example.com/jade.jpg',
      },
      {
        id: 'e5',
        plantId: 'p2',
        eventType: 'note',
        timestamp: daysAgo(12),
        title: 'Second photo',
        notes: '',
        photoUri: 'https://example.com/jade2.jpg',
      },
    ];

    const snap = computeConservatorySnapshot(
      plants,
      entries,
      [olderDistress, recoveredLatest],
      NOW
    );

    const byId = Object.fromEntries(snap.seals.map((s) => [s.id, s]));
    expect(byId.first_roots.unlocked).toBe(true);
    expect(byId.family_collector.unlocked).toBe(true);
    expect(byId.garden_harmony.unlocked).toBe(true);
    expect(byId.chronicle_keeper.unlocked).toBe(true);
    expect(byId.root_whisperer.unlocked).toBe(true);
    expect(byId.plant_medic.unlocked).toBe(true);
    expect(byId.comeback_story.unlocked).toBe(true);

    // Monstera deliciosa specimens should merge into 1 herbarium plate with specimenCount=2
    expect(snap.herbarium.plates).toHaveLength(3);
    const monsteraPlate = snap.herbarium.plates.find(
      (p) => p.scientificName === 'Monstera deliciosa'
    );
    expect(monsteraPlate?.specimenCount).toBe(2);
    expect(monsteraPlate?.ageDays).toBe(100);
    expect(snap.herbarium.distinctFamilies).toEqual([
      'Araceae',
      'Crassulaceae',
      'Lauraceae',
    ]);
    expect(snap.rank.tier).toBeGreaterThanOrEqual(3);
  });

  it('detects newly unlocked seals and rank promotions between snapshots', () => {
    const p1 = makePlant('p1', { daysAgoWatered: 10, intervalDays: 7 }); // overdue
    const p2 = makePlant('p2', { daysAgoWatered: 1, intervalDays: 7 });
    const p3 = makePlant('p3', { daysAgoWatered: 1, intervalDays: 7 });

    const before = computeConservatorySnapshot([p1, p2, p3], [], [], NOW);
    const p1Watered = { ...p1, lastWateredAt: daysAgo(0) };
    const after = computeConservatorySnapshot([p1Watered, p2, p3], [], [], NOW);

    const events = detectNewConservatoryMilestones(before, after);
    expect(
      events.some((e) => e.kind === 'seal' && e.id === 'garden_harmony')
    ).toBe(true);
  });
});
