import { Image } from 'expo-image';
import { Award, BookOpen, CheckCircle2, Leaf } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BotanicalSealCrest,
  ConservatoryRankCrest,
} from '@/components/profile/botanical-seal-badge';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  ALL_PLANT_TYPES,
  computeConservatorySnapshot,
  type BotanicalSeal,
  type BotanicalSealId,
} from '@/services/conservatoryService';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';

type ConservatoryTab = 'seals' | 'herbarium';

/**
 * Calm, editorial Conservatory section inside Account/Profile.
 * Displays purely derived botanical stewardship rank, care rhythm metrics,
 * pressed-leaf Botanical Seals, and the user's Species Herbarium.
 */
export function ConservatorySection() {
  const { t } = useTranslation();
  const palette = usePalette();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);

  const [activeTab, setActiveTab] = useState<ConservatoryTab>('seals');
  const [selectedSealId, setSelectedSealId] = useState<BotanicalSealId | null>(
    null
  );

  const snapshot = useMemo(
    () => computeConservatorySnapshot(plants, entries, healthAssessments),
    [plants, entries, healthAssessments]
  );

  const selectedSeal: BotanicalSeal | null = useMemo(() => {
    if (!selectedSealId) return null;
    return snapshot.seals.find((s) => s.id === selectedSealId) ?? null;
  }, [selectedSealId, snapshot.seals]);

  const rankTitle = t(`conservatory.ranks.${snapshot.rank.id}.title`);
  const rankSubtitle = t(`conservatory.ranks.${snapshot.rank.id}.subtitle`);
  const nextRankTitle = snapshot.rank.nextRankId
    ? t(`conservatory.ranks.${snapshot.rank.nextRankId}.title`)
    : null;
  const rankPercent = Math.round(snapshot.rank.progress * 100);

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
        {t('conservatory.eyebrow')}
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        {/* Editorial Rank Header */}
        <View style={styles.rankHeader}>
          <ConservatoryRankCrest tier={snapshot.rank.tier} size={58} />

          <View style={styles.rankCopy}>
            <Text style={[styles.rankEyebrow, { color: palette.primaryMuted }]}>
              {t('conservatory.rankEyebrow')} · {snapshot.rank.tier}/5
            </Text>
            <Text
              style={[
                styles.rankTitle,
                { color: palette.textPrimary, fontFamily: Fonts?.serif },
              ]}>
              {rankTitle}
            </Text>
            <Text
              style={[styles.rankSubtitle, { color: palette.textSecondary }]}>
              {rankSubtitle}
            </Text>
          </View>
        </View>

        {/* Quiet Stewardship Progress Rail */}
        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressMeta, { color: palette.textMuted }]}>
              {t('conservatory.stewardshipPoints', {
                score: snapshot.rank.score,
              })}
            </Text>
            <Text style={[styles.progressMeta, { color: palette.primary }]}>
              {nextRankTitle
                ? t('conservatory.nextRankProgress', {
                    points: snapshot.rank.pointsToNext,
                    nextRank: nextRankTitle,
                  })
                : t('conservatory.maxRankReached')}
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={rankTitle}
            accessibilityValue={{ min: 0, max: 100, now: rankPercent }}
            style={[styles.progressTrack, { backgroundColor: palette.bgSubtle }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(4, rankPercent)}%`,
                  backgroundColor: palette.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Calm Care Rhythm Strip */}
        <View
          style={[
            styles.statsStrip,
            {
              backgroundColor: palette.bgPrimary,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {t('conservatory.stats.rhythmValue', {
                count: snapshot.rhythm.rhythmWeeks,
              })}
            </Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
              {t('conservatory.stats.rhythmLabel')}
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]}
          />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {snapshot.rhythm.harmonyPercent}%
            </Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
              {t('conservatory.stats.onScheduleLabel')}
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]}
          />
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {snapshot.unlockedSealCount}/{snapshot.seals.length}
            </Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
              {t('conservatory.stats.sealsLabel')}
            </Text>
          </View>
        </View>

        {/* Sub-navigation: Botanical Seals vs Herbarium */}
        <View
          style={[
            styles.segmentBar,
            {
              backgroundColor: palette.bgPrimary,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('seals');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'seals' }}
            style={[
              styles.segmentPill,
              activeTab === 'seals' && {
                backgroundColor: palette.bgSurface,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <Award
              size={14}
              color={
                activeTab === 'seals' ? palette.primary : palette.textSecondary
              }
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === 'seals'
                      ? palette.textPrimary
                      : palette.textSecondary,
                },
              ]}>
              {t('conservatory.tabs.seals')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('herbarium');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'herbarium' }}
            style={[
              styles.segmentPill,
              activeTab === 'herbarium' && {
                backgroundColor: palette.bgSurface,
                borderColor: palette.borderSubtle,
              },
            ]}>
            <BookOpen
              size={14}
              color={
                activeTab === 'herbarium'
                  ? palette.primary
                  : palette.textSecondary
              }
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === 'herbarium'
                      ? palette.textPrimary
                      : palette.textSecondary,
                },
              ]}>
              {t('conservatory.tabs.herbarium')} ({snapshot.herbarium.plates.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab Panel */}
        {activeTab === 'seals' ? (
          <View style={styles.sealsPanel}>
            <View style={styles.sealsGrid}>
              {snapshot.seals.map((seal) => {
                const isSelected = selectedSealId === seal.id;
                const sealTitle = t(`conservatory.seals.${seal.id}.title`);
                const progressLabel = seal.unlocked
                  ? t('conservatory.sealEarned')
                  : t('conservatory.sealProgress', {
                      current: Math.min(seal.current, seal.target),
                      target: seal.target,
                    });

                return (
                  <Pressable
                    key={seal.id}
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedSealId((prev) =>
                        prev === seal.id ? null : seal.id
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${sealTitle}, ${progressLabel}`}
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.sealTile,
                      {
                        backgroundColor: seal.unlocked
                          ? palette.bgPrimary
                          : palette.bgSurface,
                        borderColor: isSelected
                          ? palette.primary
                          : seal.unlocked
                            ? palette.primaryBorder
                            : palette.borderSubtle,
                      },
                      pressed && { opacity: 0.85 },
                    ]}>
                    <BotanicalSealCrest
                      sealId={seal.id}
                      tone={seal.tone}
                      unlocked={seal.unlocked}
                      size={44}
                    />
                    <Text
                      style={[
                        styles.sealTitle,
                        {
                          color: seal.unlocked
                            ? palette.textPrimary
                            : palette.textSecondary,
                        },
                      ]}
                      numberOfLines={2}>
                      {sealTitle}
                    </Text>

                    {seal.unlocked ? (
                      <View
                        style={[
                          styles.sealEarnedPill,
                          { backgroundColor: palette.primarySoft },
                        ]}>
                        <CheckCircle2 size={10} color={palette.primary} />
                        <Text
                          style={[
                            styles.sealEarnedText,
                            { color: palette.primary },
                          ]}>
                          {t('conservatory.sealEarned')}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.sealMiniProgress}>
                        <View
                          style={[
                            styles.sealMiniTrack,
                            { backgroundColor: palette.bgSubtle },
                          ]}>
                          <View
                            style={[
                              styles.sealMiniFill,
                              {
                                width: `${Math.round(seal.progress * 100)}%`,
                                backgroundColor: palette.primaryMuted,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.sealCountText,
                            { color: palette.textMuted },
                          ]}>
                          {progressLabel}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedSeal ? (
              <View
                style={[
                  styles.sealDetailBox,
                  {
                    backgroundColor: palette.bgPrimary,
                    borderColor: palette.primaryBorder,
                  },
                ]}>
                <View style={styles.sealDetailHeader}>
                  <Text
                    style={[
                      styles.sealDetailTitle,
                      { color: palette.textPrimary, fontFamily: Fonts?.serif },
                    ]}>
                    {t(`conservatory.seals.${selectedSeal.id}.title`)}
                  </Text>
                  <Text
                    style={[
                      styles.sealDetailProgress,
                      {
                        color: selectedSeal.unlocked
                          ? palette.primary
                          : palette.textSecondary,
                      },
                    ]}>
                    {selectedSeal.unlocked
                      ? t('conservatory.sealEarned')
                      : t('conservatory.sealProgress', {
                          current: Math.min(
                            selectedSeal.current,
                            selectedSeal.target
                          ),
                          target: selectedSeal.target,
                        })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.sealDetailDesc,
                    { color: palette.textSecondary },
                  ]}>
                  {t(`conservatory.seals.${selectedSeal.id}.description`)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.sealHint, { color: palette.textMuted }]}>
                {t('conservatory.sealHint')}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.herbariumPanel}>
            {/* Plant Type Coverage Pills */}
            <View style={styles.typesBlock}>
              <View style={styles.typesHeader}>
                <Text
                  style={[styles.typesLabel, { color: palette.textSecondary }]}>
                  {t('conservatory.herbarium.typesLabel')}
                </Text>
                <Text style={[styles.typesCount, { color: palette.textMuted }]}>
                  {t('conservatory.herbarium.familiesSummary', {
                    count: snapshot.herbarium.distinctFamilies.length,
                  })}
                </Text>
              </View>
              <View style={styles.typeChipRow}>
                {ALL_PLANT_TYPES.map((type) => {
                  const collected =
                    snapshot.herbarium.plantTypesCovered.includes(type);
                  return (
                    <View
                      key={type}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: collected
                            ? palette.primarySoft
                            : palette.bgPrimary,
                          borderColor: collected
                            ? palette.primaryBorder
                            : palette.borderSubtle,
                        },
                      ]}>
                      <Leaf
                        size={11}
                        color={collected ? palette.primary : palette.textMuted}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color: collected
                              ? palette.primary
                              : palette.textMuted,
                          },
                        ]}>
                        {t(`plantOptions.plantType.${type}`)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Herbarium Field Plates */}
            {snapshot.herbarium.plates.length === 0 ? (
              <View
                style={[
                  styles.emptyHerbarium,
                  {
                    backgroundColor: palette.bgPrimary,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: palette.textPrimary, fontFamily: Fonts?.serif },
                  ]}>
                  {t('conservatory.herbarium.emptyTitle')}
                </Text>
                <Text
                  style={[styles.emptyBody, { color: palette.textSecondary }]}>
                  {t('conservatory.herbarium.emptyBody')}
                </Text>
              </View>
            ) : (
              <View style={styles.platesList}>
                {snapshot.herbarium.plates.map((plate) => (
                  <View
                    key={plate.key}
                    style={[
                      styles.plateRow,
                      {
                        backgroundColor: palette.bgPrimary,
                        borderColor: palette.borderSubtle,
                      },
                    ]}>
                    <Image
                      source={{ uri: plate.photoUri }}
                      style={[
                        styles.plateThumb,
                        { backgroundColor: palette.bgSubtle },
                      ]}
                      contentFit="cover"
                    />
                    <View style={styles.plateInfo}>
                      <View style={styles.plateTopRow}>
                        <Text
                          style={[
                            styles.plateCommon,
                            { color: palette.textPrimary },
                          ]}
                          numberOfLines={1}>
                          {plate.commonName}
                        </Text>
                        <View
                          style={[
                            styles.familyBadge,
                            {
                              backgroundColor: palette.bgSurface,
                              borderColor: palette.borderSubtle,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.familyBadgeText,
                              { color: palette.primaryMuted },
                            ]}
                            numberOfLines={1}>
                            {plate.family}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.plateScientific,
                          { color: palette.textSecondary },
                        ]}
                        numberOfLines={1}>
                        {plate.scientificName}
                      </Text>
                      <Text
                        style={[styles.plateMeta, { color: palette.textMuted }]}>
                        {t('conservatory.herbarium.specimenCount', {
                          count: plate.specimenCount,
                        })}{' '}
                        ·{' '}
                        {t('conservatory.herbarium.ageDays', {
                          count: plate.ageDays,
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.eyebrow,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...CardShadow,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rankCopy: {
    flex: 1,
    gap: 2,
  },
  rankEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  rankTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  rankSubtitle: {
    ...Typography.caption,
    lineHeight: 17,
  },
  progressBlock: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  progressMeta: {
    fontSize: 11,
    fontWeight: '600',
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
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: BorderWidth.hairline,
    height: 24,
  },
  segmentBar: {
    flexDirection: 'row',
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: 3,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm + 2,
    borderWidth: BorderWidth.hairline,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sealsPanel: {
    gap: Spacing.sm,
  },
  sealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sealTile: {
    width: '48.5%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
    gap: 6,
  },
  sealTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  sealEarnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sealEarnedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sealMiniProgress: {
    width: '100%',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
  },
  sealMiniTrack: {
    width: '100%',
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  sealMiniFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  sealCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sealDetailBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
    gap: 4,
  },
  sealDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sealDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sealDetailProgress: {
    fontSize: 12,
    fontWeight: '700',
  },
  sealDetailDesc: {
    ...Typography.caption,
    lineHeight: 18,
  },
  sealHint: {
    fontSize: 11,
    textAlign: 'center',
  },
  herbariumPanel: {
    gap: Spacing.md,
  },
  typesBlock: {
    gap: Spacing.xs + 2,
  },
  typesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  typesLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  typesCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  platesList: {
    gap: Spacing.sm,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  plateThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm + 2,
  },
  plateInfo: {
    flex: 1,
    gap: 2,
  },
  plateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  plateCommon: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  familyBadge: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  familyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  plateScientific: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  plateMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyHerbarium: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
