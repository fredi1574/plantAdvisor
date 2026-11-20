import { SUCCULENT_FAMILIES } from '@/services/ai/schemas';
import type {
  PlantDiagnosisResult,
  PlantIdentificationResult,
  UserPlant,
} from '@/types/plant';

export function isSucculentTaxon(family?: string, plantType?: string): boolean {
  if (plantType === 'succulent') return true;
  if (!family) return false;
  return (SUCCULENT_FAMILIES as readonly string[]).includes(
    family.toLowerCase().trim()
  );
}

/**
 * Post-processes any AI identification to guarantee succulent guardrails are active.
 */
export function enforceSucculentIdentificationGuardrails(
  result: PlantIdentificationResult
): PlantIdentificationResult {
  if (!isSucculentTaxon(result.family, result.plantType)) {
    return result;
  }

  const guardrails = result.baselineCare.succulentGuardrails;
  const minimumDryBackDays = Math.max(guardrails?.minimumDryBackDays ?? 0, 12);
  const baseWateringDays = Math.max(
    result.baselineCare.baseWateringDays ?? 0,
    minimumDryBackDays
  );

  return {
    ...result,
    baselineCare: {
      ...result.baselineCare,
      baseWateringDays,
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays,
        rotWarningNote:
          guardrails?.rotWarningNote?.trim() ||
          'Never mist leaves. Drench deeply only after 100% of gritty substrate has dried out.',
      },
    },
  };
}

/**
 * Post-processes any AI diagnosis to guarantee succulent guardrails are never violated.
 */
export function enforceSucculentDiagnosisGuardrails(
  result: PlantDiagnosisResult,
  plantProfile: UserPlant
): PlantDiagnosisResult {
  const isSucculent = isSucculentTaxon(
    plantProfile.species.family,
    plantProfile.species.plantType
  );

  if (!isSucculent) {
    return result;
  }

  const sanitizedActions = result.recommendedActions.map((action) => {
    const lower = action.instruction.toLowerCase();
    if (
      lower.includes('mist') ||
      lower.includes('spray leaves') ||
      lower.includes('keep moist')
    ) {
      return {
        ...action,
        instruction:
          'Do NOT mist foliage. Allow the gritty soil mix to dry 100% to the bottom of the pot before the next deep soak.',
        rationale:
          'Succulent guardrail: Crassulaceae/Cactaceae leaves rot when misted or kept damp.',
      };
    }
    return action;
  });

  if (!plantProfile.hasDrainageHole) {
    const hasDrainageWarning = sanitizedActions.some((a) =>
      a.instruction.toLowerCase().includes('drainage')
    );
    if (!hasDrainageWarning) {
      sanitizedActions.unshift({
        instruction:
          'Repot into an unglazed terracotta pot with an unobstructed bottom drainage hole and 50% pumice/perlite grit.',
        urgency: 'immediate',
        rationale:
          'Succulents in non-draining vessels rapidly develop anaerobic root rot.',
      });
    }
  }

  const enforcedInterval = Math.max(result.adjustedWateringIntervalDays, 12);

  return {
    ...result,
    adjustedWateringIntervalDays: enforcedInterval,
    recommendedActions: sanitizedActions,
    succulentGuardrailApplied:
      result.succulentGuardrailApplied ??
      `Crassulaceae/Cactaceae Guardrail Active: Misting & frequent shallow watering suppressed; Soak-and-Dry minimum interval enforced (${enforcedInterval} days).`,
  };
}
