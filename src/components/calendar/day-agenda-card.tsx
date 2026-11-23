import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  CheckCircle2,
  Droplets,
  FlaskConical,
  RotateCw,
  Sprout,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AnimatedEntrance,
  SpringPressable,
} from '@/components/ui/animated-wrappers';
import { BorderWidth, Fonts, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { localizeCommonName, localizeLocation } from '@/i18n/plantDisplay';
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
  const { t } = useTranslation();
  const palette = usePalette();
  const waterTasksDueToday = schedule.projectedTasks.filter(
    (task) => task.taskKind === 'water'
  );

  return (
    <View style={styles.section}>
      <View style={styles.dayAgendaHeader}>
        <View style={styles.flex}>
          <Text
            style={[
              styles.dayAgendaTitle,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            {schedule.fullLabel}
          </Text>
          <Text style={[styles.dayAgendaSub, { color: palette.textSecondary }]}>
            {schedule.projectedTasks.length === 0
              ? t('schedule.agendaEmpty')
              : t('schedule.tasksScheduled', {
                  count: schedule.projectedTasks.length,
                })}
          </Text>
        </View>

        {schedule.isToday &&
          waterTasksDueToday.length > 1 &&
          onWaterAllDueToday && (
            <SpringPressable
              onPress={onWaterAllDueToday}
              accessibilityRole="button"
              accessibilityLabel={`Water all ${waterTasksDueToday.length} due plants`}
              style={[
                styles.waterAllInlineBtn,
                { backgroundColor: palette.waterBlue },
              ]}>
              <Droplets size={14} color={palette.textInverse} />
              <Text
                style={[
                  styles.waterAllInlineBtnText,
                  { color: palette.textInverse },
                ]}>
                {t('schedule.waterAllBtn')}
              </Text>
            </SpringPressable>
          )}
      </View>

      {schedule.projectedTasks.length === 0 &&
      schedule.completedEntries.length === 0 ? (
        <View
          style={[
            styles.restDayBox,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <CheckCircle2 size={22} color={palette.primary} />
          <Text style={[styles.restDayTitle, { color: palette.textPrimary }]}>
            {t('schedule.restDayTitle')}
          </Text>
          <Text style={[styles.restDayText, { color: palette.textSecondary }]}>
            {t('schedule.restDayText', { day: schedule.fullLabel })}
          </Text>
        </View>
      ) : (
        <View style={styles.taskListCol}>
          {schedule.projectedTasks.map((task, idx) => (
            <AnimatedEntrance
              key={`${task.dateKey}-${task.plant.id}-${task.taskKind}-${task.cycleIndex}`}
              index={idx}
              animateLayout>
              <AgendaTaskItem
                task={task}
                onComplete={() => onCompleteTask(task)}
              />
            </AnimatedEntrance>
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
    </View>
  );
}

function AgendaTaskItem({
  task,
  onComplete,
}: {
  task: ProjectedPlantCareTask;
  onComplete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const { plant, isOverdue, isDueToday, taskKind } = task;
  const isPropagation = plant.species.plantType === 'propagation';
  const isSucculent = plant.species.plantType === 'succulent';

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
      ? t('schedule.logFeed')
      : taskKind === 'rotate'
        ? t('schedule.logRotate')
        : isDueToday || isOverdue
          ? t('schedule.markWatered')
          : t('schedule.waterEarly');

  return (
    <View
      style={[
        styles.taskCard,
        {
          backgroundColor: palette.bgSurface,
          borderColor: palette.borderSubtle,
        },
      ]}>
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
              style={[
                styles.taskNickname,
                { color: palette.textPrimary, fontFamily: Fonts?.serif },
              ]}
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
            {localizeCommonName(plant.species.commonName, i18n.language)} ·{' '}
            {localizeLocation(plant.location, i18n.language)}
          </Text>
        </View>
      </Pressable>

      <SpringPressable
        onPress={onComplete}
        style={[
          styles.markActionBtn,
          { backgroundColor: buttonBg },
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
      </SpringPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
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
    fontSize: 19,
    fontWeight: '700',
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
    borderWidth: BorderWidth.hairline,
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
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
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
