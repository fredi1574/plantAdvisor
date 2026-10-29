/**
 * FloraLog — AI Plant Identification & Multimodal Health Diagnosis Service
 *
 * Supports:
 * 1. Deterministic Botanical Mock Mode (`EXPO_PUBLIC_USE_MOCK_AI=true` or when no API key is configured)
 * 2. Live Google Gemini Multimodal REST API (`EXPO_PUBLIC_USE_MOCK_AI=false` + `EXPO_PUBLIC_GEMINI_API_KEY`)
 *
 * Enforces strict Succulent Guardrails for Crassulaceae / Cactaceae / Asphodelaceae / Aizoaceae:
 * - NEVER recommend misting succulent foliage (triggers fungal rot and edema).
 * - NEVER recommend frequent shallow watering; always enforce deep "Soak and Dry" cycles.
 */

import { prepareImageForAI } from '@/services/imageUtils';
import type {
  NotebookEntry,
  PlantDiagnosisResult,
  PlantIdentificationResult,
  UserPlant,
} from '@/types/plant';

const SUCCULENT_FAMILIES = ['crassulaceae', 'cactaceae', 'asphodelaceae', 'aizoaceae', 'agavaceae'];

export const SUCCULENT_SYSTEM_GUARDRAIL = `
CRITICAL BOTANICAL GUARDRAIL FOR SUCCULENTS & CACTI (Families: Crassulaceae, Cactaceae, Asphodelaceae, Aizoaceae):
1. NEVER recommend misting leaves or aerial spraying. Succulents store water in parenchyma tissue; surface moisture causes fungal leaf spot, powdery mildew, and crown rot.
2. NEVER recommend frequent shallow sips of water or keeping soil "consistently moist".
3. ALWAYS prescribe the "Soak and Dry" method: drench thoroughly only after 100% of the gritty substrate has been bone-dry for several days and lower leaves show subtle turgor softening.
4. ALWAYS flag containers without drainage holes (hasDrainageHole === false) or water-retentive peat soils as an immediate root-rot hazard.
`.trim();

/**
 * JSON Schema descriptions passed to Gemini structured output mode
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
    baselineCare: {
      type: 'OBJECT',
      required: ['idealLight', 'baseWateringDays', 'soilRecommendation', 'succulentGuardrails'],
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

export function isMockAiEnabled(): boolean {
  const envFlag = process.env.EXPO_PUBLIC_USE_MOCK_AI;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (envFlag === 'false' && apiKey && apiKey.trim().length > 0) {
    return false;
  }
  return true;
}

export function isSucculentTaxon(family?: string, plantType?: string): boolean {
  if (plantType === 'succulent') return true;
  if (!family) return false;
  return SUCCULENT_FAMILIES.includes(family.toLowerCase().trim());
}

/**
 * Post-processes any AI diagnosis to guarantee succulent guardrails are never violated
 */
function enforceSucculentDiagnosisGuardrails(
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
    if (lower.includes('mist') || lower.includes('spray leaves') || lower.includes('keep moist')) {
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
        rationale: 'Succulents in non-draining vessels rapidly develop anaerobic root rot.',
      });
    }
  }

  return {
    ...result,
    adjustedWateringIntervalDays: Math.max(result.adjustedWateringIntervalDays, 12),
    recommendedActions: sanitizedActions,
    succulentGuardrailApplied:
      result.succulentGuardrailApplied ??
      `Crassulaceae/Cactaceae Guardrail Active: Misting & frequent shallow watering suppressed; Soak-and-Dry minimum interval enforced (${Math.max(
        result.adjustedWateringIntervalDays,
        12
      )} days).`,
  };
}

/**
 * 1. Identify a plant from an image URI or user-typed query string.
 */
export async function identifyPlant(
  imageUriOrName: string,
  hintQuery?: string
): Promise<PlantIdentificationResult> {
  const combinedInput = `${imageUriOrName} ${hintQuery ?? ''}`.trim();

  if (isMockAiEnabled()) {
    return mockIdentifyPlant(combinedInput);
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const isImageUri =
    imageUriOrName.startsWith('file:') ||
    imageUriOrName.startsWith('data:') ||
    imageUriOrName.startsWith('blob:') ||
    imageUriOrName.startsWith('http');

  const parts: Record<string, unknown>[] = [
    {
      text: `${SUCCULENT_SYSTEM_GUARDRAIL}\n\nIdentify the plant from the provided input. Hint/Name query: "${
        hintQuery || imageUriOrName
      }". Return strict JSON matching the schema.`,
    },
  ];

  if (isImageUri) {
    const prepared = await prepareImageForAI(imageUriOrName);
    if (prepared.base64) {
      parts.push({
        inlineData: {
          mimeType: prepared.mimeType,
          data: prepared.base64,
        },
      });
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: PLANT_IDENTIFICATION_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty identification response from Gemini API.');
  }

  return JSON.parse(rawText) as PlantIdentificationResult;
}

/**
 * 2. Diagnose plant health by combining a photo with temporal care history (`recentLogs`) & `plantProfile`.
 */
export async function diagnosePlantHealth(
  imageUri: string | undefined,
  plantProfile: UserPlant,
  recentLogs: NotebookEntry[],
  userObservationNotes?: string
): Promise<PlantDiagnosisResult> {
  if (isMockAiEnabled()) {
    const mockResult = await mockDiagnosePlantHealth(
      imageUri,
      plantProfile,
      recentLogs,
      userObservationNotes
    );
    return enforceSucculentDiagnosisGuardrails(mockResult, plantProfile);
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const serializedHistory = recentLogs.slice(0, 8).map((entry) => ({
    date: entry.timestamp,
    type: entry.eventType,
    title: entry.title,
    notes: entry.notes,
    metrics: entry.metrics,
  }));

  const promptText = `
${SUCCULENT_SYSTEM_GUARDRAIL}

You are FloraLog's senior botanical pathologist. Analyze the plant's current visual condition ALONGSIDE its historical care notebook to diagnose abiotic or biotic issues (overwatering, edema, etiolation, root rot, nutrient deficiency, or propagation stagnation).

PLANT PROFILE:
- Nickname: ${plantProfile.nickname}
- Species: ${plantProfile.species.commonName} (${plantProfile.species.scientificName})
- Family: ${plantProfile.species.family}
- Type: ${plantProfile.species.plantType}
- Location: ${plantProfile.location} (${plantProfile.isIndoor ? 'Indoor' : 'Outdoor'}, Light: ${plantProfile.lightExposure})
- Pot Material: ${plantProfile.potMaterial}, Has Drainage Hole: ${plantProfile.hasDrainageHole}
- Last Watered: ${plantProfile.lastWateredAt}
- Current Watering Interval: every ${plantProfile.customWateringIntervalDays} days

RECENT CARE NOTEBOOK LOGS (newest first):
${JSON.stringify(serializedHistory, null, 2)}

USER OBSERVATION NOTES:
${userObservationNotes || 'None provided.'}

Return strict JSON conforming to the schema.
`.trim();

  const parts: Record<string, unknown>[] = [{ text: promptText }];

  if (imageUri) {
    const prepared = await prepareImageForAI(imageUri);
    if (prepared.base64) {
      parts.push({
        inlineData: {
          mimeType: prepared.mimeType,
          data: prepared.base64,
        },
      });
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema: PLANT_DIAGNOSIS_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Diagnosis API Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty diagnosis response from Gemini API.');
  }

  const parsed = JSON.parse(rawText) as PlantDiagnosisResult;
  return enforceSucculentDiagnosisGuardrails(parsed, plantProfile);
}

/* ============================================================================
 * REALISTIC BOTANICAL MOCK ENGINE (`EXPO_PUBLIC_USE_MOCK_AI=true`)
 * ============================================================================ */

async function simulateNetworkDelay(ms = 650): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockIdentifyPlant(input: string): Promise<PlantIdentificationResult> {
  await simulateNetworkDelay(700);
  const q = input.toLowerCase();

  // 1. Avocado / Propagation match
  if (q.includes('avocado') || q.includes('persea') || q.includes('pit') || q.includes('seed')) {
    return {
      commonName: 'Avocado Seed Propagation',
      scientificName: 'Persea americana',
      family: 'Lauraceae',
      plantType: 'propagation',
      confidence: 0.96,
      identificationNotes:
        'Identified Persea americana pit/sapling propagation. Exhibits taproot emergence and apical stem shoot development.',
      baselineCare: {
        idealLight: 'Bright indirect sunlight (east or south windowsill, 6+ hrs)',
        baseWateringDays: 5,
        soilRecommendation:
          'Transition from water suspension to aerated 60% potting mix + 40% perlite/bark once taproot reaches 8–10 cm.',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 3,
          rotWarningNote:
            'When water-propagating, change reservoir water every 5–7 days to prevent hypoxic bacterial biofilm on the taproot.',
        },
      },
    };
  }

  // 2. Echeveria / Aloe / Cactus / Haworthia match
  if (
    q.includes('echeveria') ||
    q.includes('aloe') ||
    q.includes('cactus') ||
    q.includes('haworthia')
  ) {
    return {
      commonName: q.includes('aloe') ? 'Aloe Vera' : 'Rosette Echeveria',
      scientificName: q.includes('aloe') ? 'Aloe barbadensis miller' : 'Echeveria elegans',
      family: q.includes('aloe') ? 'Asphodelaceae' : 'Crassulaceae',
      plantType: 'succulent',
      confidence: 0.95,
      identificationNotes:
        'Compact drought-adapted succulent with farina-coated fleshy leaves storing water in specialized parenchyma cells.',
      baselineCare: {
        idealLight: 'Bright direct sun (4–6 hours daily) to prevent stem etiolation',
        baseWateringDays: 14,
        soilRecommendation:
          'Fast-draining gritty mix: 50% pumice/perlite, 25% coarse sand, 25% sifted cactus compost in terracotta.',
        succulentGuardrails: {
          isSucculentOrCactus: true,
          neverMistFoliage: true,
          soakAndDryRequired: true,
          minimumDryBackDays: 12,
          rotWarningNote:
            'Never mist rosette leaves or allow water to pool in the crown; use bottom-soaking or soil-level drench only after total dry-back.',
        },
      },
    };
  }

  // 3. Monstera / Philodendron / Pothos foliage match
  if (
    q.includes('monstera') ||
    q.includes('philodendron') ||
    q.includes('pothos') ||
    q.includes('fiddle') ||
    q.includes('fern')
  ) {
    return {
      commonName: 'Swiss Cheese Plant (Monstera)',
      scientificName: 'Monstera deliciosa',
      family: 'Araceae',
      plantType: 'foliage',
      confidence: 0.94,
      identificationNotes:
        'Tropical hemiepiphytic aroid with fenestrated glossy laminae and aerial support roots.',
      baselineCare: {
        idealLight: 'Bright indirect light; shield from harsh afternoon direct sun to avoid leaf scorch',
        baseWateringDays: 8,
        soilRecommendation:
          'Chunky aroid substrate: 40% orchid bark, 30% perlite/pumice, 30% coco coir + worm castings.',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 5,
          rotWarningNote: 'Allow top 5 cm (2 inches) of chunky mix to dry before watering thoroughly.',
        },
      },
    };
  }

  // 4. Default / Jade Plant (Crassula ovata) match (works great for photo-only demo scans too!)
  return {
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    plantType: 'succulent',
    confidence: 0.97,
    identificationNotes:
      'Crassula ovata (Crassulaceae) identified by opposite decussate obovate fleshy leaves, woody mature stems, and subtle carmine leaf margins under high light.',
    baselineCare: {
      idealLight: 'Bright direct to strong indirect sun (South or West exposure, 4–6 hrs)',
      baseWateringDays: 14,
      soilRecommendation:
        'Gritty succulent mix (50% pumice or perlite + 50% cactus soil) in an unglazed terracotta pot with a drainage hole.',
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays: 12,
        rotWarningNote:
          'Crassulaceae Guardrail: Never mist foliage or water on a shallow daily/weekly routine. Wait until substrate is 100% bone-dry and lower leaves feel slightly pliable.',
      },
    },
  };
}

async function mockDiagnosePlantHealth(
  imageUri: string | undefined,
  plantProfile: UserPlant,
  recentLogs: NotebookEntry[],
  userObservationNotes?: string
): Promise<PlantDiagnosisResult> {
  await simulateNetworkDelay(750);

  if ( imageUri ) {
    await prepareImageForAI(imageUri);
  }

  const notesLower = (userObservationNotes || '').toLowerCase();
  const isSucculent = isSucculentTaxon(
    plantProfile.species.family,
    plantProfile.species.plantType
  );
  const isPropagation = plantProfile.species.plantType === 'propagation';

  // Count recent waterings in the last 14 days
  const now = Date.now();
  const recentWaterings = recentLogs.filter(
    (entry) =>
      entry.eventType === 'water' &&
      now - new Date(entry.timestamp).getTime() <= 14 * 24 * 60 * 60 * 1000
  );

  // Case A: Succulent analysis (Jade Plant, Echeveria, etc.)
  if (isSucculent) {
    const overwatered =
      recentWaterings.length >= 2 ||
      !plantProfile.hasDrainageHole ||
      notesLower.includes('yellow') ||
      notesLower.includes('mushy') ||
      notesLower.includes('drop');

    const etiolated =
      plantProfile.lightExposure === 'low_shade' ||
      plantProfile.lightExposure === 'medium_filtered' ||
      notesLower.includes('stretch') ||
      notesLower.includes('leggy');

    if (overwatered || etiolated) {
      const symptoms: string[] = [];
      if (overwatered) {
        symptoms.push(
          'Lower leaf yellowing and edema blistering consistent with excess rhizosphere moisture'
        );
      }
      if (etiolated) {
        symptoms.push(
          'Widened internodal spacing (mild etiolation) from insufficient direct photon flux'
        );
      }
      if (!plantProfile.hasDrainageHole) {
        symptoms.push('High anaerobic root-rot risk: container lacks a bottom drainage hole');
      }

      return {
        healthStatus: !plantProfile.hasDrainageHole && recentWaterings.length >= 2 ? 'critical' : 'needs_attention',
        detectedSymptoms: symptoms,
        diagnosisSummary: `Cross-referencing your ${plantProfile.species.commonName} (${
          plantProfile.species.scientificName
        }) photo with its care log (${recentWaterings.length} watering event(s) in the last 14 days in a ${plantProfile.potMaterial.replace(
          '_',
          ' '
        )} pot) indicates early moisture stress${
          etiolated ? ' and mild internodal stretching' : ''
        }. As a member of Crassulaceae, its fleshy leaves store weeks of water and require full soil dry-back between deep soakings.`,
        followUpQuestions: [
          'Do the yellowing lower leaves feel firm and plump, or translucent and squishy when gently pinched?',
          'Is the bottom 5 cm of soil completely dry when tested with an unvarnished wooden skewer?',
        ],
        recommendedActions: [
          {
            instruction:
              'Suspend all watering for the next 14–16 days until 100% of the substrate is bone-dry.',
            urgency: 'immediate',
            rationale:
              'Allows swollen parenchyma cells to utilize stored water and prevents Pythium root rot.',
          },
          {
            instruction:
              'Move within 30–50 cm of a bright South or West window (acclimate over 4 days) to tighten internode spacing.',
            urgency: 'soon',
            rationale:
              'Direct sun triggers compact growth and healthy red anthocyanin leaf margins on Crassula ovata.',
          },
          {
            instruction:
              'Never mist the leaves; water only via the "Soak and Dry" drench method when lower leaves show slight wrinkling.',
            urgency: 'routine',
            rationale: 'Crassulaceae guardrail against foliar fungal spot and crown rot.',
          },
        ],
        adjustedWateringIntervalDays: 16,
        succulentGuardrailApplied:
          'Crassulaceae Guardrail Active: Misting & shallow watering blocked; enforced 16-day Soak-and-Dry interval.',
      };
    }

    return {
      healthStatus: 'thriving',
      detectedSymptoms: [
        'Turgid, glossy obovate leaves with healthy epidermal wax',
        'Compact internodal spacing and strong woody stem lignification',
      ],
      diagnosisSummary: `Your ${plantProfile.species.commonName} shows excellent turgor balance and compact growth. Your current Soak-and-Dry cadence and ${plantProfile.potMaterial.replace(
        '_',
        ' '
      )} setup with drainage are well-matched to its Crassulaceae physiology.`,
      followUpQuestions: [],
      recommendedActions: [
        {
          instruction:
            'Continue the Soak-and-Dry cycle every 14 days; verify full soil dryness with a wooden skewer before watering.',
          urgency: 'routine',
          rationale: 'Maintains aerobic root health.',
        },
        {
          instruction:
            'Rotate the pot 90° every 2 weeks so all stems receive balanced solar exposure.',
          urgency: 'routine',
          rationale: 'Prevents phototropic leaning toward the window.',
        },
      ],
      adjustedWateringIntervalDays: 14,
      succulentGuardrailApplied:
        'Crassulaceae Guardrail Active: Misting prohibited; Soak-and-Dry cycle verified.',
    };
  }

  // Case B: Propagation analysis (Avocado seed, cuttings)
  if (isPropagation) {
    return {
      healthStatus: 'thriving',
      detectedSymptoms: [
        'Active white primary taproot elongation with healthy lateral root primordia',
        'Apical meristem shoot emerging with bronze-green juvenile leaves',
      ],
      diagnosisSummary: `Your ${plantProfile.nickname} (${plantProfile.species.scientificName}) propagation is progressing strongly. Timeline logs show steady taproot and stem elongation without vascular browning or biofilm accumulation.`,
      followUpQuestions: [
        'Has the primary stem reached 15–18 cm (6–7 inches) with at least 4–6 true leaves?',
      ],
      recommendedActions: [
        {
          instruction:
            'Refresh propagation water (or flush aerated substrate) with room-temperature filtered water to keep dissolved oxygen high.',
          urgency: 'soon',
          rationale: 'Prevents anaerobic root tip browning on Persea americana.',
        },
        {
          instruction:
            'Pinch the top apical bud once the stem reaches 18 cm to stimulate lateral branching and a bushier canopy.',
          urgency: 'routine',
          rationale: 'Breaks apical dominance so the sapling does not grow as a single spindly stalk.',
        },
        {
          instruction:
            'Prepare a 15 cm terracotta pot with 60% potting soil + 40% perlite for soil transition once roots are 10 cm long.',
          urgency: 'routine',
          rationale: 'Avocado roots are highly sensitive to compacted, poorly aerated soil.',
        },
      ],
      adjustedWateringIntervalDays: 5,
    };
  }

  // Case C: Foliage / Flowering plants
  return {
    healthStatus: notesLower.includes('brown') || notesLower.includes('droop') ? 'needs_attention' : 'thriving',
    detectedSymptoms:
      notesLower.includes('brown') || notesLower.includes('droop')
        ? [
            'Slight laminar droop and crispy leaf tip margins indicating overdue hydration or low ambient humidity',
          ]
        : ['Vibrant chlorophyll density and upright petiole posture'],
    diagnosisSummary: `Based on your ${plantProfile.species.commonName}'s care history in "${plantProfile.location}", the root zone is ready for a thorough top-to-bottom watering until 15% runoff exits the drainage holes.`,
    followUpQuestions: [
      'Is the top 5 cm (2 inches) of potting mix dry to the touch?',
    ],
    recommendedActions: [
      {
        instruction:
          'Water thoroughly with tepid water until excess drains freely from the bottom hole, then discard saucer water after 10 minutes.',
        urgency: 'immediate',
        rationale: 'Flushes accumulated mineral salts and rehydrates the entire root ball.',
      },
      {
        instruction:
          'Wipe upper leaf surfaces with a damp microfiber cloth to maximize photosynthetic light capture.',
        urgency: 'routine',
        rationale: 'Removes indoor dust buildup blocking stomata and light absorption.',
      },
    ],
    adjustedWateringIntervalDays: plantProfile.species.baselineCare.baseWateringDays,
  };
}

