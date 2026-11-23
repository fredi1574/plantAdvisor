import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Sparkles,
  Sprout,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { GlassCard } from '@/components/ui/glass-card';
import {
  BorderWidth,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  WEEKDAY_LABELS,
  type CalendarMonthGrid,
} from '@/services/calendarUtils';
import { triggerLightHaptic } from '@/services/haptics';

interface CareMonthCalendarProps {
  calendarMonth: CalendarMonthGrid;
  selectedDateKey?: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateKey: string) => void;
}

/**
 * Interactive 7-column botanical care heatmap calendar with legend.
 */
export function CareMonthCalendar({
  calendarMonth,
  selectedDateKey,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: CareMonthCalendarProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const weekdays = t('schedule.weekdays', { returnObjects: true }) as string[];
  const weekdayList = Array.isArray(weekdays) ? weekdays : WEEKDAY_LABELS;

  return (
    <GlassCard>
      <View style={styles.headerTop}>
        <SpringPressable
          onPress={() => {
            triggerLightHaptic();
            onPrevMonth();
          }}
          style={[
            styles.monthNavBtn,
            {
              backgroundColor: palette.bgSubtle,
              borderColor: palette.borderSubtle,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ChevronLeft size={18} color={palette.textPrimary} />
        </SpringPressable>

        <View style={styles.monthTitleCenter}>
          <Text
            style={[
              styles.monthTitle,
              { color: palette.textPrimary, fontFamily: Fonts?.serif },
            ]}>
            {calendarMonth.monthName}
          </Text>
          <Text style={[styles.monthYear, { color: palette.textMuted }]}>
            {calendarMonth.year}
          </Text>
        </View>

        <SpringPressable
          onPress={() => {
            triggerLightHaptic();
            onNextMonth();
          }}
          style={[
            styles.monthNavBtn,
            {
              backgroundColor: palette.bgSubtle,
              borderColor: palette.borderSubtle,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ChevronRight size={18} color={palette.textPrimary} />
        </SpringPressable>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayList.map((wd) => (
          <Text
            key={wd}
            style={[styles.weekdayLabel, { color: palette.textMuted }]}>
            {wd}
          </Text>
        ))}
      </View>

      <View style={styles.calendarWeeks}>
        {calendarMonth.weeks.map((week, weekIdx) => (
          <View key={`week-${weekIdx}`} style={styles.calendarWeekRow}>
            {week.map((cell) => {
              if (cell.kind === 'empty') {
                return <View key={cell.key} style={styles.cellSpacer} />;
              }

              const count = cell.schedule?.projectedTasks.length ?? 0;
              const completedCount = cell.completedCount;
              const isSelected = cell.dateKey === selectedDateKey;

              const cellColors =
                count === 0
                  ? {
                      bg: palette.bgSubtle,
                      border: palette.borderSubtle,
                    }
                  : count === 1
                    ? {
                        bg: palette.waterAlertBg,
                        border: palette.waterAlertBorder,
                      }
                    : count === 2
                      ? {
                          bg: palette.waterBlueSoft,
                          border: palette.waterBlue,
                        }
                      : {
                          bg: palette.waterBlue,
                          border: palette.waterBlue,
                        };

              const isInverse = count >= 3;

              return (
                <Pressable
                  key={cell.key}
                  onPress={() => {
                    triggerLightHaptic();
                    onSelectDate(cell.dateKey);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${calendarMonth.monthName} ${cell.dayNum}, ${count} tasks due`}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: cellColors.bg,
                      borderColor: cellColors.border,
                    },
                    cell.isToday && {
                      borderColor: palette.primaryMuted,
                      borderWidth: BorderWidth.medium,
                    },
                    isSelected && {
                      borderWidth: 2.5,
                      borderColor: palette.primary,
                    },
                    cell.isPast && styles.heatCellPast,
                  ]}>
                  <Text
                    style={[
                      styles.heatCellDateText,
                      {
                        color: isInverse
                          ? palette.textInverse
                          : palette.textPrimary,
                      },
                    ]}>
                    {cell.dayNum}
                  </Text>
                  <View style={styles.cellDotsRow}>
                    {count > 0 ? (
                      <Text
                        style={[
                          styles.heatCellCountText,
                          {
                            color: isInverse
                              ? palette.textInverse
                              : palette.waterAlertText,
                          },
                        ]}>
                        {count}💧
                      </Text>
                    ) : completedCount > 0 ? (
                      <Text
                        style={[
                          styles.heatCellCountText,
                          { color: palette.thrivingText },
                        ]}>
                        {completedCount}✓
                      </Text>
                    ) : cell.schedule?.hasFertilizeHistory ? (
                      <View
                        style={[
                          styles.cellDot,
                          { backgroundColor: palette.attentionDot },
                        ]}
                      />
                    ) : cell.schedule?.hasPropagationMilestone ? (
                      <View
                        style={[
                          styles.cellDot,
                          { backgroundColor: palette.thrivingDot },
                        ]}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.heatCellEmptyDot,
                          { color: palette.textMuted },
                        ]}>
                        ·
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View
        style={[
          styles.legendRow,
          { borderTopColor: palette.borderSubtle },
        ]}>
        <View
          style={[
            styles.legendPill,
            {
              backgroundColor: palette.waterAlertBg,
              borderColor: palette.waterAlertBorder,
            },
          ]}>
          <Droplets size={12} color={palette.waterAlertText} />
          <Text style={[styles.legendText, { color: palette.waterAlertText }]}>
            {t('schedule.legend.watering')}
          </Text>
        </View>
        <View
          style={[
            styles.legendPill,
            {
              backgroundColor: palette.attentionBg,
              borderColor: palette.attentionBorder,
            },
          ]}>
          <Sparkles size={12} color={palette.attentionText} />
          <Text style={[styles.legendText, { color: palette.attentionText }]}>
            {t('schedule.legend.care')}
          </Text>
        </View>
        <View
          style={[
            styles.legendPill,
            {
              backgroundColor: palette.thrivingBg,
              borderColor: palette.thrivingBorder,
            },
          ]}>
          <Sprout size={12} color={palette.thrivingText} />
          <Text style={[styles.legendText, { color: palette.thrivingText }]}>
            {t('schedule.legend.propagation')}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...Typography.sectionTitle,
  },
  monthYear: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.caption.fontSize - 1,
    fontWeight: '700',
  },
  calendarWeeks: {
    gap: Spacing.xs,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  cellSpacer: {
    flex: 1,
    height: 44,
  },
  heatCell: {
    flex: 1,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidth.hairline,
    gap: 1,
  },
  heatCellPast: {
    opacity: 0.45,
  },
  heatCellDateText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cellDotsRow: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  heatCellEmptyDot: {
    fontSize: 10,
  },
  heatCellCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: BorderWidth.hairline,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.sm + Spacing.half,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
