import { MapPin, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SwitchRow } from '@/components/ui/switch-row';
import { LIGHT_EXPOSURE_OPTIONS } from '@/constants/plantOptions';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeLocation } from '@/i18n/plantDisplay';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type { LightExposure } from '@/types/plant';

interface RoomPresetsSectionProps {
  onShowToast: (message: string) => void;
}

/**
 * Inset grouped manager for reusable Room / Spot profiles in Profile & Settings.
 */
export function RoomPresetsSection({ onShowToast }: RoomPresetsSectionProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const roomPresets = usePlantStore((s) => s.roomPresets);
  const addRoomPreset = usePlantStore((s) => s.addRoomPreset);
  const deleteRoomPreset = usePlantStore((s) => s.deleteRoomPreset);

  const [showComposer, setShowComposer] = useState(false);
  const [name, setName] = useState('');
  const [lightExposure, setLightExposure] =
    useState<LightExposure>('bright_indirect');
  const [isIndoor, setIsIndoor] = useState(true);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    triggerLightHaptic();
    addRoomPreset({ name: trimmed, lightExposure, isIndoor });
    setName('');
    setShowComposer(false);
    onShowToast(t('profile.roomPresets.savedToast', { name: trimmed }));
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          {t('profile.roomPresets.eyebrow')}
        </Text>
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setShowComposer((prev) => !prev);
          }}
          accessibilityRole="button"
          accessibilityLabel={
            showComposer ? 'Cancel adding room preset' : 'Add room preset'
          }
          style={({ pressed }) => [
            styles.addToggleBtn,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
            pressed && { opacity: 0.78 },
          ]}>
          <Plus size={12} color={palette.primary} />
          <Text style={[styles.addToggleText, { color: palette.primary }]}>
            {showComposer ? t('common.close') : t('profile.roomPresets.addSpot')}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.groupedBox,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        {showComposer && (
          <View
            style={[
              styles.composerBlock,
              {
                backgroundColor: palette.bgPrimary,
                borderBottomColor: palette.borderSubtle,
              },
            ]}>
            <BotanicalInput
              surface="surface"
              compact={false}
              value={name}
              onChangeText={setName}
              placeholder={t('profile.roomPresets.placeholder')}
              accessibilityLabel="Room preset name"
            />
            <View style={styles.chipRow}>
              {LIGHT_EXPOSURE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={t(`plantOptions.lightExposure.${opt.key}`)}
                  variant="subtle"
                  size="sm"
                  selected={lightExposure === opt.key}
                  selectedStyle="solid"
                  onPress={() => setLightExposure(opt.key)}
                />
              ))}
            </View>
            <SwitchRow
              label={t('profile.roomPresets.indoorSpot')}
              value={isIndoor}
              onValueChange={setIsIndoor}
              contained={false}
            />
            <SpringPressable
              onPress={handleAdd}
              disabled={!name.trim()}
              accessibilityRole="button"
              accessibilityLabel="Save Room Preset"
              style={[
                styles.saveBtn,
                { backgroundColor: palette.primary },
                !name.trim() && { opacity: 0.5 },
              ]}>
              <Text
                style={[styles.saveBtnText, { color: palette.textInverse }]}>
                {t('profile.roomPresets.saveBtn')}
              </Text>
            </SpringPressable>
          </View>
        )}

        {roomPresets.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {t('profile.roomPresets.emptyText')}
            </Text>
          </View>
        ) : (
          roomPresets.map((preset, idx) => (
            <React.Fragment key={preset.id}>
              {idx > 0 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: palette.borderSubtle },
                  ]}
                />
              )}
              <View style={styles.presetRow}>
                <MapPin size={15} color={palette.primary} />
                <View style={styles.presetTextCol}>
                  <Text
                    style={[styles.presetName, { color: palette.textPrimary }]}
                    numberOfLines={1}>
                    {localizeLocation(preset.name, i18n.language)}
                  </Text>
                  <Text
                    style={[
                      styles.presetMeta,
                      { color: palette.textSecondary },
                    ]}
                    numberOfLines={1}>
                    {t(`plantOptions.lightExposure.${preset.lightExposure}`)} •{' '}
                    {preset.isIndoor
                      ? t('plantDetail.hero.indoor')
                      : t('plantDetail.hero.outdoor')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    deleteRoomPreset(preset.id);
                    onShowToast(
                      t('profile.roomPresets.removedToast', {
                        name: preset.name,
                      })
                    );
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${preset.name} preset`}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && { opacity: 0.65 },
                  ]}>
                  <Trash2 size={15} color={palette.textMuted} />
                </Pressable>
              </View>
            </React.Fragment>
          ))
        )}
      </View>

      <Text style={[styles.footnote, { color: palette.textMuted }]}>
        {t('profile.roomPresets.footnote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  addToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupedBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  composerBlock: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: BorderWidth.hairline,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: Radius.md,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyRow: {
    padding: Spacing.md,
  },
  emptyText: {
    ...Typography.caption,
  },
  divider: {
    height: BorderWidth.hairline,
    marginLeft: Spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  presetTextCol: {
    flex: 1,
    gap: 1,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetMeta: {
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  footnote: {
    ...Typography.caption,
    paddingHorizontal: Spacing.xs,
    lineHeight: 17,
  },
});
