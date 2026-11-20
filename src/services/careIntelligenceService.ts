/**
 * FloraLog — Adaptive Care Intelligence & Weather Advisory Service
 *
 * 1. Seasonal, hemisphere, pot-material & indoor/outdoor watering interval tuning
 * 2. Open-Meteo free weather forecast integration for outdoor frost & rain alerts
 */

import type {
  LightExposure,
  PlantType,
  PotMaterial,
} from '@/types/plant';

export type Hemisphere = 'northern' | 'southern';
export type BotanicalSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface AdaptiveIntervalSuggestion {
  suggestedIntervalDays: number;
  currentIntervalDays: number;
  season: BotanicalSeason;
  factors: string[];
  summary: string;
}

export interface OpenMeteoDailyForecast {
  time: string[];
  temperature_2m_min: number[];
  temperature_2m_max: number[];
  precipitation_sum: number[];
}

export interface WeatherCareAdvisory {
  fetchedAt: string;
  minTempC: number;
  maxTempC: number;
  totalPrecipitationMm: number;
  hasFrostAlert: boolean;
  hasHeavyRainDelay: boolean;
  recommendedPushbackDays: number;
  alerts: {
    kind: 'frost' | 'rain' | 'clear';
    title: string;
    message: string;
    urgency: 'immediate' | 'soon' | 'routine';
  }[];
}

export function getBotanicalSeason(
  date: Date = new Date(),
  hemisphere: Hemisphere = 'northern'
): BotanicalSeason {
  const month = date.getMonth(); // 0-11
  let northernSeason: BotanicalSeason;

  if (month >= 2 && month <= 4) {
    northernSeason = 'spring';
  } else if (month >= 5 && month <= 7) {
    northernSeason = 'summer';
  } else if (month >= 8 && month <= 10) {
    northernSeason = 'autumn';
  } else {
    northernSeason = 'winter';
  }

  if (hemisphere === 'northern') {
    return northernSeason;
  }

  const flip: Record<BotanicalSeason, BotanicalSeason> = {
    spring: 'autumn',
    summer: 'winter',
    autumn: 'spring',
    winter: 'summer',
  };
  return flip[northernSeason];
}

const POT_MATERIAL_MULTIPLIER: Record<PotMaterial, number> = {
  terracotta: 0.85,
  fabric_grow_bag: 0.85,
  plastic_nursery: 1.1,
  ceramic_glazed: 1.15,
  glass_vessel: 1.0,
};

const POT_MATERIAL_LABEL: Record<PotMaterial, string> = {
  terracotta: 'Porous terracotta dries faster',
  fabric_grow_bag: 'Breathable fabric bag dries faster',
  plastic_nursery: 'Plastic nursery pot retains moisture longer',
  ceramic_glazed: 'Glazed ceramic retains moisture longer',
  glass_vessel: 'Glass propagation vessel',
};

const SEASON_MULTIPLIER: Record<BotanicalSeason, number> = {
  spring: 0.95,
  summer: 0.85,
  autumn: 1.05,
  winter: 1.35,
};

const LIGHT_MULTIPLIER: Record<LightExposure, number> = {
  bright_direct: 0.9,
  bright_indirect: 1.0,
  medium_filtered: 1.08,
  low_shade: 1.2,
  grow_light: 0.95,
};

export function computeAdaptiveWateringInterval(
  params: {
    baseWateringDays: number;
    currentIntervalDays: number;
    plantType: PlantType;
    potMaterial: PotMaterial;
    isIndoor: boolean;
    lightExposure: LightExposure;
    minimumDryBackDays?: number;
  },
  options: {
    hemisphere?: Hemisphere;
    referenceDate?: Date;
  } = {}
): AdaptiveIntervalSuggestion {
  const hemisphere = options.hemisphere ?? 'northern';
  const referenceDate = options.referenceDate ?? new Date();
  const season = getBotanicalSeason(referenceDate, hemisphere);
  const factors: string[] = [];

  // Water-suspended propagations only need regular oxygen/water refreshes
  if (
    params.plantType === 'propagation' &&
    params.potMaterial === 'glass_vessel'
  ) {
    const suggested = Math.max(3, Math.round(params.baseWateringDays));
    return {
      suggestedIntervalDays: suggested,
      currentIntervalDays: params.currentIntervalDays,
      season,
      factors: ['Water propagation reservoir refresh cycle'],
      summary: `Keep water refreshed every ${suggested} days to maintain dissolved oxygen.`,
    };
  }

  let multiplier = 1.0;

  // 1. Season factor
  const seasonMult = SEASON_MULTIPLIER[season];
  multiplier *= seasonMult;
  if (season === 'winter') {
    factors.push('Winter dormancy slows transpiration (+35% dry-back)');
  } else if (season === 'summer') {
    factors.push('Summer warmth & active growth increase uptake (-15%)');
  } else if (season === 'spring') {
    factors.push('Spring active growth flush (-5%)');
  } else {
    factors.push('Autumn cooling slows evaporation (+5%)');
  }

  // 2. Pot material factor
  const potMult = POT_MATERIAL_MULTIPLIER[params.potMaterial] ?? 1.0;
  multiplier *= potMult;
  factors.push(POT_MATERIAL_LABEL[params.potMaterial]);

  // 3. Indoor vs Outdoor factor
  if (!params.isIndoor && season !== 'winter') {
    multiplier *= 0.85;
    factors.push('Outdoor airflow & sun accelerate evaporation (-15%)');
  } else if (params.isIndoor) {
    factors.push('Indoor climate-buffered evaporation');
  }

  // 4. Light exposure factor
  const lightMult = LIGHT_MULTIPLIER[params.lightExposure] ?? 1.0;
  multiplier *= lightMult;

  const rawSuggested = Math.round(params.baseWateringDays * multiplier);
  const minFloor =
    params.plantType === 'succulent'
      ? Math.max(12, params.minimumDryBackDays ?? 12)
      : Math.max(2, params.minimumDryBackDays ?? 2);

  const suggestedIntervalDays = Math.max(minFloor, rawSuggested);

  const delta = suggestedIntervalDays - params.currentIntervalDays;
  const summary =
    delta === 0
      ? `Your ${params.currentIntervalDays}-day interval is already optimal for ${season}.`
      : delta > 0
        ? `Consider extending from ${params.currentIntervalDays}d to ${suggestedIntervalDays}d for ${season} conditions.`
        : `Consider shortening from ${params.currentIntervalDays}d to ${suggestedIntervalDays}d for ${season} conditions.`;

  return {
    suggestedIntervalDays,
    currentIntervalDays: params.currentIntervalDays,
    season,
    factors,
    summary,
  };
}

export function analyzeWeatherForecast(
  daily: OpenMeteoDailyForecast
): WeatherCareAdvisory {
  const mins = daily.temperature_2m_min.slice(0, 3);
  const maxes = daily.temperature_2m_max.slice(0, 3);
  const rains = daily.precipitation_sum.slice(0, 3);

  const minTempC = mins.length > 0 ? Math.min(...mins) : 15;
  const maxTempC = maxes.length > 0 ? Math.max(...maxes) : 22;
  const totalPrecipitationMm = rains.reduce((sum, val) => sum + (val || 0), 0);

  const hasFrostAlert = minTempC < 3;
  const hasHeavyRainDelay = totalPrecipitationMm >= 10;
  const recommendedPushbackDays = hasHeavyRainDelay
    ? totalPrecipitationMm >= 25
      ? 3
      : 2
    : 0;

  const alerts: WeatherCareAdvisory['alerts'] = [];

  if (hasFrostAlert) {
    const minTempF = Math.round((minTempC * 9) / 5 + 32);
    alerts.push({
      kind: 'frost',
      title: `Frost Alert (${minTempC.toFixed(1)}°C / ${minTempF}°F)`,
      message:
        'Overnight temperatures drop below 3°C (37°F). Move tender outdoor specimens indoors or cover with frost cloth tonight.',
      urgency: 'immediate',
    });
  }

  if (hasHeavyRainDelay) {
    alerts.push({
      kind: 'rain',
      title: `Rain-Adaptive Delay (${totalPrecipitationMm.toFixed(1)} mm forecast)`,
      message: `Significant rainfall expected over the next 72 hours. Push outdoor watering back by ${recommendedPushbackDays} days to avoid waterlogging.`,
      urgency: 'soon',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      kind: 'clear',
      title: 'Mild Outdoor Forecast',
      message: `Lows around ${minTempC.toFixed(1)}°C with ${totalPrecipitationMm.toFixed(1)} mm rain expected. Follow your normal watering cadence.`,
      urgency: 'routine',
    });
  }

  return {
    fetchedAt: new Date().toISOString(),
    minTempC,
    maxTempC,
    totalPrecipitationMm,
    hasFrostAlert,
    hasHeavyRainDelay,
    recommendedPushbackDays,
    alerts,
  };
}

export async function fetchOutdoorWeatherAdvisory(
  latitude: number,
  longitude: number
): Promise<WeatherCareAdvisory> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum` +
    `&timezone=auto&forecast_days=4`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    daily?: OpenMeteoDailyForecast;
  };

  if (!json.daily) {
    throw new Error('Missing daily forecast data from Open-Meteo.');
  }

  return analyzeWeatherForecast(json.daily);
}
