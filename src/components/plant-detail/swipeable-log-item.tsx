import { Image } from 'expo-image';
import { Maximize2, Pencil, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { PhotoLightboxModal } from '@/components/ui/photo-lightbox-modal';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { BorderWidth, Radius, Spacing, type ThemePalette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import type { CareEventType, NotebookEntry } from '@/types/plant';

interface SwipeableLogItemProps {
  entry: NotebookEntry;
  isLast: boolean;
  onEdit: (entry: NotebookEntry) => void;
  onDelete: (entry: NotebookEntry) => void;
}

function getEventNodeColors(eventType: CareEventType, palette: ThemePalette) {
  switch (eventType) {
    case 'water':
      return { dot: palette.waterBlue, halo: palette.waterBlueSoft };
    case 'propagation':
    case 'repot':
      return {
        dot: palette.accentTerracotta,
        halo: palette.accentTerracottaSoft,
      };
    case 'ai_scan':
      return { dot: palette.attentionDot, halo: palette.attentionBg };
    case 'fertilize':
    case 'prune':
      return { dot: palette.primary, halo: palette.primarySoft };
    case 'note':
    default:
      return { dot: palette.primaryMuted, halo: palette.primarySoft };
  }
}

export function SwipeableLogItem({
  entry,
  isLast,
  onEdit,
  onDelete,
}: SwipeableLogItemProps) {
  const palette = usePalette();
  const [previewOpen, setPreviewOpen] = useState(false);

  const nodeColors = getEventNodeColors(entry.eventType, palette);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRailCol}>
        <View
          style={[
            styles.timelineNodeHalo,
            {
              backgroundColor: nodeColors.halo,
              borderColor: nodeColors.dot,
            },
          ]}>
          <View
            style={[styles.timelineNode, { backgroundColor: nodeColors.dot }]}
          />
        </View>
        {!isLast && (
          <View
            style={[
              styles.timelineVerticalLine,
              { backgroundColor: palette.borderSubtle },
            ]}
          />
        )}
      </View>

      <SwipeableRow
        openWidth={86}
        borderRadius={Radius.md}
        compact
        style={styles.swipeWrapper}
        leftAction={{
          label: 'Edit',
          icon: <Pencil size={15} color={palette.textInverse} />,
          backgroundColor: palette.primary,
          accessibilityLabel: `Edit log ${entry.title}`,
          onTrigger: () => onEdit(entry),
        }}
        rightAction={{
          label: 'Delete',
          icon: <Trash2 size={15} color={palette.textInverse} />,
          backgroundColor: palette.criticalDot,
          accessibilityLabel: `Delete log ${entry.title}`,
          onTrigger: () => onDelete(entry),
        }}>
        {({ isOpen, pressed }) => (
          <View
            style={[
              styles.timelineEventBox,
              {
                backgroundColor:
                  pressed && !isOpen ? palette.bgSubtle : palette.bgPrimary,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <View style={styles.timelineEventHeader}>
              <Text
                style={[
                  styles.timelineEventTitle,
                  { color: palette.textPrimary },
                ]}>
                {entry.title}
              </Text>
              <View
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: palette.bgSubtle,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <Text
                  style={[
                    styles.timelineEventDate,
                    { color: palette.textMuted },
                  ]}>
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.timelineEventNotes,
                { color: palette.textSecondary },
              ]}>
              {entry.notes}
            </Text>

            {Boolean(entry.photoUri) && (
              <SpringPressable
                pressedScale={0.97}
                onPress={() => {
                  triggerLightHaptic();
                  setPreviewOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Inspect photo for ${entry.title}`}
                style={[
                  styles.photoThumbWrap,
                  {
                    borderColor: palette.borderSubtle,
                    backgroundColor: palette.bgSubtle,
                  },
                ]}>
                <Image
                  source={{ uri: entry.photoUri }}
                  style={styles.photoThumb}
                  contentFit="cover"
                />
                <View style={styles.photoZoomBadge}>
                  <Maximize2 size={11} color="#FFFFFF" />
                </View>
              </SpringPressable>
            )}

            {entry.metrics && (
              <View style={styles.metricsPillsRow}>
                {entry.metrics.rootLengthCm !== undefined && (
                  <MetricPill label={`Root: ${entry.metrics.rootLengthCm} cm`} />
                )}
                {entry.metrics.stemHeightCm !== undefined && (
                  <MetricPill label={`Stem: ${entry.metrics.stemHeightCm} cm`} />
                )}
                {entry.metrics.leafCount !== undefined && (
                  <MetricPill label={`Leaves: ${entry.metrics.leafCount}`} />
                )}
                {entry.metrics.waterAmountMl !== undefined && (
                  <MetricPill
                    label={`Volume: ${entry.metrics.waterAmountMl} ml`}
                  />
                )}
                {entry.metrics.soilMoisture !== undefined && (
                  <MetricPill
                    label={`Soil prior: ${entry.metrics.soilMoisture.replace('_', ' ')}`}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </SwipeableRow>

      <PhotoLightboxModal
        visible={previewOpen}
        uri={entry.photoUri}
        caption={entry.title}
        onClose={() => setPreviewOpen(false)}
      />
    </View>
  );
}

function MetricPill({ label }: { label: string }) {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.metricPill,
        {
          backgroundColor: palette.bgSurface,
          borderColor: palette.borderSubtle,
        },
      ]}>
      <Text style={[styles.metricPillText, { color: palette.primary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRailCol: {
    alignItems: 'center',
    width: 22,
  },
  timelineNodeHalo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  timelineNode: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  timelineVerticalLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginVertical: 4,
  },
  swipeWrapper: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  timelineEventBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: 12,
    gap: 6,
  },
  timelineEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timelineEventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  dateChip: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timelineEventDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  timelineEventNotes: {
    fontSize: 13,
    lineHeight: 19,
  },
  photoThumbWrap: {
    position: 'relative',
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: BorderWidth.hairline,
  },
  photoThumb: {
    width: 104,
    height: 76,
  },
  photoZoomBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(28, 40, 32, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metricPill: {
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  metricPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
