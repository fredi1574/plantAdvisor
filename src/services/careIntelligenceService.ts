/**
 * FloraLog — Adaptive Care Intelligence & Weather Advisory Service
 *
 * 1. Seasonal, hemisphere, pot-material & indoor/outdoor watering interval tuning
 * 2. Open-Meteo free weather forecast integration for outdoor frost & rain alerts
 * 3. 30-minute memory + AsyncStorage weather advisory cache per location & language
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n from '@/i18n';
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
  fromCache?: boolean;
  alerts: {
    kind: 'frost' | 'rain' | 'clear';
    title: string;
    message: string;
    urgency: 'immediate' | 'soon' | 'routine';
  }[];
}

export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;
const WEATHER_STORAGE_PREFIX = 'floralog_weather_v1:';

interface CachedWeatherEntry {
  advisory: WeatherCareAdvisory;
  cachedAtMs: number;
}

const memoryWeatherCache = new Map<string, CachedWeatherEntry>();

function buildWeatherCacheKey(
  latitude: number,
  longitude: number,
  language: string = i18n.language || 'en'
): string {
  const lang = language.startsWith('ru') ? 'ru' : 'en';
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}:${lang}`;
}

export function clearWeatherAdvisoryCache(): void {
  memoryWeatherCache.clear();
}

export async function getCachedWeatherAdvisory(
  latitude: number,
  longitude: number,
  nowMs: number = Date.now()
): Promise<WeatherCareAdvisory | null> {
  const key = buildWeatherCacheKey(latitude, longitude);
  const inMem = memoryWeatherCache.get(key);
  if (inMem && nowMs - inMem.cachedAtMs < WEATHER_CACHE_TTL_MS) {
    return { ...inMem.advisory, fromCache: true };
  }

  try {
    const raw = await AsyncStorage.getItem(`${WEATHER_STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeatherEntry;
    if (
      parsed &&
      parsed.advisory &&
      typeof parsed.cachedAtMs === 'number' &&
      nowMs - parsed.cachedAtMs < WEATHER_CACHE_TTL_MS
    ) {
      memoryWeatherCache.set(key, parsed);
      return { ...parsed.advisory, fromCache: true };
    }
  } catch {
    // Ignore cache read/parse failures
  }

  return null;
}

async function saveWeatherAdvisoryCache(
  latitude: number,
  longitude: number,
  advisory: WeatherCareAdvisory,
  nowMs: number = Date.now()
): Promise<void> {
  const key = buildWeatherCacheKey(latitude, longitude);
  const entry: CachedWeatherEntry = {
    advisory: { ...advisory, fromCache: false },
    cachedAtMs: nowMs,
  };
  memoryWeatherCache.set(key, entry);
  try {
    await AsyncStorage.setItem(
      `${WEATHER_STORAGE_PREFIX}${key}`,
      JSON.stringify(entry)
    );
  } catch {
    // Non-fatal if storage is full or unavailable
  }
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
      factors: [i18n.t('adaptiveCareEngine.propFactor')],
      summary: i18n.t('adaptiveCareEngine.propSummary', { days: suggested }),
    };
  }

  let multiplier = 1.0;

  // 1. Season factor
  const seasonMult = SEASON_MULTIPLIER[season];
  multiplier *= seasonMult;
  factors.push(i18n.t(`adaptiveCareEngine.seasonFactors.${season}`));

  // 2. Pot material factor
  const potMult = POT_MATERIAL_MULTIPLIER[params.potMaterial] ?? 1.0;
  multiplier *= potMult;
  factors.push(i18n.t(`adaptiveCareEngine.potFactors.${params.potMaterial}`));

  // 3. Indoor vs Outdoor factor
  if (!params.isIndoor && season !== 'winter') {
    multiplier *= 0.85;
    factors.push(i18n.t('adaptiveCareEngine.outdoorFactor'));
  } else if (params.isIndoor) {
    factors.push(i18n.t('adaptiveCareEngine.indoorFactor'));
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
  const localizedSeason = i18n.t(`adaptiveCareEngine.seasons.${season}`);
  const summary =
    delta === 0
      ? i18n.t('adaptiveCareEngine.summaryOptimal', {
          current: params.currentIntervalDays,
          season: localizedSeason,
        })
      : delta > 0
        ? i18n.t('adaptiveCareEngine.summaryExtend', {
            current: params.currentIntervalDays,
            suggested: suggestedIntervalDays,
            season: localizedSeason,
          })
        : i18n.t('adaptiveCareEngine.summaryShorten', {
            current: params.currentIntervalDays,
            suggested: suggestedIntervalDays,
            season: localizedSeason,
          });

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
      title: i18n.t('adaptiveCareEngine.weather.frostTitle', {
        tempC: minTempC.toFixed(1),
        tempF: minTempF,
      }),
      message: i18n.t('adaptiveCareEngine.weather.frostMessage'),
      urgency: 'immediate',
    });
  }

  if (hasHeavyRainDelay) {
    alerts.push({
      kind: 'rain',
      title: i18n.t('adaptiveCareEngine.weather.rainTitle', {
        mm: totalPrecipitationMm.toFixed(1),
      }),
      message: i18n.t('adaptiveCareEngine.weather.rainMessage', {
        days: recommendedPushbackDays,
      }),
      urgency: 'soon',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      kind: 'clear',
      title: i18n.t('adaptiveCareEngine.weather.clearTitle'),
      message: i18n.t('adaptiveCareEngine.weather.clearMessage', {
        tempC: minTempC.toFixed(1),
        mm: totalPrecipitationMm.toFixed(1),
      }),
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
    fromCache: false,
    alerts,
  };
}

export interface WeatherLocationResult {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  displayLabel: string;
}

export async function searchWeatherLocations(
  query: string,
  language = 'en'
): Promise<WeatherLocationResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const lang = language.startsWith('ru') ? 'ru' : 'en';
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(trimmed)}` +
    `&count=5&language=${lang}&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo geocoding failed (${response.status})`);
  }

  const json = (await response.json()) as {
    results?: {
      id: number;
      name: string;
      country?: string;
      admin1?: string;
      latitude: number;
      longitude: number;
    }[];
  };

  return (json.results ?? []).map((item) => {
    const parts = [item.name, item.admin1, item.country].filter(Boolean);
    return {
      id: item.id,
      name: item.name,
      country: item.country,
      admin1: item.admin1,
      latitude: item.latitude,
      longitude: item.longitude,
      displayLabel: parts.join(', '),
    };
  });
}

export async function fetchOutdoorWeatherAdvisory(
  latitude: number,
  longitude: number,
  options: { forceRefresh?: boolean } = {}
): Promise<WeatherCareAdvisory> {
  if (!options.forceRefresh) {
    const cached = await getCachedWeatherAdvisory(latitude, longitude);
    if (cached) return cached;
  }

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

  const advisory = analyzeWeatherForecast(json.daily);
  await saveWeatherAdvisoryCache(latitude, longitude, advisory);
  return advisory;
}
