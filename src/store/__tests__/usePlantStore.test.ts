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
      state.entries.some(
        (e) => e.plantId === created.id && e.eventType === 'ai_scan'
      )
    ).toBe(true);
  });

  it('updates intervals (including clearing optional ones), waters, logs metrics, and deletes', () => {
    const targetId = usePlantStore.getState().plants[0].id;

    usePlantStore.getState().updatePlant(targetId, {
      customWateringIntervalDays: 21,
      fertilizeIntervalDays: 30,
      rotateIntervalDays: 14,
      nickname: 'Renamed Specimen',
    });

    let updated = usePlantStore
      .getState()
      .plants.find((p) => p.id === targetId);
    expect(updated?.customWateringIntervalDays).toBe(21);
    expect(updated?.fertilizeIntervalDays).toBe(30);
    expect(updated?.rotateIntervalDays).toBe(14);
    expect(updated?.nickname).toBe('Renamed Specimen');

    usePlantStore.getState().updatePlant(targetId, {
      fertilizeIntervalDays: undefined,
    });
    updated = usePlantStore.getState().plants.find((p) => p.id === targetId);
    expect(updated?.fertilizeIntervalDays).toBeUndefined();

    usePlantStore.getState().waterPlantNow(targetId, 'Deep soak');
    updated = usePlantStore.getState().plants.find((p) => p.id === targetId);
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

  it('completes scheduled fertilize and rotate tasks with matching entry types', () => {
    const targetId = usePlantStore.getState().plants[0].id;

    usePlantStore.getState().completeScheduledCareTask(targetId, 'fertilize');
    expect(usePlantStore.getState().entries[0].eventType).toBe('fertilize');

    usePlantStore.getState().completeScheduledCareTask(targetId, 'rotate');
    expect(usePlantStore.getState().entries[0].eventType).toBe('note');
    expect(usePlantStore.getState().entries[0].title).toContain('Rotated');
  });

  it('waters all plants in batch and persists adaptiveCarePrefs updates', () => {
    const total = usePlantStore.getState().plants.length;
    const watered = usePlantStore.getState().waterAllPlants();
    expect(watered).toBe(total);
    expect(
      usePlantStore.getState().plants.every((p) => !doesPlantNeedWatering(p))
    ).toBe(true);

    usePlantStore.getState().setAdaptiveCarePrefs({
      hemisphere: 'southern',
      cityName: 'Sydney, Australia',
      latitude: '-33.86',
      longitude: '151.21',
    });
    expect(usePlantStore.getState().adaptiveCarePrefs).toEqual({
      hemisphere: 'southern',
      cityName: 'Sydney, Australia',
      latitude: '-33.86',
      longitude: '151.21',
    });
  });

  it('saves health assessments, toggles action completion, and updates/deletes care entries', () => {
    const targetId = usePlantStore.getState().plants[0].id;

    const assessment = usePlantStore.getState().saveHealthAssessment(
      targetId,
      {
        healthStatus: 'needs_attention',
        detectedSymptoms: ['Yellowing lower leaf'],
        diagnosisSummary: 'Mild overwatering detected.',
        followUpQuestions: ['Is the pot draining freely?'],
        recommendedActions: [
          {
            instruction: 'Allow top 3 inches of soil to dry out.',
            urgency: 'immediate',
          },
        ],
        adjustedWateringIntervalDays: 11,
      },
      'https://example.com/scan.jpg'
    );

    const updatedPlant = usePlantStore
      .getState()
      .plants.find((p) => p.id === targetId);
    expect(updatedPlant?.customWateringIntervalDays).toBe(11);
    expect(updatedPlant?.latestHealthAssessment?.id).toBe(assessment.id);
    expect(
      updatedPlant?.latestHealthAssessment?.recommendedActions[0].completed
    ).toBe(false);

    const actionId = assessment.recommendedActions[0].id;
    usePlantStore.getState().toggleRecommendedAction(targetId, actionId);
    expect(
      usePlantStore
        .getState()
        .plants.find((p) => p.id === targetId)
        ?.latestHealthAssessment?.recommendedActions[0].completed
    ).toBe(true);

    const entry = usePlantStore.getState().logCareEvent({
      plantId: targetId,
      eventType: 'note',
      title: 'Initial Note',
      notes: 'Checking foliage',
    });
    usePlantStore.getState().updateCareEntry(entry.id, {
      title: 'Updated Note',
      notes: 'Foliage recovered',
    });
    expect(
      usePlantStore.getState().entries.find((e) => e.id === entry.id)?.title
    ).toBe('Updated Note');

    usePlantStore.getState().deleteCareEntry(entry.id);
    expect(
      usePlantStore.getState().entries.some((e) => e.id === entry.id)
    ).toBe(false);
  });
});
