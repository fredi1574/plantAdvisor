import { Image } from "expo-image";
import { router } from "expo-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Droplets,
  FlaskConical,
  Sparkles,
  Sprout,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/components/glass-card";
import {
  BorderWidth,
  Fonts,
  Radius,
  Spacing,
  Typography,
  type ThemePalette,
} from "@/constants/theme";
import { usePalette } from "@/hooks/use-theme";
import {
  getCareEventTypeLabel,
  getProjectedCareEvents,
  toLocalDateKey,
  type DayCareSchedule,
  type ProjectedPlantCareTask,
} from "@/services/calendarUtils";
import type { NotebookEntry, UserPlant } from "@/types/plant";

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

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
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const projectionDays = useMemo(
    () => Math.max(62, (monthOffset + 2) * 32),
    [monthOffset],
  );
  const timeline = useMemo(
    () => getProjectedCareEvents(plants, entries, projectionDays),
    [plants, entries, projectionDays],
  );

  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    () => timeline[0]?.dateKey ?? "",
  );

  const timelineByDate = useMemo(() => {
    const map: Record<string, DayCareSchedule> = {};
    for (const day of timeline) {
      map[day.dateKey] = day;
    }
    return map;
  }, [timeline]);

  const calendarMonth = useMemo(() => {
    const today = new Date();
    const viewDate = new Date(
      today.getFullYear(),
      today.getMonth() + monthOffset,
      1,
    );
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = toLocalDateKey(today);

    const cells: (
      | { kind: "empty"; key: string }
      | {
          kind: "day";
          key: string;
          dayNum: number;
          dateKey: string;
          isToday: boolean;
          isPast: boolean;
          schedule?: DayCareSchedule;
        }
    )[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ kind: "empty", key: `pad-start-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateKey = toLocalDateKey(cellDate);
      cells.push({
        kind: "day",
        key: dateKey,
        dayNum: d,
        dateKey,
        isToday: dateKey === todayKey,
        isPast: dateKey < todayKey,
        schedule: timelineByDate[dateKey],
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ kind: "empty", key: `pad-end-${cells.length}` });
    }

    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return {
      monthName: MONTH_NAMES[month],
      year: String(year),
      weeks,
    };
  }, [monthOffset, timelineByDate]);

  const selectedDaySchedule = useMemo<DayCareSchedule | undefined>(
    () => timeline.find((d) => d.dateKey === selectedDateKey) ?? timeline[0],
    [timeline, selectedDateKey],
  );

  // Days in the next 14 days (excluding selected date) that have projected tasks
  const upcomingTimelineDays = useMemo(
    () =>
      timeline
        .slice(0, 14)
        .filter(
          (d) =>
            d.dateKey !== selectedDaySchedule?.dateKey &&
            d.projectedTasks.length > 0,
        ),
    [timeline, selectedDaySchedule?.dateKey],
  );

  const upcomingTaskCount = useMemo(
    () =>
      upcomingTimelineDays.reduce(
        (acc, day) => acc + day.projectedTasks.length,
        0,
      ),
    [upcomingTimelineDays],
  );

  const plantLookup = useMemo(() => {
    const map: Record<string, UserPlant> = {};
    for (const p of plants) {
      map[p.id] = p;
    }
    return map;
  }, [plants]);

  return (
    <View style={styles.container}>
      {/* Selected Day Focused Glass Card */}
      {selectedDaySchedule && (
        <GlassCard>
          <View style={styles.dayAgendaHeader}>
            <View>
              <Text style={styles.dayAgendaTitle}>
                {selectedDaySchedule.fullLabel}
              </Text>
              <Text style={styles.dayAgendaSub}>
                {selectedDaySchedule.projectedTasks.length === 0
                  ? "No plants scheduled for watering on this day"
                  : `${selectedDaySchedule.projectedTasks.length} ${
                      selectedDaySchedule.projectedTasks.length === 1
                        ? "specimen requires"
                        : "specimens require"
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
                  ]}
                >
                  <Droplets size={14} color={palette.textInverse} />
                  <Text style={styles.waterAllInlineBtnText}>Water All</Text>
                </Pressable>
              )}
          </View>

          {selectedDaySchedule.projectedTasks.length === 0 &&
          selectedDaySchedule.completedEntries.length === 0 ? (
            <View style={styles.restDayBox}>
              <CheckCircle2 size={24} color={palette.primary} />
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
                    <CheckCircle2 size={16} color={palette.thrivingText} />
                    <View style={styles.completedLogTextCol}>
                      <Text style={styles.completedLogTitle}>
                        {plant ? `${plant.nickname} · ` : ""}
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
        </GlassCard>
      )}

      {/* Upcoming 2-Week Care Timeline Glass Card */}
      <GlassCard>
        <View style={styles.upcomingHeaderRow}>
          <View style={styles.upcomingTitleGroup}>
            <Sparkles size={16} color={palette.primary} />
            <Text style={styles.upcomingSectionTitle}>Upcoming 2 Weeks</Text>
          </View>
          <View style={styles.timelineCountPill}>
            <Text style={styles.timelineCountPillText}>
              {upcomingTaskCount} {upcomingTaskCount === 1 ? "task" : "tasks"}
            </Text>
          </View>
        </View>

        {upcomingTimelineDays.length === 0 ? (
          <View style={styles.timelineEmptyBox}>
            <CheckCircle2 size={20} color={palette.primaryMuted} />
            <Text style={styles.timelineEmptyText}>
              No other care tasks scheduled in the next 2 weeks.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineRailList}>
            {upcomingTimelineDays.map((day, idx) => {
              const isLast = idx === upcomingTimelineDays.length - 1;
              return (
                <View key={day.dateKey} style={styles.timelineRailRow}>
                  {/* Left Date + Rail Column */}
                  <View style={styles.railLeftCol}>
                    <View style={styles.railDateBadge}>
                      <Text style={styles.railDateMonth}>
                        {day.dayOfWeekShort}
                      </Text>
                      <Text style={styles.railDateNum}>{day.dayOfMonth}</Text>
                    </View>
                    {!isLast && <View style={styles.railLine} />}
                  </View>

                  {/* Right Content Column */}
                  <View
                    style={[
                      styles.railContentCol,
                      !isLast && styles.railContentColSpaced,
                    ]}
                  >
                    <Pressable
                      onPress={() => setSelectedDateKey(day.dateKey)}
                      style={styles.timelineDayHeader}
                    >
                      <Text style={styles.timelineDayTitle}>
                        {day.fullLabel}
                      </Text>
                      <View style={styles.timelineDayRight}>
                        <Text style={styles.timelineDueText}>
                          {day.projectedTasks.length} due
                        </Text>
                        <ChevronRight size={14} color={palette.textMuted} />
                      </View>
                    </Pressable>

                    <View style={styles.compactTasksStack}>
                      {day.projectedTasks.map((task) => {
                        const isPropagation =
                          task.plant.species.plantType === "propagation";
                        const isSucculent =
                          task.plant.species.plantType === "succulent";

                        return (
                          <View
                            key={`${task.dateKey}-${task.plant.id}-${task.cycleIndex}`}
                            style={styles.compactTaskRow}
                          >
                            <Pressable
                              onPress={() =>
                                router.push({
                                  pathname: "/plant/[id]",
                                  params: { id: task.plant.id },
                                })
                              }
                              style={styles.compactTaskMain}
                            >
                              <Image
                                source={{ uri: task.plant.photoUri }}
                                style={styles.compactThumb}
                                contentFit="cover"
                              />
                              <View style={styles.compactTaskText}>
                                <Text
                                  style={styles.compactNickname}
                                  numberOfLines={1}
                                >
                                  {task.plant.nickname}
                                </Text>
                                <Text
                                  style={styles.compactAction}
                                  numberOfLines={1}
                                >
                                  {isPropagation
                                    ? "Refresh water"
                                    : task.actionLabel}
                                </Text>
                              </View>
                            </Pressable>

                            <Pressable
                              onPress={() =>
                                onWaterPlantNow(
                                  task.plant.id,
                                  task.plant.nickname,
                                )
                              }
                              style={({ pressed }) => [
                                styles.compactWaterBtn,
                                isSucculent && styles.markWateredBtnSucculent,
                                pressed && { opacity: 0.8 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Mark ${task.plant.nickname} as watered`}
                            >
                              <Droplets size={13} color={palette.textInverse} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </GlassCard>

      {/* Calendar Month Glass Card */}
      <GlassCard>
        <View style={styles.heatmapHeaderTop}>
          <Pressable
            onPress={() => setMonthOffset((m) => Math.max(0, m - 1))}
            disabled={monthOffset === 0}
            style={[
              styles.monthNavBtn,
              monthOffset === 0 && styles.monthNavBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={18} color={palette.textPrimary} />
          </Pressable>

          <View style={styles.monthTitleCenter}>
            <Text style={styles.heatmapTitle}>{calendarMonth.monthName}</Text>
            <Text style={styles.heatmapYear}>{calendarMonth.year}</Text>
          </View>

          <Pressable
            onPress={() => setMonthOffset((m) => m + 1)}
            style={styles.monthNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color={palette.textPrimary} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((wd) => (
            <Text key={wd} style={styles.weekdayLabel}>
              {wd}
            </Text>
          ))}
        </View>

        {/* 7-Column Calendar Weeks */}
        <View style={styles.calendarWeeks}>
          {calendarMonth.weeks.map((week, weekIdx) => (
            <View key={`week-${weekIdx}`} style={styles.calendarWeekRow}>
              {week.map((cell) => {
                if (cell.kind === "empty") {
                  return <View key={cell.key} style={styles.heatCellSpacer} />;
                }

                const count = cell.schedule?.projectedTasks.length ?? 0;
                const isSelected =
                  cell.dateKey === selectedDaySchedule?.dateKey;
                const canSelect = Boolean(cell.schedule);
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
                    key={cell.key}
                    disabled={!canSelect}
                    onPress={() => {
                      if (canSelect) {
                        setSelectedDateKey(cell.dateKey);
                      }
                    }}
                    style={[
                      styles.heatCell,
                      heatStyle,
                      cell.isToday && styles.heatCellToday,
                      isSelected && styles.heatCellSelected,
                      cell.isPast && styles.heatCellPast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.heatCellDateText,
                        count >= 3 && styles.heatCellDateTextInverse,
                      ]}
                    >
                      {cell.dayNum}
                    </Text>
                    <View style={styles.cellDotsRow}>
                      {count > 0 ? (
                        <Text
                          style={[
                            styles.heatCellCountText,
                            count >= 3 && styles.heatCellDateTextInverse,
                          ]}
                        >
                          {count}💧
                        </Text>
                      ) : cell.schedule?.hasFertilizeHistory ? (
                        <View style={[styles.cellDot, styles.dotFertilize]} />
                      ) : cell.schedule?.hasPropagationMilestone ? (
                        <View style={[styles.cellDot, styles.dotProp]} />
                      ) : (
                        <Text style={styles.heatCellEmptyDot}>·</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Icon Legend Row */}
        <View style={styles.legendRow}>
          <View style={[styles.legendPill, styles.legendPillWater]}>
            <Droplets size={12} color={palette.waterAlertText} />
            <Text
              style={[styles.legendText, { color: palette.waterAlertText }]}
            >
              Watering
            </Text>
          </View>
          <View style={[styles.legendPill, styles.legendPillCare]}>
            <Sparkles size={12} color={palette.attentionText} />
            <Text style={[styles.legendText, { color: palette.attentionText }]}>
              Care
            </Text>
          </View>
          <View style={[styles.legendPill, styles.legendPillProp]}>
            <Sprout size={12} color={palette.thrivingText} />
            <Text style={[styles.legendText, { color: palette.thrivingText }]}>
              Propagation
            </Text>
          </View>
        </View>
      </GlassCard>
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
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { plant, isOverdue, isDueToday, actionLabel } = task;
  const isPropagation = plant.species.plantType === "propagation";
  const isSucculent = plant.species.plantType === "succulent";

  return (
    <GlassCard variant="subtle" style={styles.taskCard}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/plant/[id]",
            params: { id: plant.id },
          })
        }
        style={styles.taskMainPressable}
      >
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
              <Sprout size={13} color={palette.primary} />
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
            ]}
          >
            <Droplet
              size={11}
              color={
                isOverdue
                  ? palette.criticalText
                  : isDueToday
                    ? palette.waterAlertText
                    : palette.primary
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
              ]}
            >
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
        accessibilityLabel={`Mark ${plant.nickname} as watered`}
      >
        <Droplets size={14} color={palette.textInverse} />
        <Text style={styles.markWateredBtnText}>
          {isDueToday || isOverdue ? "Mark Watered" : "Water Early"}
        </Text>
      </Pressable>
    </GlassCard>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: {
      gap: Spacing.md,
    },
    heatmapHeaderTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    monthTitleCenter: {
      alignItems: "center",
      justifyContent: "center",
    },
    heatmapYear: {
      ...Typography.caption,
      fontSize: 11,
      fontWeight: "600",
      color: palette.textMuted,
    },
    todayStatusPill: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + Spacing.half,
      borderRadius: Radius.full,
      borderWidth: BorderWidth.hairline,
    },
    todayStatusPillDue: {
      backgroundColor: palette.waterAlertBg,
      borderColor: palette.waterAlertBorder,
    },
    todayStatusPillCalm: {
      backgroundColor: palette.thrivingBg,
      borderColor: palette.thrivingBorder,
    },
    todayStatusPillText: {
      fontSize: Typography.caption.fontSize - 1,
      fontWeight: "700",
    },
    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: Spacing.sm,
      paddingTop: Spacing.sm,
      borderTopWidth: BorderWidth.hairline,
      borderTopColor: palette.borderSubtle,
    },
    legendPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs + Spacing.half,
      paddingHorizontal: Spacing.sm + Spacing.half,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: BorderWidth.hairline,
    },
    legendPillWater: {
      backgroundColor: palette.waterAlertBg,
      borderColor: palette.waterAlertBorder,
    },
    legendPillCare: {
      backgroundColor: palette.attentionBg,
      borderColor: palette.attentionBorder,
    },
    legendPillProp: {
      backgroundColor: palette.thrivingBg,
      borderColor: palette.thrivingBorder,
    },
    legendText: {
      fontSize: 11,
      fontWeight: "700",
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: Radius.full,
    },
    dotWater: {
      backgroundColor: palette.waterBlue,
    },
    dotFertilize: {
      backgroundColor: palette.attentionDot,
    },
    dotProp: {
      backgroundColor: palette.thrivingDot,
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
      backgroundColor: palette.bgSurface,
      borderWidth: 1.5,
      borderColor: palette.borderSubtle,
      alignItems: "center",
      gap: 4,
    },
    dayChipToday: {
      borderColor: palette.primary,
      backgroundColor: palette.primarySoft,
    },
    dayChipSelected: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    dayChipWeekday: {
      fontSize: 10,
      fontWeight: "700",
      color: palette.textSecondary,
      textTransform: "uppercase",
    },
    dayChipWeekdayToday: {
      color: palette.primary,
      fontWeight: "800",
    },
    dayChipNumber: {
      fontSize: 18,
      fontWeight: "800",
      color: palette.textPrimary,
    },
    dayChipTextSelected: {
      color: palette.textInverse,
    },
    dayDotsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minHeight: 8,
    },
    taskCountBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: Radius.full,
      backgroundColor: palette.waterAlertBg,
    },
    taskCountBadgeSelected: {
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    taskCountBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: palette.waterAlertText,
    },
    taskCountBadgeTextSelected: {
      color: palette.textInverse,
    },
    heatmapHeaderRow: {
      flex: 1,
      gap: Spacing.half,
    },
    heatmapTitle: {
      ...Typography.sectionTitle,
      fontFamily: Fonts?.serif,
      color: palette.textPrimary,
    },
    heatmapSubtitle: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    monthHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    monthNavGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    monthNavBtn: {
      width: 34,
      height: 34,
      borderRadius: Radius.full,
      backgroundColor: palette.bgSubtle,
      borderWidth: BorderWidth.hairline,
      borderColor: palette.borderSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    monthNavBtnDisabled: {
      opacity: 0.35,
    },
    weekdayRow: {
      flexDirection: "row",
      gap: Spacing.xs,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: Typography.caption.fontSize - 1,
      fontWeight: "700",
      color: palette.textMuted,
    },
    calendarWeeks: {
      gap: Spacing.xs,
    },
    calendarWeekRow: {
      flexDirection: "row",
      gap: Spacing.xs,
    },
    heatCellSpacer: {
      flex: 1,
      height: 44,
    },
    heatCell: {
      flex: 1,
      height: 44,
      borderRadius: Radius.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: BorderWidth.hairline,
      gap: 1,
    },
    heatCellToday: {
      borderColor: palette.primaryMuted,
      borderWidth: BorderWidth.medium,
    },
    heatCellPast: {
      opacity: 0.45,
    },
    cellDotsRow: {
      height: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    cellDot: {
      width: 6,
      height: 6,
      borderRadius: Radius.full,
    },
    heatCellEmptyDot: {
      fontSize: 10,
      color: palette.textMuted,
    },
    heatCellEmpty: {
      backgroundColor: palette.bgSubtle,
      borderColor: palette.borderSubtle,
    },
    heatCellLow: {
      backgroundColor: palette.waterAlertBg,
      borderColor: palette.waterAlertBorder,
    },
    heatCellMedium: {
      backgroundColor: palette.waterBlueSoft,
      borderColor: palette.waterBlue,
    },
    heatCellHigh: {
      backgroundColor: palette.waterBlue,
      borderColor: palette.waterBlue,
    },
    heatCellSelected: {
      borderWidth: 2.5,
      borderColor: palette.primary,
    },
    heatCellDateText: {
      fontSize: 12,
      fontWeight: "800",
      color: palette.textPrimary,
    },
    heatCellCountText: {
      fontSize: 10,
      fontWeight: "700",
      color: palette.waterAlertText,
    },
    heatCellDateTextInverse: {
      color: palette.textInverse,
    },
    dayAgendaHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    dayAgendaTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: palette.textPrimary,
    },
    dayAgendaSub: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 2,
    },
    waterAllInlineBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs + Spacing.half,
      backgroundColor: palette.waterBlue,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
    },
    waterAllInlineBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: palette.textInverse,
    },
    restDayBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      backgroundColor: palette.bgPrimary,
      borderRadius: Radius.lg,
      gap: 6,
    },
    restDayTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: palette.textPrimary,
    },
    restDayText: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: "center",
    },
    taskListCol: {
      gap: 10,
    },
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm + Spacing.half,
      padding: Spacing.sm + Spacing.half,
    },
    taskMainPressable: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    taskThumb: {
      width: 54,
      height: 54,
      borderRadius: Radius.md,
      backgroundColor: palette.bgElevated,
    },
    taskInfoCol: {
      flex: 1,
      gap: 3,
    },
    taskTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    taskNickname: {
      fontSize: 15,
      fontWeight: "800",
      color: palette.textPrimary,
      flexShrink: 1,
    },
    taskSpecies: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    actionPill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      marginTop: 2,
      borderWidth: 1,
    },
    actionPillOverdue: {
      backgroundColor: palette.criticalBg,
      borderColor: palette.criticalBorder,
    },
    actionPillToday: {
      backgroundColor: palette.waterAlertBg,
      borderColor: palette.waterAlertBorder,
    },
    actionPillUpcoming: {
      backgroundColor: palette.primarySoft,
      borderColor: palette.primaryBorder,
    },
    actionPillText: {
      fontSize: 11,
      fontWeight: "700",
    },
    actionPillTextOverdue: {
      color: palette.criticalText,
    },
    actionPillTextToday: {
      color: palette.waterAlertText,
    },
    actionPillTextUpcoming: {
      color: palette.primary,
    },
    markWateredBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs + Spacing.half,
      backgroundColor: palette.waterBlue,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + Spacing.half,
      borderRadius: Radius.md,
    },
    markWateredBtnSucculent: {
      backgroundColor: palette.accentTerracotta,
    },
    markWateredBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: palette.textInverse,
    },
    completedLogRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: Radius.md,
      backgroundColor: palette.thrivingBg,
      borderWidth: 1,
      borderColor: palette.thrivingBorder,
    },
    completedLogTextCol: {
      flex: 1,
    },
    completedLogTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: palette.thrivingText,
    },
    completedLogSub: {
      fontSize: 11,
      color: palette.thrivingText,
      opacity: 0.85,
    },
    upcomingHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    upcomingTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    upcomingSectionTitle: {
      ...Typography.sectionTitle,
      fontFamily: Fonts?.serif,
      color: palette.textPrimary,
    },
    timelineEmptyBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: palette.bgSubtle,
    },
    timelineEmptyText: {
      flex: 1,
      ...Typography.caption,
      color: palette.textSecondary,
    },
    timelineRailList: {
      gap: 0,
    },
    timelineRailRow: {
      flexDirection: "row",
      gap: Spacing.md,
    },
    railLeftCol: {
      width: 40,
      alignItems: "center",
    },
    railDateBadge: {
      width: 40,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.md,
      backgroundColor: palette.bgSubtle,
      borderWidth: BorderWidth.hairline,
      borderColor: palette.borderSubtle,
      alignItems: "center",
    },
    railDateMonth: {
      fontSize: 10,
      fontWeight: "700",
      color: palette.textMuted,
      textTransform: "uppercase",
    },
    railDateNum: {
      fontSize: 14,
      fontWeight: "800",
      color: palette.textPrimary,
    },
    railLine: {
      flex: 1,
      width: 1.5,
      backgroundColor: palette.borderSubtle,
      marginVertical: Spacing.xs,
    },
    railContentCol: {
      flex: 1,
      gap: Spacing.sm,
    },
    railContentColSpaced: {
      paddingBottom: Spacing.lg,
    },
    timelineDayHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    timelineDayTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: palette.textSecondary,
    },
    timelineDayRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    timelineDueText: {
      fontSize: 11,
      fontWeight: "700",
      color: palette.waterAlertText,
    },
    timelineCountPill: {
      paddingHorizontal: Spacing.sm + Spacing.half,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: palette.waterAlertBg,
      borderWidth: BorderWidth.hairline,
      borderColor: palette.waterAlertBorder,
    },
    timelineCountPillText: {
      fontSize: 11,
      fontWeight: "700",
      color: palette.waterAlertText,
    },
    compactTasksStack: {
      gap: Spacing.xs + Spacing.half,
    },
    compactTaskRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
      paddingVertical: Spacing.xs + Spacing.half,
      paddingHorizontal: Spacing.sm + Spacing.half,
      borderRadius: Radius.md,
      backgroundColor: palette.bgSubtle,
      borderWidth: BorderWidth.hairline,
      borderColor: palette.borderSubtle,
    },
    compactTaskMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    compactThumb: {
      width: 34,
      height: 34,
      borderRadius: Radius.full,
      backgroundColor: palette.bgElevated,
    },
    compactTaskText: {
      flex: 1,
      gap: 1,
    },
    compactNickname: {
      fontSize: 13,
      fontWeight: "700",
      color: palette.textPrimary,
    },
    compactAction: {
      fontSize: 11,
      color: palette.textSecondary,
    },
    compactWaterBtn: {
      width: 30,
      height: 30,
      borderRadius: Radius.full,
      backgroundColor: palette.waterBlue,
      alignItems: "center",
      justifyContent: "center",
    },
  });
