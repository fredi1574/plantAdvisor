import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CareEventComposer } from '@/components/plant-detail/care-event-composer';
import { SwipeableLogItem } from '@/components/plant-detail/swipeable-log-item';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Spacing } from '@/constants/theme';
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

      <Text style={[styles.sectionHeaderTitle, { color: palette.textPrimary }]}>
        Chronological Notebook Timeline ({plantEntries.length})
      </Text>

      <View>
        {plantEntries.map((entry, idx) => (
          <SwipeableLogItem
            key={entry.id}
            entry={entry}
            isLast={idx === plantEntries.length - 1}
            onEdit={onEditEntry}
            onDelete={onDeleteEntry}
          />
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  timelineDivider: {
    height: BorderWidth.hairline,
    marginVertical: Spacing.xs,
  },
});
