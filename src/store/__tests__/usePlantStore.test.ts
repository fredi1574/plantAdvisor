import {
  doesPlantNeedWatering,
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { PlantIdentificationResult, UserPlant } from '@/types/plant';

const makePlant = (daysAgoWatered: number, intervalDays = 7): UserPlant => ({
  id: 'p-test-1',
  nickname: 'Test Monstera',
  photoUri: 'https://example.com/monstera.jpg',
  acquiredAt: new Date().toISOString(),
  location: 'Living Room',
  isIndoor: true,
  lightExposure: 'bright_indirect',
  hasDrainageHole: true,
  potMaterial: 'ceramic_glazed',
  lastWateredAt: new Date(
    Date.now() - daysAgoWatered * 24 * 60 * 60 * 1000
  ).toISOString(),
  customWateringIntervalDays: intervalDays,
  species: {
    id: 'sp-test',
    commonName: 'Monstera',
    scientificName: 'Monstera deliciosa',
    family: 'Araceae',
    plantType: 'foliage',
    baselineCare: {
      idealLight: 'Bright indirect',
      baseWateringDays: intervalDays,
      soilRecommendation: 'Chunky aroid mix',
      succulentGuardrails: {
        isSucculentOrCactus: false,
        neverMistFoliage: false,
        soakAndDryRequired: false,
        minimumDryBackDays: 5,
        rotWarningNote: 'Let top 2 inches dry.',
      },
    },
  },
});

describe('Watering countdown helpers', () => {
  it('detects overdue plants and plants due today', () => {
    const overdue = makePlant(10, 7);
    expect(getDaysUntilNextWater(overdue)).toBeLessThan(0);
    expect(doesPlantNeedWatering(overdue)).toBe(true);

    const dueInFuture = makePlant(2, 7);
    expect(getDaysUntilNextWater(dueInFuture)).toBeGreaterThan(0);
    expect(doesPlantNeedWatering(dueInFuture)).toBe(false);
  });
});

describe('usePlantStore mutations', () => {
  beforeEach(() => {
    usePlantStore.getState().resetToSeedData();
  });

  it('adds a plant with petSafety and creates an initial notebook entry', () => {
    const identification: PlantIdentificationResult = {
      commonName: 'Calathea Orbifolia',
      scientificName: 'Goeppertia orbifolia',
      family: 'Marantaceae',
      plantType: 'foliage',
      confidence: 0.94,
      identificationNotes: 'Broad striped foliage.',
      baselineCare: {
        idealLight: 'Medium filtered light',
        baseWateringDays: 6,
        soilRecommendation: 'Moist well-draining mix',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 3,
          rotWarningNote: 'Keep evenly damp.',
        },
      },
      petSafety: {
        isToxicToCats: false,
        isToxicToDogs: false,
        toxicityLevel: 'safe',
        toxicPrinciples: 'None',
        safetyNotes: 'Non-toxic to cats and dogs.',
      },
    };

    const initialCount = usePlantStore.getState().plants.length;
    const created = usePlantStore.getState().addPlant({
      nickname: 'Striped Calathea',
      location: 'Bedroom',
      isIndoor: true,
      lightExposure: 'medium_filtered',
      hasDrainageHole: true,
      potMaterial: 'ceramic_glazed',
      identification,
    });

    const state = usePlantStore.getState();
    expect(state.plants.length).toBe(initialCount + 1);
    expect(created.species.petSafety?.toxicityLevel).toBe('safe');
    expect(
      state.entries.some((e) => e.plantId === created.id && e.eventType === 'ai_scan')
    ).toBe(true);
  });

  it('updates a plant interval, waters it, logs a growth metric, and deletes it', () => {
    const targetId = usePlantStore.getState().plants[0].id;

    usePlantStore.getState().updatePlant(targetId, {
      customWateringIntervalDays: 21,
      nickname: 'Renamed Specimen',
    });

    let updated = usePlantStore
      .getState()
      .plants.find((p) => p.id === targetId);
    expect(updated?.customWateringIntervalDays).toBe(21);
    expect(updated?.nickname).toBe('Renamed Specimen');

    usePlantStore.getState().waterPlantNow(targetId, 'Deep soak');
    updated = usePlantStore
      .getState()
      .plants.find((p) => p.id === targetId);
    expect(doesPlantNeedWatering(updated!)).toBe(false);

    const entry = usePlantStore.getState().logCareEvent({
      plantId: targetId,
      eventType: 'propagation',
      title: 'Root check',
      notes: 'Growing steadily',
      metrics: { rootLengthCm: 8.5 },
    });
    expect(entry.metrics?.rootLengthCm).toBe(8.5);

    usePlantStore.getState().deletePlant(targetId);
    expect(
      usePlantStore.getState().plants.some((p) => p.id === targetId)
    ).toBe(false);
  });
});
