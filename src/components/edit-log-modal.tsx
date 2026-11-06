import {
  CheckCircle2,
  Droplets,
  FileText,
  FlaskConical,
  Pencil,
  Scissors,
  Sparkles,
  Sprout,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CardShadow,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePlantStore } from '@/store/usePlantStore';
import type { CareEventType, NotebookEntry } from '@/types/plant';

interface EditLogModalProps {
  entry: NotebookEntry | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: (title: string) => void;
  onRequestDelete?: (entry: NotebookEntry) => void;
}

const EVENT_TYPES: { key: CareEventType; label: string; color: string }[] = [
  { key: 'water', label: 'Water', color: Palette.waterBlue },
  { key: 'propagation', label: 'Propagation', color: Palette.accentTerracotta },
  { key: 'fertilize', label: 'Fertilize', color: Palette.primary },
  { key: 'prune', label: 'Prune', color: Palette.primaryMuted },
  { key: 'repot', label: 'Repot', color: Palette.accentTerracotta },
  { key: 'note', label: 'Note', color: Palette.textSecondary },
  { key: 'ai_scan', label: 'AI Scan', color: Palette.primary },
];

type SoilMoisture = NonNullable<NotebookEntry['metrics']>['soilMoisture'];

const SOIL_MOISTURE_OPTIONS: {
  key: NonNullable<SoilMoisture>;
  label: string;
}[] = [
  { key: 'bone_dry', label: 'Bone Dry' },
  { key: 'slightly_damp', label: 'Slightly Damp' },
  { key: 'moist', label: 'Moist' },
  { key: 'waterlogged', label: 'Waterlogged' },
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <EditLogFormSheet
        key={entry.id}
        entry={entry}
        onClose={onClose}
        onSaved={onSaved}
        onRequestDelete={onRequestDelete}
      />
    </Modal>
  );
}

interface EditLogFormSheetProps {
  entry: NotebookEntry;
  onClose: () => void;
  onSaved?: (title: string) => void;
  onRequestDelete?: (entry: NotebookEntry) => void;
}

function EditLogFormSheet({
  entry,
  onClose,
  onSaved,
  onRequestDelete,
}: EditLogFormSheetProps) {
  const updateCareEntry = usePlantStore((s) => s.updateCareEntry);

  const [eventType, setEventType] = useState<CareEventType>(entry.eventType);
  const [title, setTitle] = useState(entry.title);
  const [notes, setNotes] = useState(entry.notes);

  const [rootLengthCm, setRootLengthCm] = useState(
    entry.metrics?.rootLengthCm !== undefined
      ? String(entry.metrics.rootLengthCm)
      : ''
  );
  const [stemHeightCm, setStemHeightCm] = useState(
    entry.metrics?.stemHeightCm !== undefined
      ? String(entry.metrics.stemHeightCm)
      : ''
  );
  const [leafCount, setLeafCount] = useState(
    entry.metrics?.leafCount !== undefined
      ? String(entry.metrics.leafCount)
      : ''
  );
  const [waterAmountMl, setWaterAmountMl] = useState(
    entry.metrics?.waterAmountMl !== undefined
      ? String(entry.metrics.waterAmountMl)
      : ''
  );
  const [soilMoisture, setSoilMoisture] = useState<SoilMoisture>(
    entry.metrics?.soilMoisture
  );

  const handleSave = () => {
    const finalTitle = title.trim() || entry.title;
    const finalNotes = notes.trim() || entry.notes;

    const parsedRoot = parseFloat(rootLengthCm);
    const parsedStem = parseFloat(stemHeightCm);
    const parsedLeaf = parseInt(leafCount, 10);
    const parsedWater = parseInt(waterAmountMl, 10);

    const nextMetrics: NonNullable<NotebookEntry['metrics']> = {};
    if (!Number.isNaN(parsedRoot) && rootLengthCm.trim() !== '') {
      nextMetrics.rootLengthCm = parsedRoot;
    }
    if (!Number.isNaN(parsedStem) && stemHeightCm.trim() !== '') {
      nextMetrics.stemHeightCm = parsedStem;
    }
    if (!Number.isNaN(parsedLeaf) && leafCount.trim() !== '') {
      nextMetrics.leafCount = parsedLeaf;
    }
    if (!Number.isNaN(parsedWater) && waterAmountMl.trim() !== '') {
      nextMetrics.waterAmountMl = parsedWater;
    }
    if (soilMoisture) {
      nextMetrics.soilMoisture = soilMoisture;
    }

    const hasAnyMetric = Object.keys(nextMetrics).length > 0;

    updateCareEntry(entry.id, {
      eventType,
      title: finalTitle,
      notes: finalNotes,
      metrics: hasAnyMetric ? nextMetrics : undefined,
    });

    onSaved?.(finalTitle);
    onClose();
  };

  return (
    <KeyboardAvoidingView
      style={styles.backdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdropDismiss} onPress={onClose} />

      <View style={styles.sheetContainer}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconPill}>
              <Pencil size={16} color={Palette.primary} />
            </View>
            <View>
              <Text style={styles.sheetEyebrow}>CARE TIMELINE LOG</Text>
              <Text style={styles.sheetTitle}>Edit Notebook Entry</Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeIconBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close edit log modal">
            <X size={20} color={Palette.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Event Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Event Category</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPES.map((et) => {
                const active = eventType === et.key;
                const iconColor = active ? Palette.textInverse : et.color;
                return (
                  <Pressable
                    key={et.key}
                    onPress={() => setEventType(et.key)}
                    style={[styles.chip, active && styles.chipActive]}>
                    {et.key === 'water' && (
                      <Droplets size={13} color={iconColor} />
                    )}
                    {(et.key === 'propagation' || et.key === 'repot') && (
                      <Sprout size={13} color={iconColor} />
                    )}
                    {et.key === 'fertilize' && (
                      <FlaskConical size={13} color={iconColor} />
                    )}
                    {et.key === 'prune' && (
                      <Scissors size={13} color={iconColor} />
                    )}
                    {et.key === 'note' && (
                      <FileText size={13} color={iconColor} />
                    )}
                    {et.key === 'ai_scan' && (
                      <Sparkles size={13} color={iconColor} />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}>
                      {et.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Log Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Entry Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Deep Soak & Dry Watering"
              placeholderTextColor={Palette.textMuted}
              style={styles.textInput}
            />
          </View>

          {/* Log Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Observation & Care Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Describe watering details, root growth, or observations..."
              placeholderTextColor={Palette.textMuted}
              style={[styles.textInput, styles.multilineInput]}
            />
          </View>

          {/* Optional Metrics Grid */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Optional Growth & Watering Metrics
            </Text>
            <View style={styles.twoColRow}>
              <View style={[styles.subField, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Root Length (cm)</Text>
                <TextInput
                  value={rootLengthCm}
                  onChangeText={setRootLengthCm}
                  keyboardType="decimal-pad"
                  placeholder="e.g., 8.5"
                  placeholderTextColor={Palette.textMuted}
                  style={styles.textInput}
                />
              </View>
              <View style={[styles.subField, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Stem Height (cm)</Text>
                <TextInput
                  value={stemHeightCm}
                  onChangeText={setStemHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="e.g., 14.0"
                  placeholderTextColor={Palette.textMuted}
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.subField, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Leaf Count</Text>
                <TextInput
                  value={leafCount}
                  onChangeText={setLeafCount}
                  keyboardType="number-pad"
                  placeholder="e.g., 6"
                  placeholderTextColor={Palette.textMuted}
                  style={styles.textInput}
                />
              </View>
              <View style={[styles.subField, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Water Volume (ml)</Text>
                <TextInput
                  value={waterAmountMl}
                  onChangeText={setWaterAmountMl}
                  keyboardType="number-pad"
                  placeholder="e.g., 250"
                  placeholderTextColor={Palette.textMuted}
                  style={styles.textInput}
                />
              </View>
            </View>
          </View>

          {/* Prior Soil Moisture */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Prior Soil Moisture (Optional)</Text>
            <View style={styles.chipRow}>
              {SOIL_MOISTURE_OPTIONS.map((opt) => {
                const active = soilMoisture === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() =>
                      setSoilMoisture(active ? undefined : opt.key)
                    }
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.sheetFooter}>
          {onRequestDelete && (
            <Pressable
              onPress={() => {
                onClose();
                onRequestDelete(entry);
              }}
              style={({ pressed }) => [
                styles.deleteOutlineBtn,
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Delete log ${entry.title}`}>
              <Trash2 size={16} color={Palette.criticalText} />
            </Pressable>
          )}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.75 },
            ]}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.85 },
            ]}>
            <CheckCircle2 size={16} color={Palette.textInverse} />
            <Text style={styles.saveBtnText}>Save Log</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 40, 32, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '90%',
    backgroundColor: Palette.bgSurface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    overflow: 'hidden',
    ...CardShadow,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.bgSubtle,
    backgroundColor: Palette.bgPrimary,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Palette.primary,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    maxHeight: 480,
  },
  formContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  subField: {
    gap: 4,
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  textInput: {
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  multilineInput: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: Palette.textInverse,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.bgSubtle,
    backgroundColor: Palette.bgPrimary,
  },
  deleteOutlineBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Palette.criticalBg,
    borderWidth: 1,
    borderColor: Palette.criticalBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 'auto',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textInverse,
  },
});

