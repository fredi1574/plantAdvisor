import { Image } from 'expo-image';
import { Pencil, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoLightboxModal } from '@/components/ui/photo-lightbox-modal';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { BorderWidth, Radius } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { NotebookEntry } from '@/types/plant';

interface SwipeableLogItemProps {
  entry: NotebookEntry;
  isLast: boolean;
  onEdit: (entry: NotebookEntry) => void;
  onDelete: (entry: NotebookEntry) => void;
}

export function SwipeableLogItem({
  entry,
  isLast,
  onEdit,
  onDelete,
}: SwipeableLogItemProps) {
  const palette = usePalette();
  const [previewOpen, setPreviewOpen] = useState(false);

  const nodeColor =
    entry.eventType === 'water'
      ? palette.waterBlue
      : entry.eventType === 'propagation' || entry.eventType === 'repot'
        ? palette.accentTerracotta
        : palette.primary;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRailCol}>
        <View style={[styles.timelineNode, { backgroundColor: nodeColor }]} />
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
              <Text
                style={[styles.timelineEventDate, { color: palette.textMuted }]}>
                {new Date(entry.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <Text
              style={[
                styles.timelineEventNotes,
                { color: palette.textSecondary },
              ]}>
              {entry.notes}
            </Text>

            {Boolean(entry.photoUri) && (
              <Pressable
                onPress={() => setPreviewOpen(true)}
                style={[
                  styles.photoThumbWrap,
                  { borderColor: palette.borderSubtle },
                ]}>
                <Image
                  source={{ uri: entry.photoUri }}
                  style={styles.photoThumb}
                  contentFit="cover"
                />
              </Pressable>
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
    width: 18,
  },
  timelineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  timelineVerticalLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  swipeWrapper: {
    flex: 1,
    marginBottom: 12,
  },
  timelineEventBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: 12,
    gap: 5,
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
  timelineEventDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineEventNotes: {
    fontSize: 13,
    lineHeight: 19,
  },
  photoThumbWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: BorderWidth.hairline,
  },
  photoThumb: {
    width: 92,
    height: 68,
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
