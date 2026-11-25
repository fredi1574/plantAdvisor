import { Globe, MapPin, Search } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  searchWeatherLocations,
  type Hemisphere,
  type WeatherLocationResult,
} from '@/services/careIntelligenceService';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';

interface LocationClimateCardProps {
  onShowToast: (message: string) => void;
}

export function LocationClimateCard({
  onShowToast,
}: LocationClimateCardProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const adaptiveCarePrefs = usePlantStore((s) => s.adaptiveCarePrefs);
  const setAdaptiveCarePrefs = usePlantStore((s) => s.setAdaptiveCarePrefs);

  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<WeatherLocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);

  const handleSearch = async () => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setCityResults([]);
      return;
    }
    setIsSearching(true);
    setSearchTouched(true);
    try {
      const results = await searchWeatherLocations(trimmed, i18n.language);
      setCityResults(results);
    } catch {
      setCityResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = (loc: WeatherLocationResult) => {
    triggerLightHaptic();
    const hemisphere: Hemisphere = loc.latitude < 0 ? 'southern' : 'northern';
    setAdaptiveCarePrefs({
      cityName: loc.displayLabel,
      latitude: loc.latitude.toFixed(2),
      longitude: loc.longitude.toFixed(2),
      hemisphere,
    });
    setCityQuery('');
    setCityResults([]);
    setSearchTouched(false);
    onShowToast(
      t('profile.locationClimate.updatedToast', { city: loc.displayLabel })
    );
  };

  const handleHemisphereChange = (hemisphere: Hemisphere) => {
    if (adaptiveCarePrefs.hemisphere === hemisphere) return;
    triggerLightHaptic();
    setAdaptiveCarePrefs({ hemisphere });
    onShowToast(
      t('profile.locationClimate.hemisphereToast', {
        hemisphere:
          hemisphere === 'northern'
            ? t('profile.locationClimate.northOption')
            : t('profile.locationClimate.southOption'),
      })
    );
  };

  return (
    <View style={styles.sectionGroup}>
      <Text style={[styles.sectionEyebrow, { color: palette.textMuted }]}>
        {t('profile.locationClimate.eyebrow')}
      </Text>

      <SurfaceCard variant="elevated" style={styles.card}>
        <View style={styles.currentRow}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: palette.primarySoft },
            ]}>
            <MapPin size={15} color={palette.primary} />
          </View>
          <View style={styles.currentCopy}>
            <Text style={[styles.currentLabel, { color: palette.textMuted }]}>
              {t('profile.locationClimate.currentCity')}
            </Text>
            <Text
              style={[styles.currentValue, { color: palette.textPrimary }]}
              numberOfLines={1}>
              {adaptiveCarePrefs.cityName ||
                `${adaptiveCarePrefs.latitude}, ${adaptiveCarePrefs.longitude}`}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <BotanicalInput
            surface="subtle"
            value={cityQuery}
            onChangeText={(val) => {
              setCityQuery(val);
              if (!val.trim()) {
                setCityResults([]);
                setSearchTouched(false);
              }
            }}
            onSubmitEditing={() => void handleSearch()}
            returnKeyType="search"
            placeholder={t('profile.locationClimate.searchPlaceholder')}
            style={styles.searchInput}
          />
          <Pressable
            onPress={() => void handleSearch()}
            accessibilityRole="button"
            accessibilityLabel={t('profile.locationClimate.searchPlaceholder')}
            style={({ pressed }) => [
              styles.searchBtn,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primaryBorder,
              },
              pressed && { opacity: 0.78 },
            ]}>
            <Search size={16} color={palette.primary} />
          </Pressable>
        </View>

        {isSearching ? (
          <Text style={[styles.helperText, { color: palette.textMuted }]}>
            {t('profile.locationClimate.searching')}
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
        ) : searchTouched ? (
          <Text style={[styles.helperText, { color: palette.textMuted }]}>
            {t('profile.locationClimate.noCitiesFound')}
          </Text>
        ) : null}

        <View
          style={[
            styles.hemisphereRow,
            { borderTopColor: palette.borderSubtle },
          ]}>
          <View style={styles.hemisphereTitleRow}>
            <Globe size={14} color={palette.textSecondary} />
            <Text
              style={[styles.hemisphereLabel, { color: palette.textPrimary }]}>
              {t('profile.locationClimate.hemisphereLabel')}
            </Text>
          </View>
          <View style={styles.hemisphereChips}>
            <Chip
              label={t('profile.locationClimate.northOption')}
              size="sm"
              variant="subtle"
              selected={adaptiveCarePrefs.hemisphere === 'northern'}
              selectedStyle="solid"
              onPress={() => handleHemisphereChange('northern')}
            />
            <Chip
              label={t('profile.locationClimate.southOption')}
              size="sm"
              variant="subtle"
              selected={adaptiveCarePrefs.hemisphere === 'southern'}
              selectedStyle="solid"
              onPress={() => handleHemisphereChange('southern')}
            />
          </View>
        </View>

        <Text style={[styles.footnote, { color: palette.textMuted }]}>
          {t('profile.locationClimate.footnote')}
        </Text>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGroup: {
    gap: Spacing.sm,
  },
  sectionEyebrow: {
    ...Typography.eyebrow,
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCopy: {
    flex: 1,
    gap: 1,
  },
  currentLabel: {
    ...Typography.caption,
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
  },
  cityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hemisphereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: BorderWidth.hairline,
  },
  hemisphereTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hemisphereLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  hemisphereChips: {
    flexDirection: 'row',
    gap: 6,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
  },
});
