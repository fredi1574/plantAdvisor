import { MapPin, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SwitchRow } from '@/components/ui/switch-row';
import { LIGHT_EXPOSURE_OPTIONS } from '@/constants/plantOptions';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type { LightExposure } from '@/types/plant';

interface RoomPresetsSectionProps {
  onShowToast: (message: string) => void;
}

const EXPOSURE_LABEL_MAP = new Map(
  LIGHT_EXPOSURE_OPTIONS.map((opt) => [opt.key, opt.label])
);

/**
 * Inset grouped manager for reusable Room / Spot profiles in Profile & Settings.
 */
export function RoomPresetsSection({ onShowToast }: RoomPresetsSectionProps) {
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
    onShowToast(`Saved room preset "${trimmed}".`);
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          ROOM PRESETS
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
            {showComposer ? 'Close' : 'Add Spot'}
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
              placeholder="e.g., West Sunroom Shelf"
              accessibilityLabel="Room preset name"
            />
            <View style={styles.chipRow}>
              {LIGHT_EXPOSURE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  variant="subtle"
                  size="sm"
                  selected={lightExposure === opt.key}
                  selectedStyle="solid"
                  onPress={() => setLightExposure(opt.key)}
                />
              ))}
            </View>
            <SwitchRow
              label="Indoor Spot"
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
                Save Room Preset
              </Text>
            </SpringPressable>
          </View>
        )}

        {roomPresets.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No saved spots yet. Add your favorite windowsills or patio corners
              for quick plant setup.
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
                    {preset.name}
                  </Text>
                  <Text
                    style={[
                      styles.presetMeta,
                      { color: palette.textSecondary },
                    ]}
                    numberOfLines={1}>
                    {EXPOSURE_LABEL_MAP.get(preset.lightExposure) ??
                      preset.lightExposure.replace('_', ' ')}{' '}
                    • {preset.isIndoor ? 'Indoor' : 'Outdoor'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    deleteRoomPreset(preset.id);
                    onShowToast(`Removed "${preset.name}" preset.`);
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
        Saved spots auto-fill light exposure and indoor/outdoor defaults when
        adding or editing plants.
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
