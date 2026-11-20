import { Pencil } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  CareMetricsFields,
  createMetricsDraftFromEntry,
  parseCareMetricsDraft,
  type CareMetricsDraft,
} from '@/components/modals/care-metrics-fields';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Chip } from '@/components/ui/chip';
import { CareEventIcon } from '@/components/ui/status-badges';
import type { ThemePalette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { usePlantStore } from '@/store/usePlantStore';
import type { CareEventType, NotebookEntry } from '@/types/plant';

interface EditLogModalProps {
  entry: NotebookEntry | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: (title: string) => void;
  onRequestDelete?: (entry: NotebookEntry) => void;
}

const getEventTypes = (
  palette: ThemePalette
): { key: CareEventType; label: string; color: string }[] => [
  { key: 'water', label: 'Water', color: palette.waterBlue },
  { key: 'propagation', label: 'Propagation', color: palette.accentTerracotta },
  { key: 'fertilize', label: 'Fertilize', color: palette.primary },
  { key: 'prune', label: 'Prune', color: palette.primaryMuted },
  { key: 'repot', label: 'Repot', color: palette.accentTerracotta },
  { key: 'note', label: 'Note', color: palette.textSecondary },
  { key: 'ai_scan', label: 'AI Scan', color: palette.primary },
];

export function EditLogModal({
  entry,
  visible,
  onClose,
  onSaved,
  onRequestDelete,
}: EditLogModalProps) {
  if (!entry) return null;

  return (
    <EditLogFormSheet
      key={entry.id}
      entry={entry}
      visible={visible}
      onClose={onClose}
      onSaved={onSaved}
      onRequestDelete={onRequestDelete}
    />
  );
}

interface EditLogFormSheetProps {
  entry: NotebookEntry;
  visible: boolean;
  onClose: () => void;
  onSaved?: (title: string) => void;
  onRequestDelete?: (entry: NotebookEntry) => void;
}

function EditLogFormSheet({
  entry,
  visible,
  onClose,
  onSaved,
  onRequestDelete,
}: EditLogFormSheetProps) {
  const palette = usePalette();
  const eventTypes = useMemo(() => getEventTypes(palette), [palette]);
  const updateCareEntry = usePlantStore((s) => s.updateCareEntry);

  const [eventType, setEventType] = useState<CareEventType>(entry.eventType);
  const [title, setTitle] = useState(entry.title);
  const [notes, setNotes] = useState(entry.notes);
  const [metricsDraft, setMetricsDraft] = useState<CareMetricsDraft>(() =>
    createMetricsDraftFromEntry(entry.metrics)
  );

  const handleSave = () => {
    const finalTitle = title.trim() || entry.title;
    const finalNotes = notes.trim() || entry.notes;
    const nextMetrics = parseCareMetricsDraft(metricsDraft);

    updateCareEntry(entry.id, {
      eventType,
      title: finalTitle,
      notes: finalNotes,
      metrics: nextMetrics,
    });

    onSaved?.(finalTitle);
    onClose();
  };

  return (
    <BottomSheetModal
      visible={visible}
      eyebrow="CARE TIMELINE LOG"
      title="Edit Notebook Entry"
      headerIcon={<Pencil size={16} color={palette.primary} />}
      saveLabel="Save Log"
      closeAccessibilityLabel="Close edit log modal"
      deleteAccessibilityLabel={`Delete log ${entry.title}`}
      onClose={onClose}
      onSave={handleSave}
      onDelete={
        onRequestDelete
          ? () => {
              onClose();
              onRequestDelete(entry);
            }
          : undefined
      }>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          Event Category
        </Text>
        <View style={styles.chipRow}>
          {eventTypes.map((et) => {
            const active = eventType === et.key;
            const iconColor = active ? palette.textInverse : et.color;
            return (
              <Chip
                key={et.key}
                label={et.label}
                variant="subtle"
                selected={active}
                selectedStyle="solid"
                icon={
                  <CareEventIcon
                    eventType={et.key}
                    size={13}
                    color={iconColor}
                  />
                }
                onPress={() => setEventType(et.key)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          Entry Title
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Deep Soak & Dry Watering"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
          Observation & Care Notes
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Describe watering details, root growth, or observations..."
          style={styles.multilineInput}
        />
      </View>

      <CareMetricsFields value={metricsDraft} onChange={setMetricsDraft} />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  multilineInput: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
