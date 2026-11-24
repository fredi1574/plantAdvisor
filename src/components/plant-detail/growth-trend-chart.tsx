import { Sprout } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Chip } from '@/components/ui/chip';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { NotebookEntry, PlantType } from '@/types/plant';

type MetricKey = 'rootLengthCm' | 'stemHeightCm' | 'leafCount';

interface MetricConfig {
  key: MetricKey;
  labelKey: string;
  unitKey: string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'rootLengthCm',
    labelKey: 'plantDetail.growth.rootLength',
    unitKey: 'plantDetail.growth.unitCm',
  },
  {
    key: 'stemHeightCm',
    labelKey: 'plantDetail.growth.stemHeight',
    unitKey: 'plantDetail.growth.unitCm',
  },
  {
    key: 'leafCount',
    labelKey: 'plantDetail.growth.leafCount',
    unitKey: 'plantDetail.growth.unitLeaves',
  },
];

const SOIL_TRANSITION_TARGET_CM = 10;

interface GrowthTrendChartProps {
  entries: NotebookEntry[];
  plantType: PlantType;
}

interface ChartPoint {
  dateLabel: string;
  timestamp: number;
  value: number;
}

function formatShortDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function GrowthTrendChart({
  entries,
  plantType,
}: GrowthTrendChartProps) {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const [chartWidth, setChartWidth] = useState(300);

  const seriesByMetric = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const map: Record<MetricKey, ChartPoint[]> = {
      rootLengthCm: [],
      stemHeightCm: [],
      leafCount: [],
    };

    for (const entry of sorted) {
      if (!entry.metrics) continue;
      const ts = new Date(entry.timestamp).getTime();
      if (Number.isNaN(ts)) continue;
      const dateLabel = formatShortDate(entry.timestamp, i18n.language);

      if (typeof entry.metrics.rootLengthCm === 'number') {
        map.rootLengthCm.push({
          dateLabel,
          timestamp: ts,
          value: entry.metrics.rootLengthCm,
        });
      }
      if (typeof entry.metrics.stemHeightCm === 'number') {
        map.stemHeightCm.push({
          dateLabel,
          timestamp: ts,
          value: entry.metrics.stemHeightCm,
        });
      }
      if (typeof entry.metrics.leafCount === 'number') {
        map.leafCount.push({
          dateLabel,
          timestamp: ts,
          value: entry.metrics.leafCount,
        });
      }
    }

    return map;
  }, [entries, i18n.language]);

  const availableMetrics = useMemo(
    () => METRICS.filter((m) => seriesByMetric[m.key].length > 0),
    [seriesByMetric]
  );

  const [selectedKey, setSelectedKey] = useState<MetricKey>('rootLengthCm');

  const activeMetric = useMemo(() => {
    const found = availableMetrics.find((m) => m.key === selectedKey);
    return found ?? availableMetrics[0] ?? METRICS[0];
  }, [availableMetrics, selectedKey]);

  const activePoints = seriesByMetric[activeMetric.key];
  const latestRootPoint =
    seriesByMetric.rootLengthCm[seriesByMetric.rootLengthCm.length - 1];

  if (availableMetrics.length === 0) {
    return null;
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 120) {
      setChartWidth(w);
    }
  };

  const chartHeight = 148;
  const padLeft = 34;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;
  const plotW = Math.max(80, chartWidth - padLeft - padRight);
  const plotH = chartHeight - padTop - padBottom;

  const values = activePoints.map((p) => p.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, minVal + 1);
  const valRange = Math.max(1, maxVal - minVal);

  const coords = activePoints.map((pt, idx) => {
    const x =
      activePoints.length === 1
        ? padLeft + plotW / 2
        : padLeft + (idx / (activePoints.length - 1)) * plotW;
    const y = padTop + plotH - ((pt.value - minVal) / valRange) * plotH;
    return { ...pt, x, y };
  });

  const linePath = coords
    .map(
      (c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
    )
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(
          1
        )} Z`
      : '';

  const latestVal = activePoints[activePoints.length - 1]?.value ?? 0;
  const firstVal = activePoints[0]?.value ?? 0;
  const deltaVal = latestVal - firstVal;

  const rootCm = latestRootPoint?.value ?? 0;
  const rootProgressRatio = Math.min(1, rootCm / SOIL_TRANSITION_TARGET_CM);
  const rootReadinessText =
    rootCm >= SOIL_TRANSITION_TARGET_CM
      ? t('plantDetail.growth.taprootReady', {
          current: rootCm.toFixed(1),
          target: SOIL_TRANSITION_TARGET_CM,
        })
      : rootCm >= 8
        ? t('plantDetail.growth.taprootAlmost', {
            current: rootCm.toFixed(1),
            target: SOIL_TRANSITION_TARGET_CM,
          })
        : t('plantDetail.growth.taprootDeveloping', {
            current: rootCm.toFixed(1),
            target: SOIL_TRANSITION_TARGET_CM,
          });

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
          {t('plantDetail.growth.eyebrow')}
        </Text>
        <View
          style={[
            styles.statBadge,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
          ]}>
          <Text style={[styles.statBadgeText, { color: palette.primary }]}>
            {latestVal} {t(activeMetric.unitKey)}
            {activePoints.length > 1 && deltaVal !== 0
              ? ` (${deltaVal > 0 ? '+' : ''}${Number(deltaVal.toFixed(1))})`
              : ''}
          </Text>
        </View>
      </View>

      {availableMetrics.length > 1 && (
        <View style={styles.pillRow}>
          {availableMetrics.map((metric) => (
            <Chip
              key={metric.key}
              label={t(metric.labelKey)}
              variant="subtle"
              selected={metric.key === activeMetric.key}
              selectedStyle="solid"
              onPress={() => setSelectedKey(metric.key)}
            />
          ))}
        </View>
      )}

      <View onLayout={handleLayout} style={styles.svgContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={palette.primary}
                stopOpacity="0.28"
              />
              <Stop
                offset="1"
                stopColor={palette.primary}
                stopOpacity="0.02"
              />
            </LinearGradient>
          </Defs>

          {[0, 0.5, 1].map((frac) => {
            const y = padTop + plotH * (1 - frac);
            const labelVal = minVal + valRange * frac;
            return (
              <React.Fragment key={frac}>
                <Line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  stroke={palette.borderSubtle}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <SvgText
                  x={padLeft - 6}
                  y={y + 4}
                  fontSize={10}
                  fill={palette.textMuted}
                  textAnchor="end">
                  {Number(labelVal.toFixed(1))}
                </SvgText>
              </React.Fragment>
            );
          })}

          {areaPath ? <Path d={areaPath} fill="url(#growthFill)" /> : null}

          {coords.length > 1 ? (
            <Path
              d={linePath}
              fill="none"
              stroke={palette.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {coords.map((pt, idx) => (
            <React.Fragment key={`${pt.timestamp}-${idx}`}>
              <Circle
                cx={pt.x}
                cy={pt.y}
                r={4.5}
                fill={palette.bgElevated}
                stroke={palette.primary}
                strokeWidth={2.5}
              />
              {(idx === 0 ||
                idx === coords.length - 1 ||
                coords.length <= 4) && (
                <SvgText
                  x={pt.x}
                  y={chartHeight - 6}
                  fontSize={10}
                  fill={palette.textMuted}
                  textAnchor="middle">
                  {pt.dateLabel}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </Svg>
      </View>

      {plantType === 'propagation' && latestRootPoint && (
        <View
          style={[
            styles.milestoneBox,
            {
              backgroundColor: palette.bgSubtle,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View style={styles.milestoneHeader}>
            <Sprout size={14} color={palette.primary} strokeWidth={2.2} />
            <Text
              style={[styles.milestoneText, { color: palette.textPrimary }]}>
              {rootReadinessText}
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: palette.borderSubtle },
            ]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(rootProgressRatio * 100)}%`,
                  backgroundColor: palette.primary,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  statBadge: {
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  svgContainer: {
    width: '100%',
    alignItems: 'center',
  },
  milestoneBox: {
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.sm,
    gap: 6,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
