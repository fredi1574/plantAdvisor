import type { DiagnosticPhotoAngle } from '@/types/plant';

export const SUCCULENT_FAMILIES = [
  'crassulaceae',
  'cactaceae',
  'asphodelaceae',
  'aizoaceae',
  'agavaceae',
] as const;

export const SUCCULENT_SYSTEM_GUARDRAIL = `
CRITICAL BOTANICAL GUARDRAIL FOR SUCCULENTS & CACTI (Families: Crassulaceae, Cactaceae, Asphodelaceae, Aizoaceae):
1. NEVER recommend misting leaves or aerial spraying. Succulents store water in parenchyma tissue; surface moisture causes fungal leaf spot, powdery mildew, and crown rot.
2. NEVER recommend frequent shallow sips of water or keeping soil "consistently moist".
3. ALWAYS prescribe the "Soak and Dry" method: drench thoroughly only after 100% of the gritty substrate has been bone-dry for several days and lower leaves show subtle turgor softening.
4. ALWAYS flag containers without drainage holes (hasDrainageHole === false) or water-retentive peat soils as an immediate root-rot hazard.
`.trim();

export const DIAGNOSTIC_ANGLE_LABELS: Record<DiagnosticPhotoAngle, string> = {
  canopy: 'Whole Plant / Canopy',
  closeup: 'Leaf / Stem Close-Up',
  soil: 'Soil Surface & Pot Base',
};

/**
 * JSON Schema descriptions passed to Gemini structured output mode.
 */
export const PLANT_IDENTIFICATION_JSON_SCHEMA = {
  type: 'OBJECT',
  required: [
    'commonName',
    'scientificName',
    'family',
    'plantType',
    'confidence',
    'baselineCare',
    'identificationNotes',
    'petSafety',
  ],
  properties: {
    commonName: { type: 'STRING' },
    scientificName: { type: 'STRING' },
    family: { type: 'STRING' },
    plantType: {
      type: 'STRING',
      enum: ['succulent', 'foliage', 'propagation', 'flowering'],
    },
    confidence: { type: 'NUMBER' },
    identificationNotes: { type: 'STRING' },
    petSafety: {
      type: 'OBJECT',
      required: [
        'isToxicToCats',
        'isToxicToDogs',
        'toxicityLevel',
        'toxicPrinciples',
        'safetyNotes',
      ],
      properties: {
        isToxicToCats: { type: 'BOOLEAN' },
        isToxicToDogs: { type: 'BOOLEAN' },
        toxicityLevel: {
          type: 'STRING',
          enum: ['safe', 'mild', 'moderate', 'severe'],
        },
        toxicPrinciples: { type: 'STRING' },
        safetyNotes: { type: 'STRING' },
      },
    },
    baselineCare: {
      type: 'OBJECT',
      required: [
        'idealLight',
        'baseWateringDays',
        'soilRecommendation',
        'succulentGuardrails',
      ],
      properties: {
        idealLight: { type: 'STRING' },
        baseWateringDays: { type: 'INTEGER' },
        soilRecommendation: { type: 'STRING' },
        succulentGuardrails: {
          type: 'OBJECT',
          required: [
            'isSucculentOrCactus',
            'neverMistFoliage',
            'soakAndDryRequired',
            'minimumDryBackDays',
            'rotWarningNote',
          ],
          properties: {
            isSucculentOrCactus: { type: 'BOOLEAN' },
            neverMistFoliage: { type: 'BOOLEAN' },
            soakAndDryRequired: { type: 'BOOLEAN' },
            minimumDryBackDays: { type: 'INTEGER' },
            rotWarningNote: { type: 'STRING' },
          },
        },
      },
    },
  },
};

export const PLANT_DIAGNOSIS_JSON_SCHEMA = {
  type: 'OBJECT',
  required: [
    'healthStatus',
    'detectedSymptoms',
    'diagnosisSummary',
    'followUpQuestions',
    'recommendedActions',
    'adjustedWateringIntervalDays',
  ],
  properties: {
    healthStatus: {
      type: 'STRING',
      enum: ['thriving', 'needs_attention', 'critical'],
    },
    detectedSymptoms: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    diagnosisSummary: { type: 'STRING' },
    followUpQuestions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    recommendedActions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['instruction', 'urgency'],
        properties: {
          instruction: { type: 'STRING' },
          urgency: { type: 'STRING', enum: ['immediate', 'soon', 'routine'] },
          rationale: { type: 'STRING' },
        },
      },
    },
    adjustedWateringIntervalDays: { type: 'INTEGER' },
    succulentGuardrailApplied: { type: 'STRING' },
  },
};
