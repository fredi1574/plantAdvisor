import { Image } from 'expo-image';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeCommonName, localizeLocation } from '@/i18n/plantDisplay';
import { triggerLightHaptic } from '@/services/haptics';
import type { UserPlant } from '@/types/plant';

interface PlantSelectorFieldProps {
  plants: UserPlant[];
  selectedPlant: UserPlant | undefined;
  onSelectPlant: (plantId: string) => void;
}

/**
 * Compact searchable dropdown picker for selecting a specimen in AI Health Scan.
 * Scales cleanly to large collections without cluttering the scan screen.
 */
export function PlantSelectorField({
  plants,
  selectedPlant,
  onSelectPlant,
}: PlantSelectorFieldProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredPlants = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plants;
    return plants.filter(
      (p) =>
        p.nickname.toLowerCase().includes(q) ||
        p.species.commonName.toLowerCase().includes(q) ||
        localizeCommonName(p.species.commonName, i18n.language)
          .toLowerCase()
          .includes(q) ||
        p.species.scientificName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        localizeLocation(p.location, i18n.language).toLowerCase().includes(q)
    );
  }, [plants, query, i18n.language]);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
  };

  if (plants.length === 0) {
    return (
      <View
        style={[
          styles.emptyBox,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          {t('scan.selector.emptyGarden')}
        </Text>
      </View>
    );
  }

  return (
    <>
      <SpringPressable
        pressedScale={0.985}
        onPress={() => {
          triggerLightHaptic();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          selectedPlant
            ? `Selected plant ${selectedPlant.nickname}. Tap to change specimen.`
            : 'Choose a plant to scan'
        }
        style={[
          styles.trigger,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        {selectedPlant ? (
          <>
            <Image
              source={{ uri: selectedPlant.photoUri }}
              style={[
                styles.triggerThumb,
                { backgroundColor: palette.bgSubtle },
              ]}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
            <View style={styles.triggerTextCol}>
              <Text
                style={[styles.triggerTitle, { color: palette.textPrimary }]}
                numberOfLines={1}>
                {selectedPlant.nickname}
              </Text>
              <Text
                style={[
                  styles.triggerSubtitle,
                  { color: palette.textSecondary },
                ]}
                numberOfLines={1}>
                {localizeCommonName(
                  selectedPlant.species.commonName,
                  i18n.language
                )}{' '}
                • {localizeLocation(selectedPlant.location, i18n.language)}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.triggerTextCol}>
            <Text style={[styles.triggerTitle, { color: palette.textMuted }]}>
              {t('scan.selector.choosePlaceholder')}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.chevronBadge,
            { backgroundColor: palette.primarySoft },
          ]}>
          <ChevronDown size={16} color={palette.primary} />
        </View>
      </SpringPressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}>
        <View style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.bgSurface,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: palette.textPrimary, fontFamily: Fonts?.serif },
                  ]}>
                  {t('scan.selector.sheetTitle')}
                </Text>
                <Text
                  style={[styles.sheetSub, { color: palette.textSecondary }]}>
                  {t('scan.selector.inGarden', { count: plants.length })}
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close plant selector"
                style={[
                  styles.closeBtn,
                  { backgroundColor: palette.bgSubtle },
                ]}>
                <X size={16} color={palette.textSecondary} />
              </Pressable>
            </View>

            {plants.length >= 4 && (
              <View
                style={[
                  styles.searchWrap,
                  {
                    backgroundColor: palette.bgPrimary,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <Search size={15} color={palette.textMuted} />
                <BotanicalInput
                  surface="primary"
                  compact={false}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('scan.selector.searchPlaceholder')}
                  accessibilityLabel="Search garden plants"
                  style={styles.searchInput}
                />
              </View>
            )}

            <FlatList
              data={filteredPlants}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text
                  style={[styles.noMatchText, { color: palette.textMuted }]}>
                  {t('scan.selector.noMatch', { query })}
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === selectedPlant?.id;
                return (
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      onSelectPlant(item.id);
                      handleClose();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? palette.primarySoft
                          : pressed
                            ? palette.bgSubtle
                            : 'transparent',
                        borderColor: isSelected
                          ? palette.primaryBorder
                          : 'transparent',
                      },
                    ]}>
                    <Image
                      source={{ uri: item.photoUri }}
                      style={[
                        styles.optionThumb,
                        { backgroundColor: palette.bgSubtle },
                      ]}
                      contentFit="cover"
                      transition={180}
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.optionTextCol}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: palette.textPrimary },
                        ]}
                        numberOfLines={1}>
                        {item.nickname}
                      </Text>
                      <Text
                        style={[
                          styles.optionSpecies,
                          { color: palette.textSecondary },
                        ]}
                        numberOfLines={1}>
                        {localizeCommonName(
                          item.species.commonName,
                          i18n.language
                        )}
                      </Text>
                      <View style={styles.optionLocRow}>
                        <MapPin size={11} color={palette.textMuted} />
                        <Text
                          style={[
                            styles.optionLoc,
                            { color: palette.textMuted },
                          ]}
                          numberOfLines={1}>
                          {localizeLocation(item.location, i18n.language)}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: palette.primary },
                        ]}>
                        <Check size={13} color={palette.textInverse} />
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  emptyText: {
    ...Typography.caption,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
  },
  triggerThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  triggerTextCol: {
    flex: 1,
    gap: 2,
  },
  triggerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  triggerSubtitle: {
    ...Typography.caption,
  },
  chevronBadge: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '78%',
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sheetTitle: {
    ...Typography.sectionTitle,
  },
  sheetSub: {
    ...Typography.caption,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: Spacing.xs,
  },
  noMatchText: {
    ...Typography.body,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  optionThumb: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
  },
  optionTextCol: {
    flex: 1,
    gap: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSpecies: {
    fontSize: 12,
  },
  optionLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  optionLoc: {
    fontSize: 11,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
