import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  CheckCircle2,
  Droplet,
  Droplets,
  FlaskConical,
  RotateCw,
  Sprout,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  getCareEventTypeLabel,
  type DayCareSchedule,
  type ProjectedPlantCareTask,
} from '@/services/calendarUtils';
import type { UserPlant } from '@/types/plant';

interface DayAgendaCardProps {
  schedule: DayCareSchedule;
  plantLookup: Record<string, UserPlant>;
  onCompleteTask: (task: ProjectedPlantCareTask) => void;
  onWaterAllDueToday?: () => void;
}

/**
 * Selected day agenda showing due watering/fertilizing/rotation tasks and completed logs.
 */
export function DayAgendaCard({
  schedule,
  plantLookup,
  onCompleteTask,
  onWaterAllDueToday,
}: DayAgendaCardProps) {
  const palette = usePalette();
  const waterTasksDueToday = schedule.projectedTasks.filter(
    (t) => t.taskKind === 'water'
  );

  return (
    <GlassCard>
      <View style={styles.dayAgendaHeader}>
        <View style={styles.flex}>
          <Text style={[styles.dayAgendaTitle, { color: palette.textPrimary }]}>
            {schedule.fullLabel}
          </Text>
          <Text style={[styles.dayAgendaSub, { color: palette.textSecondary }]}>
            {schedule.projectedTasks.length === 0
              ? 'No plants scheduled for care on this day'
              : `${schedule.projectedTasks.length} ${
                  schedule.projectedTasks.length === 1
                    ? 'care task'
                    : 'care tasks'
                } scheduled`}
          </Text>
        </View>

        {schedule.isToday &&
          waterTasksDueToday.length > 1 &&
          onWaterAllDueToday && (
            <Pressable
              onPress={onWaterAllDueToday}
              style={({ pressed }) => [
                styles.waterAllInlineBtn,
                { backgroundColor: palette.waterBlue },
                pressed && { opacity: 0.85 },
              ]}>
              <Droplets size={14} color={palette.textInverse} />
              <Text
                style={[
                  styles.waterAllInlineBtnText,
                  { color: palette.textInverse },
                ]}>
                Water All
              </Text>
            </Pressable>
          )}
      </View>

      {schedule.projectedTasks.length === 0 &&
      schedule.completedEntries.length === 0 ? (
        <View
          style={[styles.restDayBox, { backgroundColor: palette.bgPrimary }]}>
          <CheckCircle2 size={24} color={palette.primary} />
          <Text style={[styles.restDayTitle, { color: palette.textPrimary }]}>
            Rest Day for Your Garden
          </Text>
          <Text style={[styles.restDayText, { color: palette.textSecondary }]}>
            All plants are on track for {schedule.fullLabel}.
          </Text>
        </View>
      ) : (
        <View style={styles.taskListCol}>
          {schedule.projectedTasks.map((task) => (
            <AgendaTaskItem
              key={`${task.dateKey}-${task.plant.id}-${task.taskKind}-${task.cycleIndex}`}
              task={task}
              onComplete={() => onCompleteTask(task)}
            />
          ))}

          {schedule.completedEntries.map((entry) => {
            const plant = plantLookup[entry.plantId];
            return (
              <View
                key={entry.id}
                style={[
                  styles.completedLogRow,
                  {
                    backgroundColor: palette.thrivingBg,
                    borderColor: palette.thrivingBorder,
                  },
                ]}>
                <CheckCircle2 size={16} color={palette.thrivingText} />
                <View style={styles.flex}>
                  <Text
                    style={[
                      styles.completedLogTitle,
                      { color: palette.thrivingText },
                    ]}>
                    {plant ? `${plant.nickname} · ` : ''}
                    {getCareEventTypeLabel(entry.eventType)}
                  </Text>
                  <Text
                    style={[
                      styles.completedLogSub,
                      { color: palette.thrivingText },
                    ]}
                    numberOfLines={1}>
                    {entry.title}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

function AgendaTaskItem({
  task,
  onComplete,
}: {
  task: ProjectedPlantCareTask;
  onComplete: () => void;
}) {
  const palette = usePalette();
  const { plant, isOverdue, isDueToday, actionLabel, taskKind } = task;
  const isPropagation = plant.species.plantType === 'propagation';
  const isSucculent = plant.species.plantType === 'succulent';

  const pillColors = isOverdue
    ? {
        bg: palette.criticalBg,
        border: palette.criticalBorder,
        text: palette.criticalText,
      }
    : isDueToday
      ? {
          bg: palette.waterAlertBg,
          border: palette.waterAlertBorder,
          text: palette.waterAlertText,
        }
      : {
          bg: palette.primarySoft,
          border: palette.primaryBorder,
          text: palette.primary,
        };

  const buttonBg =
    taskKind === 'fertilize'
      ? palette.primary
      : taskKind === 'rotate'
        ? palette.primaryMuted
        : isSucculent
          ? palette.accentTerracotta
          : palette.waterBlue;

  const buttonLabel =
    taskKind === 'fertilize'
      ? 'Log Feed'
      : taskKind === 'rotate'
        ? 'Log Rotate'
        : isDueToday || isOverdue
          ? 'Mark Watered'
          : 'Water Early';

  return (
    <GlassCard variant="subtle" style={styles.taskCard}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/plant/[id]',
            params: { id: plant.id },
          })
        }
        style={styles.taskMainPressable}>
        <Image
          source={{ uri: plant.photoUri }}
          style={[styles.taskThumb, { backgroundColor: palette.bgElevated }]}
          contentFit="cover"
        />

        <View style={styles.taskInfoCol}>
          <View style={styles.taskTitleRow}>
            <Text
              style={[styles.taskNickname, { color: palette.textPrimary }]}
              numberOfLines={1}>
              {plant.nickname}
            </Text>
            {isPropagation ? (
              <FlaskConical size={13} color={palette.waterBlue} />
            ) : (
              <Sprout size={13} color={palette.primary} />
            )}
          </View>

          <Text
            style={[styles.taskSpecies, { color: palette.textSecondary }]}
            numberOfLines={1}>
            {plant.species.commonName} · {plant.location}
          </Text>

          <View
            style={[
              styles.actionPill,
              {
                backgroundColor: pillColors.bg,
                borderColor: pillColors.border,
              },
            ]}>
            {taskKind === 'fertilize' ? (
              <FlaskConical size={11} color={pillColors.text} />
            ) : taskKind === 'rotate' ? (
              <RotateCw size={11} color={pillColors.text} />
            ) : (
              <Droplet size={11} color={pillColors.text} />
            )}
            <Text style={[styles.actionPillText, { color: pillColors.text }]}>
              {actionLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={onComplete}
        style={({ pressed }) => [
          styles.markActionBtn,
          { backgroundColor: buttonBg },
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${buttonLabel} for ${plant.nickname}`}>
        {taskKind === 'fertilize' ? (
          <FlaskConical size={14} color={palette.textInverse} />
        ) : taskKind === 'rotate' ? (
          <RotateCw size={14} color={palette.textInverse} />
        ) : (
          <Droplets size={14} color={palette.textInverse} />
        )}
        <Text style={[styles.markActionBtnText, { color: palette.textInverse }]}>
          {buttonLabel}
        </Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  dayAgendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  dayAgendaTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  dayAgendaSub: {
    fontSize: 12,
    marginTop: 2,
  },
  waterAllInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  waterAllInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  restDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    gap: 6,
  },
  restDayTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  restDayText: {
    fontSize: 13,
    textAlign: 'center',
  },
  taskListCol: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm + Spacing.half,
    padding: Spacing.sm + Spacing.half,
  },
  taskMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskThumb: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
  },
  taskInfoCol: {
    flex: 1,
    gap: 3,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  taskNickname: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  taskSpecies: {
    fontSize: 12,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 2,
    borderWidth: BorderWidth.hairline,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  markActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + Spacing.half,
    borderRadius: Radius.md,
  },
  markActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completedLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  completedLogTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  completedLogSub: {
    fontSize: 11,
    opacity: 0.85,
  },
});
