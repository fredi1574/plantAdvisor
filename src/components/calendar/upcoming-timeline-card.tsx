import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  CheckCircle2,
  ChevronRight,
  Droplets,
  FlaskConical,
  RotateCw,
  Sparkles,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import {
  BorderWidth,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type {
  DayCareSchedule,
  ProjectedPlantCareTask,
} from '@/services/calendarUtils';

interface UpcomingTimelineCardProps {
  upcomingDays: DayCareSchedule[];
  totalTaskCount: number;
  onSelectDate: (dateKey: string) => void;
  onCompleteTask: (task: ProjectedPlantCareTask) => void;
}

/**
 * 14-day vertical care timeline rail displaying compact projected care tasks.
 */
export function UpcomingTimelineCard({
  upcomingDays,
  totalTaskCount,
  onSelectDate,
  onCompleteTask,
}: UpcomingTimelineCardProps) {
  const palette = usePalette();

  return (
    <GlassCard>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Sparkles size={16} color={palette.primary} />
          <Text
            style={[
              styles.sectionTitle,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            Upcoming 2 Weeks
          </Text>
        </View>
        <View
          style={[
            styles.countPill,
            {
              backgroundColor: palette.waterAlertBg,
              borderColor: palette.waterAlertBorder,
            },
          ]}>
          <Text
            style={[styles.countPillText, { color: palette.waterAlertText }]}>
            {totalTaskCount} {totalTaskCount === 1 ? 'task' : 'tasks'}
          </Text>
        </View>
      </View>

      {upcomingDays.length === 0 ? (
        <View
          style={[styles.emptyBox, { backgroundColor: palette.bgSubtle }]}>
          <CheckCircle2 size={20} color={palette.primaryMuted} />
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
            No other care tasks scheduled in the next 2 weeks.
          </Text>
        </View>
      ) : (
        <View>
          {upcomingDays.map((day, idx) => {
            const isLast = idx === upcomingDays.length - 1;
            return (
              <View key={day.dateKey} style={styles.railRow}>
                <View style={styles.railLeftCol}>
                  <View
                    style={[
                      styles.railDateBadge,
                      {
                        backgroundColor: palette.bgSubtle,
                        borderColor: palette.borderSubtle,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.railDateMonth,
                        { color: palette.textMuted },
                      ]}>
                      {day.dayOfWeekShort}
                    </Text>
                    <Text
                      style={[
                        styles.railDateNum,
                        { color: palette.textPrimary },
                      ]}>
                      {day.dayOfMonth}
                    </Text>
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.railLine,
                        { backgroundColor: palette.borderSubtle },
                      ]}
                    />
                  )}
                </View>

                <View
                  style={[
                    styles.railContentCol,
                    !isLast && styles.railContentColSpaced,
                  ]}>
                  <Pressable
                    onPress={() => onSelectDate(day.dateKey)}
                    style={styles.dayHeader}>
                    <Text
                      style={[
                        styles.dayTitle,
                        { color: palette.textSecondary },
                      ]}>
                      {day.fullLabel}
                    </Text>
                    <View style={styles.dayRight}>
                      <Text
                        style={[
                          styles.dueText,
                          { color: palette.waterAlertText },
                        ]}>
                        {day.projectedTasks.length} due
                      </Text>
                      <ChevronRight size={14} color={palette.textMuted} />
                    </View>
                  </Pressable>

                  <View style={styles.compactTasksStack}>
                    {day.projectedTasks.map((task) => {
                      const isPropagation =
                        task.plant.species.plantType === 'propagation';
                      const isSucculent =
                        task.plant.species.plantType === 'succulent';
                      const quickBtnBg =
                        task.taskKind === 'fertilize'
                          ? palette.primary
                          : task.taskKind === 'rotate'
                            ? palette.primaryMuted
                            : isSucculent
                              ? palette.accentTerracotta
                              : palette.waterBlue;

                      const subtitle =
                        task.taskKind === 'water' && isPropagation
                          ? 'Refresh water'
                          : task.actionLabel;

                      return (
                        <View
                          key={`${task.dateKey}-${task.plant.id}-${task.taskKind}-${task.cycleIndex}`}
                          style={[
                            styles.compactTaskRow,
                            {
                              backgroundColor: palette.bgSubtle,
                              borderColor: palette.borderSubtle,
                            },
                          ]}>
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '/plant/[id]',
                                params: { id: task.plant.id },
                              })
                            }
                            style={styles.compactTaskMain}>
                            <Image
                              source={{ uri: task.plant.photoUri }}
                              style={[
                                styles.compactThumb,
                                { backgroundColor: palette.bgElevated },
                              ]}
                              contentFit="cover"
                            />
                            <View style={styles.compactTaskText}>
                              <Text
                                style={[
                                  styles.compactNickname,
                                  { color: palette.textPrimary },
                                ]}
                                numberOfLines={1}>
                                {task.plant.nickname}
                              </Text>
                              <Text
                                style={[
                                  styles.compactAction,
                                  { color: palette.textSecondary },
                                ]}
                                numberOfLines={1}>
                                {subtitle}
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() => onCompleteTask(task)}
                            style={({ pressed }) => [
                              styles.compactActionBtn,
                              { backgroundColor: quickBtnBg },
                              pressed && { opacity: 0.8 },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Complete ${task.taskKind} for ${task.plant.nickname}`}>
                            {task.taskKind === 'fertilize' ? (
                              <FlaskConical
                                size={13}
                                color={palette.textInverse}
                              />
                            ) : task.taskKind === 'rotate' ? (
                              <RotateCw
                                size={13}
                                color={palette.textInverse}
                              />
                            ) : (
                              <Droplets
                                size={13}
                                color={palette.textInverse}
                              />
                            )}
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
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
  },
  countPill: {
    paddingHorizontal: Spacing.sm + Spacing.half,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  emptyText: {
    flex: 1,
    ...Typography.caption,
  },
  railRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  railLeftCol: {
    width: 40,
    alignItems: 'center',
  },
  railDateBadge: {
    width: 40,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
  },
  railDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  railDateNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  railLine: {
    flex: 1,
    width: 1.5,
    marginVertical: Spacing.xs,
  },
  railContentCol: {
    flex: 1,
    gap: Spacing.sm,
  },
  railContentColSpaced: {
    paddingBottom: Spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactTasksStack: {
    gap: Spacing.xs + Spacing.half,
  },
  compactTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.sm + Spacing.half,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  compactTaskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactThumb: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
  },
  compactTaskText: {
    flex: 1,
    gap: 1,
  },
  compactNickname: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactAction: {
    fontSize: 11,
  },
  compactActionBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
