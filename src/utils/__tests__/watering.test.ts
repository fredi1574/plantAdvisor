import type { UserPlant } from '@/types/plant';
import {
  buildDefaultWateringCopy,
  doesPlantNeedWatering,
  getDaysUntilNextWater,
  toLocalDateKey,
} from '@/utils/watering';

const makeSpecimen = (
  plantType: UserPlant['species']['plantType'],
  daysAgo: number,
  interval: number
): UserPlant => ({
  id: 'w-1',
  nickname: 'Specimen',
  photoUri: 'https://example.com/p.jpg',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  location: 'Sill',
  isIndoor: true,
  lightExposure: 'bright_direct',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lastWateredAt: new Date(
    Date.UTC(2026, 10, 20) - daysAgo * 24 * 60 * 60 * 1000
  ).toISOString(),
  customWateringIntervalDays: interval,
  species: {
    id: 'sp-w',
    commonName: 'Test Plant',
    scientificName: 'Testus plantus',
    family: 'Testaceae',
    plantType,
    baselineCare: {
      idealLight: 'Bright',
      baseWateringDays: interval,
      soilRecommendation: 'Gritty',
      succulentGuardrails: {
        isSucculentOrCactus: plantType === 'succulent',
        neverMistFoliage: plantType === 'succulent',
        soakAndDryRequired: plantType === 'succulent',
        minimumDryBackDays: 12,
        rotWarningNote: 'Guardrail',
      },
    },
  },
});

describe('watering utilities', () => {
  it('formats local YYYY-MM-DD keys with zero-padding', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 10, 20))).toBe('2026-11-20');
  });

  it('calculates days until water accurately against a fixed timestamp', () => {
    const nowMs = Date.UTC(2026, 10, 20);
    const dueToday = makeSpecimen('foliage', 7, 7);
    const overdue = makeSpecimen('foliage', 10, 7);
    const upcoming = makeSpecimen('foliage', 2, 7);

    expect(getDaysUntilNextWater(dueToday, nowMs)).toBe(0);
    expect(doesPlantNeedWatering(dueToday, nowMs)).toBe(true);
    expect(getDaysUntilNextWater(overdue, nowMs)).toBe(-3);
    expect(getDaysUntilNextWater(upcoming, nowMs)).toBe(5);
    expect(doesPlantNeedWatering(upcoming, nowMs)).toBe(false);
  });

  it('builds species-tailored default watering copy', () => {
    const succulentCopy = buildDefaultWateringCopy(
      makeSpecimen('succulent', 14, 14),
      'Batch care: '
    );
    expect(succulentCopy.title).toContain('Soak & Dry');
    expect(succulentCopy.notes.startsWith('Batch care: ')).toBe(true);
    expect(succulentCopy.soilMoisture).toBe('bone_dry');

    const propCopy = buildDefaultWateringCopy(
      makeSpecimen('propagation', 5, 5)
    );
    expect(propCopy.title).toContain('Propagation');
    expect(propCopy.soilMoisture).toBe('slightly_damp');
  });
});
