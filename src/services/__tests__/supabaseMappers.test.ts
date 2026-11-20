import {
  fromDbId,
  mapEntryToRow,
  mapPlantToRow,
  mapRowToEntry,
  mapRowToPlant,
  toDbId,
} from '@/services/supabase/mappers';
import type { NotebookEntry, UserPlant } from '@/types/plant';

const USER_ID = '11111111-2222-3333-4444-555555555555';

const samplePlant: UserPlant = {
  id: 'plant-1',
  nickname: 'Window Jade',
  photoUri: 'https://example.com/jade.jpg',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  location: 'South Sill',
  isIndoor: true,
  lightExposure: 'bright_direct',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lastWateredAt: '2026-11-10T00:00:00.000Z',
  customWateringIntervalDays: 14,
  fertilizeIntervalDays: 30,
  rotateIntervalDays: 14,
  species: {
    id: 'sp-jade',
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    plantType: 'succulent',
    baselineCare: {
      idealLight: 'Bright sun',
      baseWateringDays: 14,
      soilRecommendation: 'Gritty mix',
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays: 12,
        rotWarningNote: 'Never mist.',
      },
    },
  },
};

describe('Supabase row mappers', () => {
  it('scopes and unscopes multi-tenant IDs idempotently', () => {
    const dbId = toDbId('plant-1', USER_ID);
    expect(dbId).toBe(`${USER_ID}:plant-1`);
    expect(toDbId(dbId, USER_ID)).toBe(dbId);
    expect(fromDbId(dbId, USER_ID)).toBe('plant-1');
    expect(fromDbId(dbId, null)).toBe('plant-1');
  });

  it('round-trips UserPlant including optional fertilize & rotate intervals', () => {
    const row = mapPlantToRow(samplePlant, USER_ID);
    expect(row.fertilize_interval_days).toBe(30);
    expect(row.rotate_interval_days).toBe(14);

    const roundTripped = mapRowToPlant(row);
    expect(roundTripped).toEqual(samplePlant);
  });

  it('round-trips NotebookEntry with optional metrics', () => {
    const entry: NotebookEntry = {
      id: 'log-1',
      plantId: 'plant-1',
      eventType: 'propagation',
      timestamp: '2026-11-12T10:00:00.000Z',
      title: 'Root growth',
      notes: 'Healthy white roots',
      metrics: { rootLengthCm: 9.2, leafCount: 5 },
    };

    const row = mapEntryToRow(entry, USER_ID);
    expect(row.id).toBe(`${USER_ID}:log-1`);
    expect(row.plant_id).toBe(`${USER_ID}:plant-1`);

    expect(mapRowToEntry(row)).toEqual(entry);
  });
});
