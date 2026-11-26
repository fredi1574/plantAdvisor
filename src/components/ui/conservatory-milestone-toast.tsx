import { router } from 'expo-router';
import { Award, ChevronRight } from 'lucide-react-native';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  BorderWidth,
  FloatingShadow,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  computeConservatorySnapshot,
  detectNewConservatoryMilestones,
  type ConservatoryMilestoneEvent,
  type ConservatorySnapshot,
} from '@/services/conservatoryService';
import { triggerSuccessHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';

const TOAST_DURATION_MS = 4500;

/**
 * Calm, session-scoped celebration banner mounted at root layout.
 * Observes derived Conservatory state and gently celebrates newly earned
 * Botanical Seals or Rank promotions without persisting extra state or
 * firing phantom toasts on app startup / cloud sync.
 */
export function ConservatoryMilestoneToast() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useContext(SafeAreaInsetsContext);
  const reducedMotion = useReducedMotion();

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);
  const isSyncing = usePlantStore((s) => s.isSyncing);

  const snapshot = useMemo(
    () => computeConservatorySnapshot(plants, entries, healthAssessments),
    [plants, entries, healthAssessments]
  );

  const prevSnapshotRef = useRef<ConservatorySnapshot | null>(null);
  const wasSyncingRef = useRef<boolean>(isSyncing);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeEvent, setActiveEvent] =
    useState<ConservatoryMilestoneEvent | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Establish initial baseline silently on mount
    if (!prevSnapshotRef.current) {
      prevSnapshotRef.current = snapshot;
      wasSyncingRef.current = isSyncing;
      return;
    }

    // Re-baseline quietly during or right after cloud sync so remote merges
    // don't burst historical achievement toasts.
    if (isSyncing || wasSyncingRef.current) {
      prevSnapshotRef.current = snapshot;
      wasSyncingRef.current = isSyncing;
      return;
    }

    const newEvents = detectNewConservatoryMilestones(
      prevSnapshotRef.current,
      snapshot
    );
    prevSnapshotRef.current = snapshot;
    wasSyncingRef.current = isSyncing;

    // Ignore bulk garden replacement bursts (>3 milestones at once) such as
    // restoring sample seed data.
    if (newEvents.length === 0 || newEvents.length > 3) {
      return;
    }

    // Prioritize rank promotion if both rank and seal unlock together;
    // otherwise celebrate the first newly earned seal.
    const featured =
      newEvents.find((e) => e.kind === 'rank') ?? newEvents[0];

    setActiveEvent(featured);
    triggerSuccessHaptic();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setActiveEvent(null);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, [snapshot, isSyncing]);

  if (!activeEvent) {
    return null;
  }

  const label =
    activeEvent.kind === 'rank'
      ? t('conservatory.toasts.rankPromoted', {
          title: t(`conservatory.ranks.${activeEvent.id}.title`),
        })
      : t('conservatory.toasts.sealEarned', {
          title: t(`conservatory.seals.${activeEvent.id}.title`),
        });

  const topOffset = (insets?.top ?? 0) + Spacing.sm;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: topOffset }]}>
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(240)}
        exiting={reducedMotion ? undefined : FadeOutDown.duration(180)}
        style={styles.inner}>
        <Pressable
          onPress={() => {
            setActiveEvent(null);
            router.push('/(tabs)/profile');
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            styles.banner,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.primaryBorder,
            },
            pressed && { opacity: 0.9 },
          ]}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: palette.primarySoft },
            ]}>
            <Award size={16} color={palette.primary} />
          </View>
          <Text
            style={[styles.message, { color: palette.textPrimary }]}
            numberOfLines={2}>
            {label}
          </Text>
          <View style={styles.viewPill}>
            <Text style={[styles.viewText, { color: palette.primary }]}>
              {t('conservatory.toasts.viewAction')}
            </Text>
            <ChevronRight size={13} color={palette.primary} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9998,
    elevation: 9998,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    ...FloatingShadow,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: Typography.body.fontSize - 1,
    fontWeight: '700',
    lineHeight: 18,
  },
  viewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
