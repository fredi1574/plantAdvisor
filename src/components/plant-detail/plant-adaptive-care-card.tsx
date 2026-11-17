import { CloudRain, SlidersHorizontal, Snowflake } from 'lucide-react-native';
import { useMemo, useReducer, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CardShadow,
  Radius,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  computeAdaptiveWateringInterval,
  fetchOutdoorWeatherAdvisory,
  type Hemisphere,
  type WeatherCareAdvisory,
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

interface WeatherState {
  latitudeInput: string;
  longitudeInput: string;
  isLoading: boolean;
  error: string | null;
  advisory: WeatherCareAdvisory | null;
}

type WeatherAction =
  | { type: 'SET_LATITUDE'; value: string }
  | { type: 'SET_LONGITUDE'; value: string }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; advisory: WeatherCareAdvisory }
  | { type: 'FETCH_ERROR'; error: string };

const INITIAL_WEATHER_STATE: WeatherState = {
  latitudeInput: '40.71',
  longitudeInput: '-74.01',
  isLoading: false,
  error: null,
  advisory: null,
};

function weatherReducer(
  state: WeatherState,
  action: WeatherAction
): WeatherState {
  switch (action.type) {
    case 'SET_LATITUDE':
      return { ...state, latitudeInput: action.value };
    case 'SET_LONGITUDE':
      return { ...state, longitudeInput: action.value };
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
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
 */
export function PlantAdaptiveCareCard({
  plant,
  onShowToast,
}: PlantAdaptiveCareCardProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const updatePlant = usePlantStore((s) => s.updatePlant);

  const [hemisphere, setHemisphere] = useState<Hemisphere>('northern');
  const [weather, dispatchWeather] = useReducer(
    weatherReducer,
    INITIAL_WEATHER_STATE
  );

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
    { hemisphere }
  );

  const handleApplyAdaptiveInterval = () => {
    updatePlant(plant.id, {
      customWateringIntervalDays: adaptiveInterval.suggestedIntervalDays,
    });
    triggerSuccessHaptic();
    onShowToast(
      `Watering interval updated to every ${adaptiveInterval.suggestedIntervalDays} days.`
    );
  };

  const handleFetchWeather = async () => {
    const lat = Number(weather.latitudeInput);
    const lon = Number(weather.longitudeInput);
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
        error: 'Enter valid latitude (-90..90) and longitude (-180..180).',
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
            : 'Unable to fetch Open-Meteo forecast.',
      });
    }
  };

  return (
    <View style={styles.adaptiveCard}>
      <View style={styles.adaptiveHeader}>
        <View style={styles.adaptiveTitleRow}>
          <SlidersHorizontal size={16} color={palette.primary} />
          <Text style={styles.adaptiveTitle}>Adaptive Care Intelligence</Text>
        </View>
        <Pressable
          onPress={() =>
            setHemisphere((h) => (h === 'northern' ? 'southern' : 'northern'))
          }
          style={styles.hemispherePill}>
          <Text style={styles.hemispherePillText}>
            {hemisphere === 'northern' ? 'N. Hemisphere' : 'S. Hemisphere'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.adaptiveSummary}>{adaptiveInterval.summary}</Text>

      <View style={styles.adaptiveFactorsList}>
        {adaptiveInterval.factors.map((factor, idx) => (
          <Text key={idx} style={styles.adaptiveFactorText}>
            • {factor}
          </Text>
        ))}
      </View>

      {adaptiveInterval.suggestedIntervalDays !==
        plant.customWateringIntervalDays && (
        <Pressable
          onPress={handleApplyAdaptiveInterval}
          style={styles.applyAdaptiveBtn}>
          <Text style={styles.applyAdaptiveBtnText}>
            Apply {adaptiveInterval.suggestedIntervalDays}-Day Interval
          </Text>
        </Pressable>
      )}

      {!plant.isIndoor && (
        <View style={styles.weatherSection}>
          <View style={styles.weatherHeaderRow}>
            <View style={styles.adaptiveTitleRow}>
              <CloudRain size={15} color={palette.waterBlue} />
              <Text style={styles.weatherTitle}>
                Outdoor Forecast (Open-Meteo)
              </Text>
            </View>
            <Pressable
              onPress={handleFetchWeather}
              disabled={weather.isLoading}
              style={styles.weatherFetchBtn}>
              {weather.isLoading ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <Text style={styles.weatherFetchBtnText}>
                  {weather.advisory ? 'Refresh' : 'Check Weather'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.coordRow}>
            <TextInput
              value={weather.latitudeInput}
              onChangeText={(value) =>
                dispatchWeather({ type: 'SET_LATITUDE', value })
              }
              placeholder="Lat"
              placeholderTextColor={palette.textMuted}
              keyboardType="numeric"
              style={styles.coordInput}
            />
            <TextInput
              value={weather.longitudeInput}
              onChangeText={(value) =>
                dispatchWeather({ type: 'SET_LONGITUDE', value })
              }
              placeholder="Lon"
              placeholderTextColor={palette.textMuted}
              keyboardType="numeric"
              style={styles.coordInput}
            />
          </View>

          {weather.error ? (
            <Text
              style={[
                styles.adaptiveFactorText,
                { color: palette.criticalText },
              ]}>
              {weather.error}
            </Text>
          ) : null}

          {weather.advisory &&
            weather.advisory.alerts.map((alert, idx) => (
              <View
                key={idx}
                style={[
                  styles.weatherAlertBox,
                  alert.kind === 'frost' && {
                    backgroundColor: palette.criticalBg,
                    borderColor: palette.criticalBorder,
                  },
                  alert.kind === 'rain' && {
                    backgroundColor: palette.waterAlertBg,
                    borderColor: palette.waterAlertBorder,
                  },
                ]}>
                <View style={styles.adaptiveTitleRow}>
                  {alert.kind === 'frost' ? (
                    <Snowflake size={14} color={palette.criticalText} />
                  ) : (
                    <CloudRain size={14} color={palette.waterBlue} />
                  )}
                  <Text
                    style={[
                      styles.weatherAlertTitle,
                      alert.kind === 'frost' && {
                        color: palette.criticalText,
                      },
                    ]}>
                    {alert.title}
                  </Text>
                </View>
                <Text style={styles.adaptiveFactorText}>{alert.message}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    adaptiveCard: {
      backgroundColor: palette.glassSurface,
      borderWidth: 1,
      borderColor: palette.glassBorder,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      gap: Spacing.sm,
      ...CardShadow,
    },
    adaptiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.xs,
    },
    adaptiveTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    adaptiveTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    hemispherePill: {
      backgroundColor: palette.bgSubtle,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    hemispherePillText: {
      fontSize: 11,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    adaptiveSummary: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary,
      lineHeight: 19,
    },
    adaptiveFactorsList: {
      gap: 3,
    },
    adaptiveFactorText: {
      fontSize: 12,
      color: palette.textSecondary,
      lineHeight: 17,
    },
    applyAdaptiveBtn: {
      alignSelf: 'flex-start',
      backgroundColor: palette.primary,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      marginTop: 2,
    },
    applyAdaptiveBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textInverse,
    },
    weatherSection: {
      marginTop: Spacing.xs,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: palette.borderSubtle,
      gap: Spacing.xs,
    },
    weatherHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    weatherTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    weatherFetchBtn: {
      backgroundColor: palette.primarySoft,
      borderWidth: 1,
      borderColor: palette.primaryBorder,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
    },
    weatherFetchBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.primary,
    },
    coordRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    coordInput: {
      flex: 1,
      backgroundColor: palette.bgSubtle,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      fontSize: 12,
      color: palette.textPrimary,
    },
    weatherAlertBox: {
      backgroundColor: palette.bgSubtle,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      gap: 4,
    },
    weatherAlertTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textPrimary,
    },
  });
