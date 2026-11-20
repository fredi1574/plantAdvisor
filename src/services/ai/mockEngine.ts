import { isSucculentTaxon } from '@/services/ai/guardrails';
import { prepareImageForAI } from '@/services/imageUtils';
import type {
  DiagnosticPhotoInput,
  NotebookEntry,
  PlantDiagnosisResult,
  PlantIdentificationResult,
  UserPlant,
} from '@/types/plant';

async function simulateNetworkDelay(ms = 650): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_CATALOG: PlantIdentificationResult[] = [
  {
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    plantType: 'succulent',
    confidence: 0.96,
    identificationNotes:
      'Crassula ovata (Crassulaceae) identified by opposite decussate obovate fleshy leaves, woody mature stems, and subtle carmine leaf margins under high light.',
    baselineCare: {
      idealLight:
        'Bright direct to strong indirect sun (South or West exposure, 4–6 hrs)',
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
    petSafety: {
      isToxicToCats: true,
      isToxicToDogs: true,
      toxicityLevel: 'mild',
      toxicPrinciples: 'Unknown glycosides / saponins',
      safetyNotes:
        'Toxic to cats and dogs if ingested; may cause vomiting, depression, and incoordination.',
    },
  },
  {
    commonName: 'Swiss Cheese Plant',
    scientificName: 'Monstera deliciosa',
    family: 'Araceae',
    plantType: 'foliage',
    confidence: 0.94,
    identificationNotes:
      'Monstera deliciosa identified by broad cordate leaves displaying early lateral fenestrations and sturdy aerial roots.',
    baselineCare: {
      idealLight: 'Bright indirect light; protect from harsh midday sun',
      baseWateringDays: 7,
      soilRecommendation:
        'Aerated aroid blend: 40% chunky orchid bark, 30% perlite, 30% coco peat.',
      succulentGuardrails: {
        isSucculentOrCactus: false,
        neverMistFoliage: false,
        soakAndDryRequired: false,
        minimumDryBackDays: 4,
        rotWarningNote:
          'Allow top 2 inches of soil to dry out between waterings to prevent root suffocation.',
      },
    },
    petSafety: {
      isToxicToCats: true,
      isToxicToDogs: true,
      toxicityLevel: 'moderate',
      toxicPrinciples: 'Insoluble calcium oxalate crystals',
      safetyNotes:
        'Chewing leaves or stems causes immediate oral irritation, drooling, and swelling in cats, dogs, and children.',
    },
  },
  {
    commonName: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    family: 'Asparagaceae',
    plantType: 'succulent',
    confidence: 0.95,
    identificationNotes:
      'Sansevieria trifasciata recognized by erect sword-shaped leaves with distinct grey-green variegated cross-banding and yellow margins.',
    baselineCare: {
      idealLight: 'Adaptable from low indirect light to bright filtered sun',
      baseWateringDays: 16,
      soilRecommendation:
        'Fast-draining cactus and succulent mix with perlite or pumice in a porous pot.',
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays: 14,
        rotWarningNote:
          'Extremely susceptible to root rot if overwatered. Keep potting substrate dry between infrequent waterings.',
      },
    },
    petSafety: {
      isToxicToCats: true,
      isToxicToDogs: true,
      toxicityLevel: 'mild',
      toxicPrinciples: 'Saponins',
      safetyNotes:
        'Mildly toxic to cats and dogs; ingestion causes nausea, vomiting, and diarrhea.',
    },
  },
  {
    commonName: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    family: 'Moraceae',
    plantType: 'foliage',
    confidence: 0.93,
    identificationNotes:
      'Ficus lyrata identified by prominent violin-shaped glossy coriaceous leaves with pronounced pale veins.',
    baselineCare: {
      idealLight:
        'Consistent bright indirect light; avoid drafty windows and sudden temperature swings',
      baseWateringDays: 9,
      soilRecommendation:
        'Well-draining rich indoor potting mix amended with perlite and bark for root aeration.',
      succulentGuardrails: {
        isSucculentOrCactus: false,
        neverMistFoliage: false,
        soakAndDryRequired: false,
        minimumDryBackDays: 5,
        rotWarningNote:
          'Avoid letting the bottom sit in standing saucer drainage water to prevent fungal edema and brown leaf edges.',
      },
    },
    petSafety: {
      isToxicToCats: true,
      isToxicToDogs: true,
      toxicityLevel: 'mild',
      toxicPrinciples: 'Ficin & insoluble calcium oxalates',
      safetyNotes:
        'Milky sap and leaves can irritate skin and cause mouth irritation, drooling, and vomiting in pets.',
    },
  },
];

export async function mockIdentifyPlant(
  input: string
): Promise<PlantIdentificationResult> {
  await simulateNetworkDelay(700);
  const q = input.toLowerCase();

  if (
    q.includes('avocado') ||
    q.includes('persea') ||
    q.includes('pit') ||
    q.includes('seed')
  ) {
    return {
      commonName: 'Avocado Seed Propagation',
      scientificName: 'Persea americana',
      family: 'Lauraceae',
      plantType: 'propagation',
      confidence: 0.96,
      identificationNotes:
        'Identified Persea americana pit/sapling propagation. Exhibits taproot emergence and apical stem shoot development.',
      baselineCare: {
        idealLight:
          'Bright indirect sunlight (east or south windowsill, 6+ hrs)',
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
      petSafety: {
        isToxicToCats: true,
        isToxicToDogs: true,
        toxicityLevel: 'moderate',
        toxicPrinciples: 'Persin (pit, bark, and leaves)',
        safetyNotes:
          'Keep pit and foliage out of reach of pets and children; persin can cause gastrointestinal upset and cardiac stress.',
      },
    };
  }

  if (
    q.includes('echeveria') ||
    q.includes('aloe') ||
    q.includes('cactus') ||
    q.includes('haworthia')
  ) {
    return {
      commonName: q.includes('aloe') ? 'Aloe Vera' : 'Rosette Echeveria',
      scientificName: q.includes('aloe')
        ? 'Aloe barbadensis miller'
        : 'Echeveria elegans',
      family: q.includes('aloe') ? 'Asphodelaceae' : 'Crassulaceae',
      plantType: 'succulent',
      confidence: 0.95,
      identificationNotes:
        'Compact drought-adapted succulent with farina-coated fleshy leaves storing water in specialized parenchyma cells.',
      baselineCare: {
        idealLight:
          'Bright direct sun (4–6 hours daily) to prevent stem etiolation',
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
      petSafety: q.includes('aloe')
        ? {
            isToxicToCats: true,
            isToxicToDogs: true,
            toxicityLevel: 'moderate',
            toxicPrinciples: 'Anthraquinone glycosides (aloin) & saponins',
            safetyNotes:
              'Latex in aloe skin can cause vomiting, diarrhea, and lethargy in cats and dogs if chewed.',
          }
        : {
            isToxicToCats: false,
            isToxicToDogs: false,
            toxicityLevel: 'safe',
            toxicPrinciples: 'None',
            safetyNotes:
              'Non-toxic to cats, dogs, and children. Ideal pet-friendly windowsill succulent.',
          },
    };
  }

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
        idealLight:
          'Bright indirect light; shield from harsh afternoon direct sun to avoid leaf scorch',
        baseWateringDays: 8,
        soilRecommendation:
          'Chunky aroid substrate: 40% orchid bark, 30% perlite/pumice, 30% coco coir + worm castings.',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 5,
          rotWarningNote:
            'Allow top 5 cm (2 inches) of chunky mix to dry before watering thoroughly.',
        },
      },
      petSafety: {
        isToxicToCats: true,
        isToxicToDogs: true,
        toxicityLevel: 'moderate',
        toxicPrinciples: 'Insoluble calcium oxalate crystals',
        safetyNotes:
          'Toxic to cats, dogs, and children if chewed; causes immediate oral irritation, pawing at mouth, and drooling.',
      },
    };
  }

  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const pickedIndex = Math.abs(hash) % MOCK_CATALOG.length;
  return MOCK_CATALOG[pickedIndex];
}

export async function mockDiagnosePlantHealth(
  photos: DiagnosticPhotoInput[],
  plantProfile: UserPlant,
  recentLogs: NotebookEntry[],
  userObservationNotes?: string
): Promise<PlantDiagnosisResult> {
  await simulateNetworkDelay(750);

  for (const photo of photos) {
    await prepareImageForAI(photo.uri);
  }

  const angleSummary =
    photos.length > 1
      ? ` (multi-angle scan: ${photos.map((p) => p.label ?? p.angle).join(', ')})`
      : '';

  const notesLower = (userObservationNotes || '').toLowerCase();
  const isSucculent = isSucculentTaxon(
    plantProfile.species.family,
    plantProfile.species.plantType
  );
  const isPropagation = plantProfile.species.plantType === 'propagation';

  const now = Date.now();
  const recentWaterings = recentLogs.filter(
    (entry) =>
      entry.eventType === 'water' &&
      now - new Date(entry.timestamp).getTime() <= 14 * 24 * 60 * 60 * 1000
  );

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
        symptoms.push(
          'High anaerobic root-rot risk: container lacks a bottom drainage hole'
        );
      }

      return {
        healthStatus:
          !plantProfile.hasDrainageHole && recentWaterings.length >= 2
            ? 'critical'
            : 'needs_attention',
        detectedSymptoms: symptoms,
        diagnosisSummary: `Cross-referencing your ${plantProfile.species.commonName} (${
          plantProfile.species.scientificName
        }) photo${angleSummary} with its care log (${recentWaterings.length} watering event(s) in the last 14 days in a ${plantProfile.potMaterial.replace(
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
            rationale:
              'Crassulaceae guardrail against foliar fungal spot and crown rot.',
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
      diagnosisSummary: `Your ${plantProfile.species.commonName} shows excellent turgor balance and compact growth${angleSummary}. Your current Soak-and-Dry cadence and ${plantProfile.potMaterial.replace(
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

  if (isPropagation) {
    return {
      healthStatus: 'thriving',
      detectedSymptoms: [
        'Active white primary taproot elongation with healthy lateral root primordia',
        'Apical meristem shoot emerging with bronze-green juvenile leaves',
      ],
      diagnosisSummary: `Your ${plantProfile.nickname} (${plantProfile.species.scientificName}) propagation is progressing strongly${angleSummary}. Timeline logs show steady taproot and stem elongation without vascular browning or biofilm accumulation.`,
      followUpQuestions: [
        'Has the primary stem reached 15–18 cm (6–7 inches) with at least 4–6 true leaves?',
      ],
      recommendedActions: [
        {
          instruction:
            'Refresh propagation water (or flush aerated substrate) with room-temperature filtered water to keep dissolved oxygen high.',
          urgency: 'soon',
          rationale:
            'Prevents anaerobic root tip browning on Persea americana.',
        },
        {
          instruction:
            'Pinch the top apical bud once the stem reaches 18 cm to stimulate lateral branching and a bushier canopy.',
          urgency: 'routine',
          rationale:
            'Breaks apical dominance so the sapling does not grow as a single spindly stalk.',
        },
        {
          instruction:
            'Prepare a 15 cm terracotta pot with 60% potting soil + 40% perlite for soil transition once roots are 10 cm long.',
          urgency: 'routine',
          rationale:
            'Avocado roots are highly sensitive to compacted, poorly aerated soil.',
        },
      ],
      adjustedWateringIntervalDays: 5,
    };
  }

  const hasStressNote =
    notesLower.includes('brown') || notesLower.includes('droop');
  return {
    healthStatus: hasStressNote ? 'needs_attention' : 'thriving',
    detectedSymptoms: hasStressNote
      ? [
          'Slight laminar droop and crispy leaf tip margins indicating overdue hydration or low ambient humidity',
        ]
      : ['Vibrant chlorophyll density and upright petiole posture'],
    diagnosisSummary: `Based on your ${plantProfile.species.commonName}'s care history in "${plantProfile.location}"${angleSummary}, the root zone is ready for a thorough top-to-bottom watering until 15% runoff exits the drainage holes.`,
    followUpQuestions: [
      'Is the top 5 cm (2 inches) of potting mix dry to the touch?',
    ],
    recommendedActions: [
      {
        instruction:
          'Water thoroughly with tepid water until excess drains freely from the bottom hole, then discard saucer water after 10 minutes.',
        urgency: 'immediate',
        rationale:
          'Flushes accumulated mineral salts and rehydrates the entire root ball.',
      },
      {
        instruction:
          'Wipe upper leaf surfaces with a damp microfiber cloth to maximize photosynthetic light capture.',
        urgency: 'routine',
        rationale:
          'Removes indoor dust buildup blocking stomata and light absorption.',
      },
    ],
    adjustedWateringIntervalDays:
      plantProfile.species.baselineCare.baseWateringDays,
  };
}
