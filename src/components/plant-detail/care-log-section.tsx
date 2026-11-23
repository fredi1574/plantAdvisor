import React from 'react';
import { useTranslation } from 'react-i18next';
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
 * Pairs the quick care composer with an unboxed, canvas-mounted chronological
 * notebook timeline so entries breathe without nested card borders.
 */
export function CareLogSection({
  plant,
  plantEntries,
  onShowToast,
  onEditEntry,
  onDeleteEntry,
}: CareLogSectionProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  return (
    <View style={styles.sectionRoot}>
      <SurfaceCard variant="nested" style={styles.composerPanel}>
        <CareEventComposer plant={plant} onShowToast={onShowToast} />
      </SurfaceCard>

      <View style={styles.timelineHeaderRow}>
        <Text
          style={[
            styles.sectionHeaderTitle,
            { color: palette.textPrimary, fontFamily: Fonts?.serifSemiBold },
          ]}>
          {t('plantDetail.journal.timelineTitle')}
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
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <JournalSproutIllustration size={86} />
          <Text
            style={[
              styles.emptyTimelineTitle,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            {t('plantDetail.journal.emptyTitle')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRoot: {
    gap: Spacing.lg,
  },
  composerPanel: {
    padding: Spacing.md,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 18,
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
  timelineList: {
    marginTop: -Spacing.xs,
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
