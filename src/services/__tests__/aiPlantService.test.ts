import {
  AiAuthRequiredError,
  AiQuotaExceededError,
  enforceSucculentDiagnosisGuardrails,
  fetchAiQuotaStatus,
  handleEdgeFunctionError,
  identifyPlant,
  isSucculentTaxon,
  resetMockAiQuota,
} from '@/services/aiPlantService';
import type { PlantDiagnosisResult, UserPlant } from '@/types/plant';

const makeSucculentPlant = (overrides: Partial<UserPlant> = {}): UserPlant => ({
  id: 'succ-1',
  nickname: 'Window Jade',
  photoUri: 'https://example.com/jade.jpg',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  location: 'South Sill',
  isIndoor: true,
  lightExposure: 'bright_direct',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  lastWateredAt: '2026-11-01T00:00:00.000Z',
  customWateringIntervalDays: 14,
  species: {
    id: 'sp-jade',
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    plantType: 'succulent',
    baselineCare: {
      idealLight: 'Bright direct sun',
      baseWateringDays: 14,
      soilRecommendation: '50% pumice + 50% cactus soil',
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays: 12,
        rotWarningNote: 'Never mist leaves.',
      },
    },
  },
  ...overrides,
});

describe('isSucculentTaxon', () => {
  it('returns true for succulent families regardless of casing', () => {
    expect(isSucculentTaxon('Crassulaceae', 'foliage')).toBe(true);
    expect(isSucculentTaxon(' cactaceae ', 'foliage')).toBe(true);
    expect(isSucculentTaxon('Asphodelaceae')).toBe(true);
    expect(isSucculentTaxon('Aizoaceae')).toBe(true);
    expect(isSucculentTaxon('Agavaceae')).toBe(true);
  });

  it('returns true when plantType is succulent even if family is unknown', () => {
    expect(isSucculentTaxon('UnknownFamily', 'succulent')).toBe(true);
  });

  it('returns false for non-succulent foliage or propagation plants', () => {
    expect(isSucculentTaxon('Araceae', 'foliage')).toBe(false);
    expect(isSucculentTaxon('Lauraceae', 'propagation')).toBe(false);
    expect(isSucculentTaxon(undefined, 'foliage')).toBe(false);
  });
});

describe('enforceSucculentDiagnosisGuardrails', () => {
  const baseDiagnosis: PlantDiagnosisResult = {
    healthStatus: 'needs_attention',
    detectedSymptoms: ['Lower leaf softening'],
    diagnosisSummary: 'Needs care adjustment.',
    followUpQuestions: [],
    recommendedActions: [
      {
        instruction: 'Mist the leaves daily to increase ambient humidity.',
        urgency: 'soon',
      },
      {
        instruction: 'Keep moist between waterings.',
        urgency: 'routine',
      },
    ],
    adjustedWateringIntervalDays: 5,
  };

  it('sanitizes misting/moist recommendations and enforces >= 12 day interval for succulents', () => {
    const plant = makeSucculentPlant({ hasDrainageHole: true });
    const result = enforceSucculentDiagnosisGuardrails(baseDiagnosis, plant);

    expect(result.adjustedWateringIntervalDays).toBe(12);
    expect(result.succulentGuardrailApplied).toBeTruthy();
    expect(result.recommendedActions[0].instruction).toContain('Do NOT mist foliage');
    expect(result.recommendedActions[1].instruction).toContain('Do NOT mist foliage');
  });

  it('prepends an immediate drainage warning when succulent pot lacks a drainage hole', () => {
    const plant = makeSucculentPlant({ hasDrainageHole: false });
    const result = enforceSucculentDiagnosisGuardrails(baseDiagnosis, plant);

    expect(result.recommendedActions[0].urgency).toBe('immediate');
    expect(result.recommendedActions[0].instruction.toLowerCase()).toContain(
      'drainage hole'
    );
  });

  it('leaves non-succulent diagnoses unchanged', () => {
    const foliagePlant = makeSucculentPlant({
      species: {
        ...makeSucculentPlant().species,
        family: 'Araceae',
        plantType: 'foliage',
      },
    });
    const result = enforceSucculentDiagnosisGuardrails(
      baseDiagnosis,
      foliagePlant
    );

    expect(result.adjustedWateringIntervalDays).toBe(5);
    expect(result.recommendedActions[0].instruction).toContain('Mist the leaves');
  });
});

describe('AI scan quota enforcement (mock mode)', () => {
  it('decrements remaining scans and throws AiQuotaExceededError when exhausted', async () => {
    resetMockAiQuota(2);
    const initial = await fetchAiQuotaStatus();
    expect(initial.remaining).toBe(2);

    await identifyPlant('Monstera deliciosa');
    const afterOne = await fetchAiQuotaStatus();
    expect(afterOne.remaining).toBe(1);

    await identifyPlant('Jade Plant');
    const afterTwo = await fetchAiQuotaStatus();
    expect(afterTwo.remaining).toBe(0);

    await expect(identifyPlant('Aloe Vera')).rejects.toThrow(
      AiQuotaExceededError
    );
  });
});

describe('Edge Function error handling', () => {
  const makeMockResponse = (status: number, body: unknown) => ({
    status,
    json: async () => body,
  });

  it('throws AiAuthRequiredError on 401 responses', async () => {
    await expect(
      handleEdgeFunctionError(
        {
          message: 'Edge Function returned a non-2xx status code',
          context: makeMockResponse(401, { error: 'Unauthorized' }),
        },
        'Fallback error'
      )
    ).rejects.toThrow(AiAuthRequiredError);
  });

  it('throws AiQuotaExceededError when server returns QUOTA_EXCEEDED', async () => {
    const quota = {
      limit: 5,
      used: 5,
      remaining: 0,
      resetAt: '2026-11-21T00:00:00.000Z',
      tier: 'free' as const,
    };

    await expect(
      handleEdgeFunctionError(
        {
          context: makeMockResponse(429, {
            code: 'QUOTA_EXCEEDED',
            error: 'Daily limit of 5 free AI scans reached.',
            quota,
          }),
        },
        'Fallback error'
      )
    ).rejects.toThrow(AiQuotaExceededError);
  });

  it('maps 413, 502, and network failures to user-friendly messages', async () => {
    await expect(
      handleEdgeFunctionError(
        { context: makeMockResponse(413, { error: 'Payload too large' }) },
        'Fallback'
      )
    ).rejects.toThrow(/Photo is too large/i);

    await expect(
      handleEdgeFunctionError(
        { context: makeMockResponse(502, { error: 'Gemini upstream error' }) },
        'Fallback'
      )
    ).rejects.toThrow(/temporarily unavailable/i);

    await expect(
      handleEdgeFunctionError(
        { message: 'Failed to send a request to the Edge Function' },
        'Fallback'
      )
    ).rejects.toThrow(/internet connection/i);
  });
});
