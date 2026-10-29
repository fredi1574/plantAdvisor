/**
 * FloraLog — Seeded Botanical Garden Data
 * Includes:
 * 1. Jade Plant (`Crassula ovata`) succulent with Crassulaceae guardrails & AI Health Assessment
 * 2. Avocado Seed Propagation (`Persea americana`) with chronological root/shoot milestones
 * 3. Swiss Cheese Plant (`Monstera deliciosa`) needing hydration today
 */

import type { NotebookEntry, UserPlant } from '@/types/plant';

const daysAgoIso = (days: number): string => {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
};

export const SEED_PLANTS: UserPlant[] = [
  {
    id: 'plant-jade-01',
    nickname: 'Sunny Window Jade',
    photoUri:
      'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=80',
    acquiredAt: daysAgoIso(120),
    location: 'South Living Room Sill',
    isIndoor: true,
    lightExposure: 'bright_indirect',
    hasDrainageHole: true,
    potMaterial: 'terracotta',
    lastWateredAt: daysAgoIso(5),
    customWateringIntervalDays: 16,
    species: {
      id: 'sp-crassula-ovata',
      commonName: 'Jade Plant',
      scientificName: 'Crassula ovata',
      family: 'Crassulaceae',
      plantType: 'succulent',
      baselineCare: {
        idealLight: 'Bright direct to strong indirect sun (4–6 hrs daily)',
        baseWateringDays: 14,
        soilRecommendation:
          '50% pumice/perlite + 50% sifted cactus compost in an unglazed terracotta pot.',
        succulentGuardrails: {
          isSucculentOrCactus: true,
          neverMistFoliage: true,
          soakAndDryRequired: true,
          minimumDryBackDays: 12,
          rotWarningNote:
            'Crassulaceae Guardrail: Never mist leaves or water on a shallow schedule. Wait for 100% soil dry-back between deep soakings.',
        },
      },
    },
    latestHealthAssessment: {
      id: 'ha-jade-01',
      plantId: 'plant-jade-01',
      createdAt: daysAgoIso(2),
      healthStatus: 'needs_attention',
      detectedSymptoms: [
        'Two lower leaves showing mild yellowing & edema spots after back-to-back waterings',
        'Slight internodal stretching (1.8 cm spacing) suggesting it wants stronger direct sun',
      ],
      diagnosisSummary:
        'Cross-referencing your photo with two watering logs in the past 12 days indicates mild rhizosphere moisture excess. Because Crassula ovata stores water in fleshy obovate leaves, it needs a longer dry-back period and brighter direct light.',
      followUpQuestions: [
        'Do the bottom leaves feel firm or soft/translucent when gently pinched?',
        'Is the bottom third of the terracotta pot completely dry when checked with a wooden skewer?',
      ],
      recommendedActions: [
        {
          id: 'act-jade-1',
          instruction:
            'Hold off on watering for the full 16-day interval until 100% of the gritty mix is bone-dry.',
          urgency: 'immediate',
          rationale: 'Prevents root hypoxia and lets swollen parenchyma cells rebalance.',
          completed: true,
        },
        {
          id: 'act-jade-2',
          instruction:
            'Shift 25 cm closer to the unobstructed South window pane for 4+ hours of direct sun.',
          urgency: 'soon',
          rationale: 'Tightens internode spacing and brings out healthy red leaf margins.',
          completed: false,
        },
        {
          id: 'act-jade-3',
          instruction:
            'Do NOT mist foliage; use only the "Soak and Dry" bottom-soak or soil drench method.',
          urgency: 'routine',
          rationale: 'Crassulaceae guardrail against foliar fungal rot.',
          completed: false,
        },
      ],
      adjustedWateringIntervalDays: 16,
      succulentGuardrailApplied:
        'Crassulaceae Guardrail Active: Misting & shallow watering disabled; 16-day Soak-and-Dry interval enforced.',
    },
  },
  {
    id: 'plant-avocado-02',
    nickname: 'Hass Pit #3 (Jar Prop)',
    photoUri:
      'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=900&q=80',
    acquiredAt: daysAgoIso(48),
    location: 'Kitchen East Counter',
    isIndoor: true,
    lightExposure: 'bright_indirect',
    hasDrainageHole: false,
    potMaterial: 'glass_vessel',
    lastWateredAt: daysAgoIso(6), // Interval is 5 days -> Needs Watering / Reservoir Refresh today!
    customWateringIntervalDays: 5,
    species: {
      id: 'sp-persea-americana',
      commonName: 'Avocado Seed Propagation',
      scientificName: 'Persea americana',
      family: 'Lauraceae',
      plantType: 'propagation',
      baselineCare: {
        idealLight: 'Bright indirect warmth (20–25°C) away from cold drafts',
        baseWateringDays: 5,
        soilRecommendation:
          'Clean oxygenated water suspension until taproot reaches 10 cm, then pot into 60% potting mix + 40% perlite.',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 3,
          rotWarningNote:
            'Keep the top half of the seed above the waterline and swap water every 5 days to maintain dissolved oxygen.',
        },
      },
    },
    latestHealthAssessment: {
      id: 'ha-avocado-01',
      plantId: 'plant-avocado-02',
      createdAt: daysAgoIso(4),
      healthStatus: 'thriving',
      detectedSymptoms: [
        'Vigorous 9.5 cm creamy-white primary taproot with secondary lateral root primordia',
        'Healthy 12 cm apical stem shoot with 4 bronze-green juvenile leaves unfurling',
      ],
      diagnosisSummary:
        'Your Persea americana seed propagation is in peak condition. Root elongation and apical shoot emergence are synchronized with zero signs of bacterial sliminess.',
      followUpQuestions: [
        'Are you planning to transition this sapling into an aerated perlite/soil terracotta pot within the next 2 weeks?',
      ],
      recommendedActions: [
        {
          id: 'act-avo-1',
          instruction:
            'Swap propagation jar water with fresh room-temperature filtered water to replenish dissolved oxygen.',
          urgency: 'immediate',
          rationale: 'Water renewal is due every 5 days to prevent hypoxic root tip browning.',
          completed: false,
        },
        {
          id: 'act-avo-2',
          instruction:
            'Pinch the top growth tip once the stem reaches 18 cm to encourage lateral branching.',
          urgency: 'routine',
          rationale: 'Breaks apical dominance for a sturdier, multi-branched canopy.',
          completed: false,
        },
      ],
      adjustedWateringIntervalDays: 5,
    },
  },
  {
    id: 'plant-monstera-03',
    nickname: 'Studio Monstera',
    photoUri:
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80',
    acquiredAt: daysAgoIso(210),
    location: 'Study Corner Moss Pole',
    isIndoor: true,
    lightExposure: 'bright_indirect',
    hasDrainageHole: true,
    potMaterial: 'ceramic_glazed',
    lastWateredAt: daysAgoIso(9), // Interval is 8 days -> Needs Watering!
    customWateringIntervalDays: 8,
    species: {
      id: 'sp-monstera-deliciosa',
      commonName: 'Swiss Cheese Plant',
      scientificName: 'Monstera deliciosa',
      family: 'Araceae',
      plantType: 'foliage',
      baselineCare: {
        idealLight: 'Bright indirect light (east or filtered south window)',
        baseWateringDays: 8,
        soilRecommendation:
          'Chunky aroid mix: 40% pine bark, 30% perlite, 30% coco coir + worm castings.',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 5,
          rotWarningNote: 'Allow the top 5 cm of chunky aroid mix to dry between deep waterings.',
        },
      },
    },
    latestHealthAssessment: {
      id: 'ha-monstera-01',
      plantId: 'plant-monstera-03',
      createdAt: daysAgoIso(9),
      healthStatus: 'thriving',
      detectedSymptoms: [
        'New fenestrated leaf with 6 inner perforations hardened off cleanly',
        'Aerial roots actively anchoring into coco coir pole',
      ],
      diagnosisSummary:
        'Strong photosynthetic vigor and healthy petiole turgor. Ready for its routine 8-day deep drench.',
      followUpQuestions: [],
      recommendedActions: [
        {
          id: 'act-mon-1',
          instruction:
            'Water thoroughly until 15% runoff drains from the bottom hole, then empty the catch saucer.',
          urgency: 'immediate',
          rationale: 'Scheduled 8-day hydration cycle is due today.',
          completed: false,
        },
      ],
      adjustedWateringIntervalDays: 8,
    },
  },
];

export const SEED_NOTEBOOK_ENTRIES: NotebookEntry[] = [
  // Jade Plant Timeline
  {
    id: 'log-jade-1',
    plantId: 'plant-jade-01',
    eventType: 'ai_scan',
    timestamp: daysAgoIso(2),
    title: 'AI Health & Condition Scan',
    notes:
      'Detected mild moisture stress on two lower leaves after two close waterings. Adjusted watering interval to 16 days with Crassulaceae Soak-and-Dry guardrails.',
    metrics: { soilMoisture: 'slightly_damp' },
  },
  {
    id: 'log-jade-2',
    plantId: 'plant-jade-01',
    eventType: 'water',
    timestamp: daysAgoIso(5),
    title: 'Top Watered (200 ml)',
    notes:
      'Watered slightly early before weekend trip; top 3 cm was dry but bottom of terracotta pot still held faint moisture.',
    metrics: { waterAmountMl: 200, soilMoisture: 'slightly_damp' },
  },
  {
    id: 'log-jade-3',
    plantId: 'plant-jade-01',
    eventType: 'water',
    timestamp: daysAgoIso(12),
    title: 'Deep Bottom Soak (Soak & Dry)',
    notes:
      'Bottom-soaked terracotta pot for 15 minutes after 14 days of complete dryness. Leaves plumped up within 24 hours.',
    metrics: { waterAmountMl: 350, soilMoisture: 'bone_dry' },
  },
  {
    id: 'log-jade-4',
    plantId: 'plant-jade-01',
    eventType: 'repot',
    timestamp: daysAgoIso(45),
    title: 'Repotted into 14 cm Unglazed Terracotta',
    notes:
      'Upgraded from plastic nursery pot to breathable terracotta with 50% pumice and 50% cactus soil.',
  },

  // Avocado Seed Propagation Timeline
  {
    id: 'log-avo-1',
    plantId: 'plant-avocado-02',
    eventType: 'propagation',
    timestamp: daysAgoIso(4),
    title: 'Milestone: 4 Juvenile Leaves Unfurled',
    notes:
      'Apical shoot reached 12.0 cm and expanded 4 glossy bronze-green leaves. Taproot measured at 9.5 cm with healthy white lateral roots.',
    metrics: { rootLengthCm: 9.5, stemHeightCm: 12.0, leafCount: 4 },
  },
  {
    id: 'log-avo-2',
    plantId: 'plant-avocado-02',
    eventType: 'water',
    timestamp: daysAgoIso(6),
    title: 'Propagation Reservoir Water Change',
    notes:
      'Replaced glass vessel water with fresh filtered water at 22°C; rinsed seed coat gently.',
    metrics: { waterAmountMl: 300 },
  },
  {
    id: 'log-avo-3',
    plantId: 'plant-avocado-02',
    eventType: 'propagation',
    timestamp: daysAgoIso(19),
    title: 'Milestone: Apical Stem Shoot Emerged',
    notes:
      'Plumule shoot broke through the top cleft of the split avocado pit! Taproot is now 5.8 cm long.',
    metrics: { rootLengthCm: 5.8, stemHeightCm: 2.4, leafCount: 0 },
  },
  {
    id: 'log-avo-4',
    plantId: 'plant-avocado-02',
    eventType: 'propagation',
    timestamp: daysAgoIso(34),
    title: 'Milestone: Vertical Pit Fissure & Taproot Tip',
    notes:
      'Seed split cleanly down the seam after 14 days in damp paper towel bag; transferred to glass propagation vessel with 2 cm root submerged.',
    metrics: { rootLengthCm: 2.0, stemHeightCm: 0 },
  },

  // Monstera Timeline
  {
    id: 'log-mon-1',
    plantId: 'plant-monstera-03',
    eventType: 'water',
    timestamp: daysAgoIso(9),
    title: 'Deep Drench + Liquid Kelp',
    notes: 'Watered with 600 ml filtered water + 1/4 strength seaweed extract until runoff.',
    metrics: { waterAmountMl: 600, soilMoisture: 'bone_dry' },
  },
  {
    id: 'log-mon-2',
    plantId: 'plant-monstera-03',
    eventType: 'note',
    timestamp: daysAgoIso(15),
    title: 'Guided Aerial Root into Moss Pole',
    notes: 'Tucked the longest 18 cm aerial root into the damp sphagnum pole with velcro plant tape.',
  },
];

