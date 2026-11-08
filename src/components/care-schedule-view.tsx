import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Droplet,
  Droplets,
  FlaskConical,
  Grid,
  ListChecks,
  Sparkles,
  Sprout,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import {
  CardShadow,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import {
  getCareEventTypeLabel,
  getProjectedCareEvents,
  type DayCareSchedule,
  type ProjectedPlantCareTask,
} from '@/services/calendarUtils';
import type { NotebookEntry, UserPlant } from '@/types/plant';

interface CareScheduleViewProps {
  plants: UserPlant[];
  entries: NotebookEntry[];
  onWaterPlantNow: (plantId: string, nickname: string) => void;
  onWaterAllDueToday?: () => void;
}

export function CareScheduleView({
  plants,
  entries,
  onWaterPlantNow,
  onWaterAllDueToday,
}: CareScheduleViewProps) {
  const timeline = useMemo(
    () => getProjectedCareEvents(plants, entries, 30),
    [plants, entries]
  );

  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    () => timeline[0]?.dateKey ?? ''
  );
  const [showMonthlyHeatmap, setShowMonthlyHeatmap] = useState(false);

  const weeklyStripDays = useMemo(() => timeline.slice(0, 14), [timeline]);

  const selectedDaySchedule = useMemo<DayCareSchedule | undefined>(
    () =>
      timeline.find((d) => d.dateKey === selectedDateKey) ?? timeline[0],
    [timeline, selectedDateKey]
  );

  // Days in the next 14 days that have at least one task or completed event
  const upcomingActiveDays = useMemo(
    () =>
      timeline
        .slice(0, 14)
        .filter(
          (d) =>
            d.projectedTasks.length > 0 ||
            d.completedEntries.length > 0 ||
            d.isToday
        ),
    [timeline]
  );

  const plantLookup = useMemo(() => {
    const map: Record<string, UserPlant> = {};
    for (const p of plants) {
      map[p.id] = p;
    }
    return map;
  }, [plants]);

  const totalTasksNext7Days = useMemo(
    () =>
      timeline
        .slice(0, 7)
        .reduce((acc, day) => acc + day.projectedTasks.length, 0),
    [timeline]
  );

  const dueTodayCount = timeline[0]?.projectedTasks.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Schedule Overview & Heatmap Toggle Bar */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewTopRow}>
          <View style={styles.overviewTextCol}>
            <View style={styles.overviewEyebrowRow}>
              <CalendarIcon size={14} color={Palette.primary} />
              <Text style={styles.overviewEyebrow}>30-DAY CARE HORIZON</Text>
            </View>
            <Text style={styles.overviewTitle}>
              {dueTodayCount > 0
                ? `${dueTodayCount} ${dueTodayCount === 1 ? 'Plant Due' : 'Plants Due'
                } Today`
                : 'All Caught Up Today'}
            </Text>
            <Text style={styles.overviewSubtitle}>
              {totalTasksNext7Days}{' '}
              {totalTasksNext7Days === 1
                ? 'care task'
                : 'scheduled care tasks'}{' '}
              in the next 7 days
            </Text>
          </View>

          <Pressable
            onPress={() => setShowMonthlyHeatmap((prev) => !prev)}
            style={({ pressed }) => [
              styles.heatmapToggleBtn,
              showMonthlyHeatmap && styles.heatmapToggleBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle 30-day monthly heatmap">
            {showMonthlyHeatmap ? (
              <ListChecks size={15} color={Palette.textInverse} />
            ) : (
              <Grid size={15} color={Palette.primary} />
            )}
            <Text
              style={[
                styles.heatmapToggleText,
                showMonthlyHeatmap && styles.heatmapToggleTextActive,
              ]}>
              {showMonthlyHeatmap ? 'Agenda' : '30d Map'}
            </Text>
          </Pressable>
        </View>

        {/* Legend Dots */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.dotWater]} />
            <Text style={styles.legendText}>Watering</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.dotFertilize]} />
            <Text style={styles.legendText}>Fertilize / Care</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.dotProp]} />
            <Text style={styles.legendText}>Propagation</Text>
          </View>
        </View>
      </View>

      {/* Horizontal 14-Day Strip */}


      {/* Optional 30-Day Monthly Heatmap Card */}
      {showMonthlyHeatmap && (
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapHeaderRow}>
            <Text style={styles.heatmapTitle}>
              30-Day Watering Load Heatmap
            </Text>
            <Text style={styles.heatmapSubtitle}>
              Tap any date to inspect its care duties
            </Text>
          </View>

          <View style={styles.heatmapGrid}>
            {timeline.map((day) => {
              const count = day.projectedTasks.length;
              const isSelected = day.dateKey === selectedDaySchedule?.dateKey;
              const heatStyle =
                count === 0
                  ? styles.heatCellEmpty
                  : count === 1
                    ? styles.heatCellLow
                    : count === 2
                      ? styles.heatCellMedium
                      : styles.heatCellHigh;

              return (
                <Pressable
                  key={day.dateKey}
                  onPress={() => setSelectedDateKey(day.dateKey)}
                  style={[
                    styles.heatCell,
                    heatStyle,
                    isSelected && styles.heatCellSelected,
                  ]}>
                  <Text
                    style={[
                      styles.heatCellDateText,
                      count >= 3 && styles.heatCellDateTextInverse,
                    ]}>
                    {day.dayOfMonth}
                  </Text>
                  <Text
                    style={[
                      styles.heatCellCountText,
                      count >= 3 && styles.heatCellDateTextInverse,
                    ]}>
                    {count > 0 ? `${count}💧` : '·'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Selected Day Focused Card */}
      {selectedDaySchedule && (
        <View style={styles.dayAgendaCard}>
          <View style={styles.dayAgendaHeader}>
            <View>
              <Text style={styles.dayAgendaTitle}>
                {selectedDaySchedule.fullLabel}
              </Text>
              <Text style={styles.dayAgendaSub}>
                {selectedDaySchedule.projectedTasks.length === 0
                  ? 'No plants scheduled for watering on this day'
                  : `${selectedDaySchedule.projectedTasks.length} ${selectedDaySchedule.projectedTasks.length === 1
                    ? 'specimen requires'
                    : 'specimens require'
                  } care`}
              </Text>
            </View>

            {selectedDaySchedule.isToday &&
              selectedDaySchedule.projectedTasks.length > 1 &&
              onWaterAllDueToday && (
                <Pressable
                  onPress={onWaterAllDueToday}
                  style={({ pressed }) => [
                    styles.waterAllInlineBtn,
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Droplets size={14} color={Palette.textInverse} />
                  <Text style={styles.waterAllInlineBtnText}>Water All</Text>
                </Pressable>
              )}
          </View>

          {selectedDaySchedule.projectedTasks.length === 0 &&
            selectedDaySchedule.completedEntries.length === 0 ? (
            <View style={styles.restDayBox}>
              <CheckCircle2 size={24} color={Palette.primary} />
              <Text style={styles.restDayTitle}>Rest Day for Your Garden</Text>
              <Text style={styles.restDayText}>
                All plants are on track for {selectedDaySchedule.fullLabel}.
              </Text>
            </View>
          ) : (
            <View style={styles.taskListCol}>
              {selectedDaySchedule.projectedTasks.map((task) => (
                <AgendaTaskItem
                  key={`${task.dateKey}-${task.plant.id}-${task.cycleIndex}`}
                  task={task}
                  onWaterNow={() =>
                    onWaterPlantNow(task.plant.id, task.plant.nickname)
                  }
                />
              ))}

              {selectedDaySchedule.completedEntries.map((entry) => {
                const plant = plantLookup[entry.plantId];
                return (
                  <View key={entry.id} style={styles.completedLogRow}>
                    <CheckCircle2 size={16} color={Palette.thrivingText} />
                    <View style={styles.completedLogTextCol}>
                      <Text style={styles.completedLogTitle}>
                        {plant ? `${plant.nickname} · ` : ''}
                        {getCareEventTypeLabel(entry.eventType)}
                      </Text>
                      <Text style={styles.completedLogSub} numberOfLines={1}>
                        {entry.title}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Upcoming 14-Day Chronological Agenda Feed */}
      <View style={styles.upcomingHeaderRow}>
        <Sparkles size={15} color={Palette.primary} />
        <Text style={styles.upcomingSectionTitle}>
          Upcoming 2-Week Care Timeline
        </Text>
      </View>

      {upcomingActiveDays.map((day) => {
        if (day.dateKey === selectedDaySchedule?.dateKey) return null;
        return (
          <View key={day.dateKey} style={styles.timelineDayCard}>
            <Pressable
              onPress={() => setSelectedDateKey(day.dateKey)}
              style={styles.timelineDayHeader}>
              <View style={styles.timelineDayTitleRow}>
                <Text style={styles.timelineDayTitle}>{day.fullLabel}</Text>
                {day.projectedTasks.length > 0 && (
                  <View style={styles.timelineCountPill}>
                    <Text style={styles.timelineCountPillText}>
                      {day.projectedTasks.length} due
                    </Text>
                  </View>
                )}
              </View>
              <ChevronRight size={16} color={Palette.textMuted} />
            </Pressable>

            <View style={styles.taskListCol}>
              {day.projectedTasks.map((task) => (
                <AgendaTaskItem
                  key={`${task.dateKey}-${task.plant.id}-${task.cycleIndex}`}
                  task={task}
                  onWaterNow={() =>
                    onWaterPlantNow(task.plant.id, task.plant.nickname)
                  }
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AgendaTaskItem({
  task,
  onWaterNow,
}: {
  task: ProjectedPlantCareTask;
  onWaterNow: () => void;
}) {
  const { plant, isOverdue, isDueToday, actionLabel } = task;
  const isPropagation = plant.species.plantType === 'propagation';
  const isSucculent = plant.species.plantType === 'succulent';

  return (
    <View style={styles.taskCard}>
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
          style={styles.taskThumb}
          contentFit="cover"
        />

        <View style={styles.taskInfoCol}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskNickname} numberOfLines={1}>
              {plant.nickname}
            </Text>
            {isPropagation ? (
              <FlaskConical size={13} color="#0F766E" />
            ) : (
              <Sprout size={13} color={Palette.primary} />
            )}
          </View>

          <Text style={styles.taskSpecies} numberOfLines={1}>
            {plant.species.commonName} · {plant.location}
          </Text>

          <View
            style={[
              styles.actionPill,
              isOverdue
                ? styles.actionPillOverdue
                : isDueToday
                  ? styles.actionPillToday
                  : styles.actionPillUpcoming,
            ]}>
            <Droplet
              size={11}
              color={
                isOverdue
                  ? Palette.criticalText
                  : isDueToday
                    ? Palette.waterAlertText
                    : Palette.primary
              }
            />
            <Text
              style={[
                styles.actionPillText,
                isOverdue
                  ? styles.actionPillTextOverdue
                  : isDueToday
                    ? styles.actionPillTextToday
                    : styles.actionPillTextUpcoming,
              ]}>
              {actionLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={onWaterNow}
        style={({ pressed }) => [
          styles.markWateredBtn,
          isSucculent && styles.markWateredBtnSucculent,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${plant.nickname} as watered`}>
        <Droplets size={14} color={Palette.textInverse} />
        <Text style={styles.markWateredBtnText}>
          {isDueToday || isOverdue ? 'Mark Watered' : 'Water Early'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  overviewCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: Spacing.md,
    ...CardShadow,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  overviewTextCol: {
    flex: 1,
    gap: 3,
  },
  overviewEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  overviewEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: Palette.primary,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  overviewSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  heatmapToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.primarySoft,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  heatmapToggleBtnActive: {
    backgroundColor: Palette.primary,
  },
  heatmapToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  heatmapToggleTextActive: {
    color: Palette.textInverse,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotWater: {
    backgroundColor: '#0284C7',
  },
  dotFertilize: {
    backgroundColor: '#D97706',
  },
  dotProp: {
    backgroundColor: '#16A34A',
  },
  dotOnSelected: {
    backgroundColor: '#BAE6FD',
  },
  dotPlaceholder: {
    width: 7,
    height: 7,
  },
  stripSection: {
    marginHorizontal: -Spacing.lg,
  },
  stripScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingVertical: 2,
  },
  dayChip: {
    width: 62,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: Radius.lg,
    backgroundColor: Palette.bgSurface,
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
    alignItems: 'center',
    gap: 4,
    ...CardShadow,
  },
  dayChipToday: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primarySoft,
  },
  dayChipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  dayChipWeekday: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
  },
  dayChipWeekdayToday: {
    color: Palette.primary,
    fontWeight: '800',
  },
  dayChipNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  dayChipTextSelected: {
    color: Palette.textInverse,
  },
  dayDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 8,
  },
  taskCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    backgroundColor: Palette.waterAlertBg,
  },
  taskCountBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  taskCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.waterAlertText,
  },
  taskCountBadgeTextSelected: {
    color: Palette.textInverse,
  },
  heatmapCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: Spacing.md,
    ...CardShadow,
  },
  heatmapHeaderRow: {
    gap: 2,
  },
  heatmapTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  heatmapSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatCell: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heatCellEmpty: {
    backgroundColor: Palette.bgPrimary,
    borderColor: Palette.borderSubtle,
  },
  heatCellLow: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  heatCellMedium: {
    backgroundColor: '#BAE6FD',
    borderColor: '#38BDF8',
  },
  heatCellHigh: {
    backgroundColor: '#0284C7',
    borderColor: '#0369A1',
  },
  heatCellSelected: {
    borderWidth: 2.5,
    borderColor: Palette.primary,
  },
  heatCellDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  heatCellCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.waterAlertText,
  },
  heatCellDateTextInverse: {
    color: Palette.textInverse,
  },
  dayAgendaCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: Spacing.md,
    ...CardShadow,
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
    color: Palette.textPrimary,
  },
  dayAgendaSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  waterAllInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  waterAllInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  restDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.lg,
    gap: 6,
  },
  restDayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  restDayText: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  taskListCol: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 10,
    borderRadius: Radius.lg,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
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
    backgroundColor: Palette.bgElevated,
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
    color: Palette.textPrimary,
    flexShrink: 1,
  },
  taskSpecies: {
    fontSize: 12,
    color: Palette.textSecondary,
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
    borderWidth: 1,
  },
  actionPillOverdue: {
    backgroundColor: Palette.criticalBg,
    borderColor: Palette.criticalBorder,
  },
  actionPillToday: {
    backgroundColor: Palette.waterAlertBg,
    borderColor: Palette.waterAlertBorder,
  },
  actionPillUpcoming: {
    backgroundColor: Palette.primarySoft,
    borderColor: '#B8D8C0',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionPillTextOverdue: {
    color: Palette.criticalText,
  },
  actionPillTextToday: {
    color: Palette.waterAlertText,
  },
  actionPillTextUpcoming: {
    color: Palette.primary,
  },
  markWateredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284C7',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  markWateredBtnSucculent: {
    backgroundColor: Palette.accentTerracotta,
  },
  markWateredBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  completedLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: Palette.thrivingBg,
    borderWidth: 1,
    borderColor: Palette.thrivingBorder,
  },
  completedLogTextCol: {
    flex: 1,
  },
  completedLogTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.thrivingText,
  },
  completedLogSub: {
    fontSize: 11,
    color: Palette.thrivingText,
    opacity: 0.85,
  },
  upcomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  upcomingSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  timelineDayCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: 10,
    ...CardShadow,
  },
  timelineDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineDayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineDayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  timelineCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Palette.waterAlertBg,
  },
  timelineCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.waterAlertText,
  },
});

