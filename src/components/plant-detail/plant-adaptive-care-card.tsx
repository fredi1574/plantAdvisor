import { CloudRain, SlidersHorizontal, Snowflake } from 'lucide-react-native';
import { useReducer } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  computeAdaptiveWateringInterval,
  fetchOutdoorWeatherAdvisory,
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
  const palette = usePalette();
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const adaptiveCarePrefs = usePlantStore((s) => s.adaptiveCarePrefs);
  const setAdaptiveCarePrefs = usePlantStore((s) => s.setAdaptiveCarePrefs);

  const [weather, dispatchWeather] = useReducer(
    weatherFetchReducer,
    INITIAL_WEATHER_FETCH_STATE
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
    { hemisphere: adaptiveCarePrefs.hemisphere }
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
    const lat = Number(adaptiveCarePrefs.latitude);
    const lon = Number(adaptiveCarePrefs.longitude);
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
    <SurfaceCard variant="glass">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <SlidersHorizontal size={16} color={palette.primary} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Adaptive Care Intelligence
          </Text>
        </View>
        <Chip
          label={
            adaptiveCarePrefs.hemisphere === 'northern'
              ? 'N. Hemisphere'
              : 'S. Hemisphere'
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
            Apply {adaptiveInterval.suggestedIntervalDays}-Day Interval
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
                Outdoor Forecast (Open-Meteo)
              </Text>
            </View>
            <Chip
              label={weather.advisory ? 'Refresh' : 'Check Weather'}
              variant="primarySoft"
              loading={weather.isLoading}
              onPress={() => void handleFetchWeather()}
            />
          </View>

          <View style={styles.coordRow}>
            <BotanicalInput
              surface="subtle"
              value={adaptiveCarePrefs.latitude}
              onChangeText={(value) => setAdaptiveCarePrefs({ latitude: value })}
              placeholder="Lat"
              keyboardType="numeric"
              style={styles.coordInput}
            />
            <BotanicalInput
              surface="subtle"
              value={adaptiveCarePrefs.longitude}
              onChangeText={(value) =>
                setAdaptiveCarePrefs({ longitude: value })
              }
              placeholder="Lon"
              keyboardType="numeric"
              style={styles.coordInput}
            />
          </View>

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
  coordRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  coordInput: {
    flex: 1,
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
