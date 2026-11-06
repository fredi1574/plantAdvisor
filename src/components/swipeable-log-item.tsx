import { Pencil, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GestureDetector,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Palette, Radius } from '@/constants/theme';
import type { NotebookEntry } from '@/types/plant';

const RIGHT_OPEN_WIDTH = 86; // Swiping right reveals Edit on left
const LEFT_OPEN_WIDTH = -86; // Swiping left reveals Delete on right
const MAX_ELASTIC_STRETCH = 136; // Extra elastic "give" past the open action width
const SNAP_OPEN_THRESHOLD = 28; // Forgiving threshold to snap open
const FULL_SWIPE_THRESHOLD = 166; // Deep elastic pull required to trigger action immediately

const SPRING_CONFIG = {
  damping: 17,
  stiffness: 155,
  mass: 0.85,
  overshootClamping: false,
};

function applyRubberBandGive(rawX: number): number {
  const absX = Math.abs(rawX);
  if (absX <= RIGHT_OPEN_WIDTH) {
    return rawX;
  }
  const sign = rawX < 0 ? -1 : 1;
  const extra = absX - RIGHT_OPEN_WIDTH;
  const dampedExtra =
    (extra * 0.72 * MAX_ELASTIC_STRETCH) /
    (MAX_ELASTIC_STRETCH + extra * 0.72);
  return sign * (RIGHT_OPEN_WIDTH + dampedExtra);
}

interface SwipeableLogItemProps {
  entry: NotebookEntry;
  isLast: boolean;
  onEdit: (entry: NotebookEntry) => void;
  onDelete: (entry: NotebookEntry) => void;
}

export function SwipeableLogItem({
  entry,
  isLast,
  onEdit,
  onDelete,
}: SwipeableLogItemProps) {
  const translateX = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false);

  const gestureRef = useRef({
    startOffset: 0,
    currentOffset: 0,
    lastTranslationX: 0,
    lastVelocityX: 0,
    isSwiping: false,
  });

  const snapTo = (toValue: number, velocityX = 0) => {
    gestureRef.current.currentOffset = toValue;
    setIsOpen(toValue !== 0);
    const clampedVelocity = Math.max(-900, Math.min(900, velocityX));
    translateX.value = withSpring(toValue, {
      ...SPRING_CONFIG,
      velocity: clampedVelocity,
    });
  };

  const closeSwipe = (afterClose?: () => void) => {
    snapTo(0);
    if (afterClose) {
      setTimeout(afterClose, 150);
    }
  };

  const settleSwipe = (translationX: number, velocityX: number) => {
    const startOffset = gestureRef.current.startOffset;
    const rawX = startOffset + translationX;
    const elasticX = applyRubberBandGive(rawX);

    setTimeout(() => {
      gestureRef.current.isSwiping = false;
    }, 80);

    // Deep full swipe right -> trigger Edit immediately
    if (
      elasticX > FULL_SWIPE_THRESHOLD ||
      (elasticX > RIGHT_OPEN_WIDTH + 40 && velocityX > 1350)
    ) {
      snapTo(0, velocityX * 0.35);
      setTimeout(() => onEdit(entry), 130);
      return;
    }

    // Deep full swipe left -> trigger Delete confirmation immediately
    if (
      elasticX < -FULL_SWIPE_THRESHOLD ||
      (elasticX < LEFT_OPEN_WIDTH - 40 && velocityX < -1350)
    ) {
      snapTo(0, velocityX * 0.35);
      setTimeout(() => onDelete(entry), 130);
      return;
    }

    // If starting from an already-open right state and user nudges back left, close smoothly
    if (startOffset > 0 && (rawX < RIGHT_OPEN_WIDTH - 18 || velocityX < -220)) {
      if (rawX < -SNAP_OPEN_THRESHOLD * 1.8 && velocityX < -500) {
        snapTo(LEFT_OPEN_WIDTH, velocityX);
      } else {
        snapTo(0, velocityX);
      }
      return;
    }

    // If starting from an already-open left state and user nudges back right, close smoothly
    if (startOffset < 0 && (rawX > LEFT_OPEN_WIDTH + 18 || velocityX > 220)) {
      if (rawX > SNAP_OPEN_THRESHOLD * 1.8 && velocityX > 500) {
        snapTo(RIGHT_OPEN_WIDTH, velocityX);
      } else {
        snapTo(0, velocityX);
      }
      return;
    }

    // Snap open right (revealing Edit on left side)
    if (
      elasticX > SNAP_OPEN_THRESHOLD ||
      (elasticX > 12 && velocityX > 250)
    ) {
      snapTo(RIGHT_OPEN_WIDTH, velocityX);
      return;
    }

    // Snap open left (revealing Delete on right side)
    if (
      elasticX < -SNAP_OPEN_THRESHOLD ||
      (elasticX < -12 && velocityX < -250)
    ) {
      snapTo(LEFT_OPEN_WIDTH, velocityX);
      return;
    }

    snapTo(0, velocityX);
  };

  const panGesture = usePanGesture({
    activeOffsetX: [-8, 8],
    failOffsetY: [-20, 20],
    runOnJS: true,
    onActivate: () => {
      gestureRef.current.startOffset = gestureRef.current.currentOffset;
      gestureRef.current.lastTranslationX = 0;
      gestureRef.current.lastVelocityX = 0;
      gestureRef.current.isSwiping = true;
    },
    onUpdate: (e) => {
      gestureRef.current.lastTranslationX = e.translationX;
      gestureRef.current.lastVelocityX = e.velocityX;
      const rawX = gestureRef.current.startOffset + e.translationX;
      translateX.value = applyRubberBandGive(rawX);
    },
    onDeactivate: (e) => {
      const tx = e.translationX ?? gestureRef.current.lastTranslationX;
      const vx = e.velocityX ?? gestureRef.current.lastVelocityX;
      settleSwipe(tx, vx);
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionAnimatedStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, translateX.value);
    return {
      width: Math.max(RIGHT_OPEN_WIDTH, pull + 12),
      opacity: interpolate(
        pull,
        [0, 10, RIGHT_OPEN_WIDTH * 0.65],
        [0, 0.75, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const rightActionAnimatedStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, -translateX.value);
    return {
      width: Math.max(Math.abs(LEFT_OPEN_WIDTH), pull + 12),
      opacity: interpolate(
        pull,
        [0, 10, Math.abs(LEFT_OPEN_WIDTH) * 0.65],
        [0, 0.75, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const leftActionContentStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, translateX.value);
    return {
      transform: [
        {
          scale: interpolate(
            pull,
            [0, RIGHT_OPEN_WIDTH, FULL_SWIPE_THRESHOLD],
            [0.86, 1, 1.15],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const rightActionContentStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, -translateX.value);
    return {
      transform: [
        {
          scale: interpolate(
            pull,
            [0, Math.abs(LEFT_OPEN_WIDTH), FULL_SWIPE_THRESHOLD],
            [0.86, 1, 1.15],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const nodeColor =
    entry.eventType === 'water'
      ? Palette.waterBlue
      : entry.eventType === 'propagation' || entry.eventType === 'repot'
        ? Palette.accentTerracotta
        : Palette.primary;

  const handleBoxPress = () => {
    if (gestureRef.current.isSwiping) return;
    if (gestureRef.current.currentOffset !== 0) {
      closeSwipe();
    }
  };

  return (
    <View style={styles.timelineRow}>
      {/* Left Rail & Node */}
      <View style={styles.timelineRailCol}>
        <View style={[styles.timelineNode, { backgroundColor: nodeColor }]} />
        {!isLast && <View style={styles.timelineVerticalLine} />}
      </View>

      {/* Swipeable Event Content Box */}
      <View style={styles.swipeWrapper}>
        <View
          style={styles.actionsBackdrop}
          pointerEvents={isOpen ? 'auto' : 'none'}>
          {/* Left Side Action (Revealed when swiping right) */}
          <Animated.View
            style={[styles.leftActionSlot, leftActionAnimatedStyle]}>
            <Pressable
              onPress={() => closeSwipe(() => onEdit(entry))}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.editActionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Edit log ${entry.title}`}>
              <Animated.View style={[styles.actionBtnContent, leftActionContentStyle]}>
                <Pencil size={15} color={Palette.textInverse} />
                <Text style={styles.actionBtnLabel}>Edit</Text>
              </Animated.View>
            </Pressable>
          </Animated.View>

          {/* Right Side Action (Revealed when swiping left) */}
          <Animated.View
            style={[styles.rightActionSlot, rightActionAnimatedStyle]}>
            <Pressable
              onPress={() => closeSwipe(() => onDelete(entry))}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.deleteActionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Delete log ${entry.title}`}>
              <Animated.View style={[styles.actionBtnContent, rightActionContentStyle]}>
                <Trash2 size={15} color={Palette.textInverse} />
                <Text style={styles.actionBtnLabel}>Delete</Text>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </View>

        <GestureDetector gesture={panGesture} touchAction="pan-y">
          <Animated.View style={[styles.animatedBoxWrap, cardAnimatedStyle]}>
            <Pressable
              onPress={handleBoxPress}
              style={({ pressed }) => [
                styles.timelineEventBox,
                pressed && !isOpen && styles.timelineEventBoxPressed,
              ]}>
              <View style={styles.timelineEventHeader}>
                <Text style={styles.timelineEventTitle}>{entry.title}</Text>
                <Text style={styles.timelineEventDate}>
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <Text style={styles.timelineEventNotes}>{entry.notes}</Text>

              {/* Optional Propagation / Moisture Metrics Pills */}
              {entry.metrics && (
                <View style={styles.metricsPillsRow}>
                  {entry.metrics.rootLengthCm !== undefined && (
                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        Root: {entry.metrics.rootLengthCm} cm
                      </Text>
                    </View>
                  )}
                  {entry.metrics.stemHeightCm !== undefined && (
                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        Stem: {entry.metrics.stemHeightCm} cm
                      </Text>
                    </View>
                  )}
                  {entry.metrics.leafCount !== undefined && (
                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        Leaves: {entry.metrics.leafCount}
                      </Text>
                    </View>
                  )}
                  {entry.metrics.waterAmountMl !== undefined && (
                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        Volume: {entry.metrics.waterAmountMl} ml
                      </Text>
                    </View>
                  )}
                  {entry.metrics.soilMoisture !== undefined && (
                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        Soil prior:{' '}
                        {entry.metrics.soilMoisture.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRailCol: {
    alignItems: 'center',
    width: 18,
  },
  timelineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  timelineVerticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: Palette.borderSubtle,
    marginVertical: 4,
  },
  swipeWrapper: {
    flex: 1,
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionsBackdrop: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.md,
  },
  leftActionSlot: {
    width: RIGHT_OPEN_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rightActionSlot: {
    width: Math.abs(LEFT_OPEN_WIDTH),
    flexDirection: 'row',
    alignItems: 'stretch',
    marginLeft: 'auto',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  editActionBtn: {
    backgroundColor: Palette.primary,
  },
  deleteActionBtn: {
    backgroundColor: '#DC2626',
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textInverse,
    letterSpacing: 0.3,
  },
  animatedBoxWrap: {
    width: '100%',
  },
  timelineEventBox: {
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    padding: 12,
    gap: 5,
  },
  timelineEventBoxPressed: {
    backgroundColor: '#FAF8F4',
  },
  timelineEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timelineEventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  timelineEventDate: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textMuted,
  },
  timelineEventNotes: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textSecondary,
  },
  metricsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metricPill: {
    backgroundColor: Palette.bgSurface,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  metricPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
});

