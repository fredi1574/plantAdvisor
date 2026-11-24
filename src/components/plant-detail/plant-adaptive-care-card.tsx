import {
  CloudRain,
  MapPin,
  Search,
  SlidersHorizontal,
  Snowflake,
} from 'lucide-react-native';
import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  computeAdaptiveWateringInterval,
  fetchOutdoorWeatherAdvisory,
  searchWeatherLocations,
  type WeatherCareAdvisory,
  type WeatherLocationResult,
} from '@/services/careIntelligenceService';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

interface PlantAdaptiveCareCardProps {
  plant: UserPlant;
  onShowToast: (message: string) => void;
}

interface WeatherFetchState {
  isLoading: boolean;
  error: string | null;
  advisory: WeatherCareAdvisory | null;
}

type WeatherFetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; advisory: WeatherCareAdvisory }
  | { type: 'FETCH_ERROR'; error: string };

const INITIAL_WEATHER_FETCH_STATE: WeatherFetchState = {
  isLoading: false,
  error: null,
  advisory: null,
};

function weatherFetchReducer(
  state: WeatherFetchState,
  action: WeatherFetchAction
): WeatherFetchState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        isLoading: false,
        error: null,
        advisory: action.advisory,
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.error };
  }
}

/**
 * Displays seasonal/container adaptive watering recommendations and, for
 * outdoor specimens, an Open-Meteo weather forecast advisory card.
 * Persists hemisphere and outdoor coordinates in `usePlantStore`.
 */
export function PlantAdaptiveCareCard({
  plant,
  onShowToast,
}: PlantAdaptiveCareCardProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const adaptiveCarePrefs = usePlantStore((s) => s.adaptiveCarePrefs);
  const setAdaptiveCarePrefs = usePlantStore((s) => s.setAdaptiveCarePrefs);

  const [weather, dispatchWeather] = useReducer(
    weatherFetchReducer,
    INITIAL_WEATHER_FETCH_STATE
  );
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<WeatherLocationResult[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [citySearchTouched, setCitySearchTouched] = useState(false);

  const adaptiveInterval = computeAdaptiveWateringInterval(
    {
      baseWateringDays: plant.species.baselineCare.baseWateringDays,
      currentIntervalDays: plant.customWateringIntervalDays,
      plantType: plant.species.plantType,
      potMaterial: plant.potMaterial,
      isIndoor: plant.isIndoor,
      lightExposure: plant.lightExposure,
      minimumDryBackDays:
        plant.species.baselineCare.succulentGuardrails.minimumDryBackDays,
    },
    { hemisphere: adaptiveCarePrefs.hemisphere }
  );

  const handleApplyAdaptiveInterval = () => {
    updatePlant(plant.id, {
      customWateringIntervalDays: adaptiveInterval.suggestedIntervalDays,
    });
    triggerSuccessHaptic();
    onShowToast(
      t('plantDetail.adaptiveCare.appliedToast', {
        days: adaptiveInterval.suggestedIntervalDays,
      })
    );
  };

  const handleFetchWeatherForCoords = async (lat: number, lon: number) => {
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      dispatchWeather({
        type: 'FETCH_ERROR',
        error: t('plantDetail.adaptiveCare.weatherError'),
      });
      return;
    }

    dispatchWeather({ type: 'FETCH_START' });
    try {
      const advisory = await fetchOutdoorWeatherAdvisory(lat, lon);
      dispatchWeather({ type: 'FETCH_SUCCESS', advisory });
      triggerLightHaptic();
    } catch (err) {
      dispatchWeather({
        type: 'FETCH_ERROR',
        error:
          err instanceof Error
            ? err.message
            : t('plantDetail.adaptiveCare.weatherError'),
      });
    }
  };

  const handleFetchWeather = async () => {
    await handleFetchWeatherForCoords(
      Number(adaptiveCarePrefs.latitude),
      Number(adaptiveCarePrefs.longitude)
    );
  };

  const handleSearchCities = async () => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setCityResults([]);
      return;
    }
    setIsSearchingCities(true);
    setCitySearchTouched(true);
    try {
      const results = await searchWeatherLocations(trimmed, i18n.language);
      setCityResults(results);
    } catch {
      setCityResults([]);
    } finally {
      setIsSearchingCities(false);
    }
  };

  const handleSelectCity = (loc: WeatherLocationResult) => {
    triggerLightHaptic();
    const latStr = loc.latitude.toFixed(2);
    const lonStr = loc.longitude.toFixed(2);
    const hemisphere = loc.latitude < 0 ? 'southern' : 'northern';
    setAdaptiveCarePrefs({
      cityName: loc.displayLabel,
      latitude: latStr,
      longitude: lonStr,
      hemisphere,
    });
    setCityQuery('');
    setCityResults([]);
    setCitySearchTouched(false);
    void handleFetchWeatherForCoords(loc.latitude, loc.longitude);
  };

  return (
    <SurfaceCard variant="glass">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <SlidersHorizontal size={16} color={palette.primary} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            {t('plantDetail.adaptiveCare.title')}
          </Text>
        </View>
        <Chip
          label={
            adaptiveCarePrefs.hemisphere === 'northern'
              ? t('plantDetail.adaptiveCare.northHemisphere')
              : t('plantDetail.adaptiveCare.southHemisphere')
          }
          variant="subtle"
          onPress={() =>
            setAdaptiveCarePrefs({
              hemisphere:
                adaptiveCarePrefs.hemisphere === 'northern'
                  ? 'southern'
                  : 'northern',
            })
          }
          textStyle={{ fontWeight: '600', color: palette.textSecondary }}
        />
      </View>

      <Text style={[styles.summary, { color: palette.textPrimary }]}>
        {adaptiveInterval.summary}
      </Text>

      <View style={styles.factorsList}>
        {adaptiveInterval.factors.map((factor, idx) => (
          <Text
            key={idx}
            style={[styles.factorText, { color: palette.textSecondary }]}>
            • {factor}
          </Text>
        ))}
      </View>

      {adaptiveInterval.suggestedIntervalDays !==
        plant.customWateringIntervalDays && (
        <Pressable
          onPress={handleApplyAdaptiveInterval}
          style={[styles.applyBtn, { backgroundColor: palette.primary }]}>
          <Text style={[styles.applyBtnText, { color: palette.textInverse }]}>
            {t('plantDetail.adaptiveCare.applyBtn', {
              days: adaptiveInterval.suggestedIntervalDays,
            })}
          </Text>
        </Pressable>
      )}

      {!plant.isIndoor && (
        <View
          style={[
            styles.weatherSection,
            { borderTopColor: palette.borderSubtle },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <CloudRain size={15} color={palette.waterBlue} />
              <Text
                style={[styles.weatherTitle, { color: palette.textPrimary }]}>
                {t('plantDetail.adaptiveCare.weatherTitle')}
              </Text>
            </View>
            <Chip
              label={
                weather.advisory
                  ? t('plantDetail.adaptiveCare.refreshWeather')
                  : t('plantDetail.adaptiveCare.checkWeather')
              }
              variant="primarySoft"
              loading={weather.isLoading}
              onPress={() => void handleFetchWeather()}
            />
          </View>

          <View style={styles.selectedCityRow}>
            <MapPin size={13} color={palette.primary} />
            <Text
              style={[styles.selectedCityText, { color: palette.textPrimary }]}
              numberOfLines={1}>
              {adaptiveCarePrefs.cityName ||
                `${adaptiveCarePrefs.latitude}, ${adaptiveCarePrefs.longitude}`}
            </Text>
          </View>

          <View style={styles.citySearchRow}>
            <BotanicalInput
              surface="subtle"
              value={cityQuery}
              onChangeText={(val) => {
                setCityQuery(val);
                if (!val.trim()) {
                  setCityResults([]);
                  setCitySearchTouched(false);
                }
              }}
              onSubmitEditing={() => void handleSearchCities()}
              returnKeyType="search"
              placeholder={t('plantDetail.adaptiveCare.citySearchPlaceholder')}
              style={styles.citySearchInput}
            />
            <Pressable
              onPress={() => void handleSearchCities()}
              accessibilityRole="button"
              accessibilityLabel="Search city"
              style={({ pressed }) => [
                styles.citySearchBtn,
                {
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primaryBorder,
                },
                pressed && { opacity: 0.78 },
              ]}>
              <Search size={15} color={palette.primary} />
            </Pressable>
          </View>

          {isSearchingCities ? (
            <Text style={[styles.factorText, { color: palette.textMuted }]}>
              {t('plantDetail.adaptiveCare.searchingCities')}
            </Text>
          ) : cityResults.length > 0 ? (
            <View style={styles.cityChipsRow}>
              {cityResults.map((loc) => (
                <Chip
                  key={loc.id}
                  label={loc.displayLabel}
                  variant="subtle"
                  size="sm"
                  onPress={() => handleSelectCity(loc)}
                />
              ))}
            </View>
          ) : citySearchTouched ? (
            <Text style={[styles.factorText, { color: palette.textMuted }]}>
              {t('plantDetail.adaptiveCare.noCitiesFound')}
            </Text>
          ) : null}

          {weather.error ? (
            <Text style={[styles.factorText, { color: palette.criticalText }]}>
              {weather.error}
            </Text>
          ) : null}

          {weather.advisory &&
            weather.advisory.alerts.map((alert, idx) => (
              <View
                key={idx}
                style={[
                  styles.alertBox,
                  {
                    backgroundColor:
                      alert.kind === 'frost'
                        ? palette.criticalBg
                        : alert.kind === 'rain'
                          ? palette.waterAlertBg
                          : palette.bgSubtle,
                    borderColor:
                      alert.kind === 'frost'
                        ? palette.criticalBorder
                        : alert.kind === 'rain'
                          ? palette.waterAlertBorder
                          : palette.borderSubtle,
                  },
                ]}>
                <View style={styles.titleRow}>
                  {alert.kind === 'frost' ? (
                    <Snowflake size={14} color={palette.criticalText} />
                  ) : (
                    <CloudRain size={14} color={palette.waterBlue} />
                  )}
                  <Text
                    style={[
                      styles.alertTitle,
                      {
                        color:
                          alert.kind === 'frost'
                            ? palette.criticalText
                            : palette.textPrimary,
                      },
                    ]}>
                    {alert.title}
                  </Text>
                </View>
                <Text
                  style={[styles.factorText, { color: palette.textSecondary }]}>
                  {alert.message}
                </Text>
              </View>
            ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  summary: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  factorsList: {
    gap: 3,
  },
  factorText: {
    fontSize: 12,
    lineHeight: 17,
  },
  applyBtn: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.half,
  },
  applyBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  weatherSection: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: BorderWidth.hairline,
    gap: Spacing.xs,
  },
  weatherTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  selectedCityText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  citySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  citySearchInput: {
    flex: 1,
  },
  citySearchBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  alertBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  alertTitle: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
