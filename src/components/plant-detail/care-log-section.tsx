import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CareEventComposer } from '@/components/plant-detail/care-event-composer';
import { SwipeableLogItem } from '@/components/plant-detail/swipeable-log-item';
import { AnimatedEntrance } from '@/components/ui/animated-wrappers';
import { JournalSproutIllustration } from '@/components/ui/botanical-illustrations';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { NotebookEntry, UserPlant } from '@/types/plant';

interface CareLogSectionProps {
  plant: UserPlant;
  plantEntries: NotebookEntry[];
  onShowToast: (message: string) => void;
  onEditEntry: (entry: NotebookEntry) => void;
  onDeleteEntry: (entry: NotebookEntry) => void;
}

/**
 * Pairs the quick care composer with the specimen's chronological notebook timeline.
 */
export function CareLogSection({
  plant,
  plantEntries,
  onShowToast,
  onEditEntry,
  onDeleteEntry,
}: CareLogSectionProps) {
  const palette = usePalette();

  return (
    <SurfaceCard>
      <CareEventComposer plant={plant} onShowToast={onShowToast} />

      <View
        style={[
          styles.timelineDivider,
          { backgroundColor: palette.borderSubtle },
        ]}
      />

      <View style={styles.timelineHeaderRow}>
        <Text
          style={[
            styles.sectionHeaderTitle,
            { color: palette.textPrimary, fontFamily: Fonts?.serifSemiBold },
          ]}>
          Chronological Notebook Timeline
        </Text>
        <View
          style={[
            styles.countPill,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
          ]}>
          <Text style={[styles.countPillText, { color: palette.primary }]}>
            {plantEntries.length}
          </Text>
        </View>
      </View>

      {plantEntries.length === 0 ? (
        <View
          style={[
            styles.emptyTimelineBox,
            {
              backgroundColor: palette.bgPrimary,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <JournalSproutIllustration size={86} />
          <Text
            style={[
              styles.emptyTimelineTitle,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            Your care journal is ready
          </Text>
          <Text
            style={[
              styles.emptyTimelineSubtitle,
              { color: palette.textSecondary },
            ]}>
            Log a watering, repotting, or growth observation above to start
            tracking this specimen&apos;s story.
          </Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {plantEntries.map((entry, idx) => (
            <AnimatedEntrance key={entry.id} index={idx} animateLayout>
              <SwipeableLogItem
                entry={entry}
                isLast={idx === plantEntries.length - 1}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
              />
            </AnimatedEntrance>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  countPill: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.half,
  },
  countPillText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  timelineDivider: {
    height: BorderWidth.hairline,
    marginVertical: Spacing.xs,
  },
  timelineList: {
    marginTop: Spacing.xs,
  },
  emptyTimelineBox: {
    marginTop: Spacing.xs,
    borderWidth: BorderWidth.hairline,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTimelineTitle: {
    ...Typography.cardTitle,
    marginTop: Spacing.xs,
  },
  emptyTimelineSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
