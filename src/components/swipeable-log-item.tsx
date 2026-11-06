import { Pencil, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
const FULL_SWIPE_RIGHT_THRESHOLD = 140;
const FULL_SWIPE_LEFT_THRESHOLD = -140;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 220,
  mass: 0.8,
};

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
    startX: 0,
    startY: 0,
    startOffset: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    isSwiping: false,
    currentOffset: 0,
  });

  const snapTo = (toValue: number) => {
    gestureRef.current.currentOffset = toValue;
    setIsOpen(toValue !== 0);
    translateX.value = withSpring(toValue, SPRING_CONFIG);
  };

  const closeSwipe = (afterClose?: () => void) => {
    snapTo(0);
    if (afterClose) {
      setTimeout(afterClose, 140);
    }
  };

  const handleStartShouldSetResponderCapture = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    gestureRef.current.startX = pageX;
    gestureRef.current.startY = pageY;
    gestureRef.current.lastX = pageX;
    gestureRef.current.lastTime = Date.now();
    gestureRef.current.velocityX = 0;
    return false;
  };

  const handleMoveShouldSetResponder = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    const dx = pageX - gestureRef.current.startX;
    const dy = pageY - gestureRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    return absDx > 10 && absDx > absDy * 1.25;
  };

  const handleResponderGrant = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    gestureRef.current.startX = pageX;
    gestureRef.current.startY = pageY;
    gestureRef.current.lastX = pageX;
    gestureRef.current.lastTime = Date.now();
    gestureRef.current.startOffset = gestureRef.current.currentOffset;
    gestureRef.current.isSwiping = true;
  };

  const handleResponderMove = (e: GestureResponderEvent) => {
    const { pageX } = e.nativeEvent;
    const now = Date.now();
    const dt = Math.max(1, now - gestureRef.current.lastTime);
    gestureRef.current.velocityX = (pageX - gestureRef.current.lastX) / dt;
    gestureRef.current.lastX = pageX;
    gestureRef.current.lastTime = now;

    const dx = pageX - gestureRef.current.startX;
    const rawX = gestureRef.current.startOffset + dx;
    const clampedX = Math.max(-175, Math.min(175, rawX));
    translateX.value = clampedX;
  };

  const handleResponderRelease = (e: GestureResponderEvent) => {
    const { pageX } = e.nativeEvent;
    const dx = pageX - gestureRef.current.startX;
    const finalX = gestureRef.current.startOffset + dx;
    const vx = gestureRef.current.velocityX;

    setTimeout(() => {
      gestureRef.current.isSwiping = false;
    }, 60);

    // Full swipe right -> trigger Edit immediately
    if (finalX > FULL_SWIPE_RIGHT_THRESHOLD || (finalX > 75 && vx > 0.75)) {
      snapTo(0);
      setTimeout(() => onEdit(entry), 120);
      return;
    }

    // Full swipe left -> trigger Delete confirmation immediately
    if (finalX < FULL_SWIPE_LEFT_THRESHOLD || (finalX < -75 && vx < -0.75)) {
      snapTo(0);
      setTimeout(() => onDelete(entry), 120);
      return;
    }

    // Snap open right (revealing Edit on left side)
    if (finalX > 42 || (finalX > 20 && vx > 0.35)) {
      snapTo(RIGHT_OPEN_WIDTH);
      return;
    }

    // Snap open left (revealing Delete on right side)
    if (finalX < -42 || (finalX < -20 && vx < -0.35)) {
      snapTo(LEFT_OPEN_WIDTH);
      return;
    }

    snapTo(0);
  };

  const handleResponderTerminate = () => {
    gestureRef.current.isSwiping = false;
    snapTo(0);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, 16, RIGHT_OPEN_WIDTH],
      [0, 0.7, 1],
      Extrapolation.CLAMP
    ),
  }));

  const rightActionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [LEFT_OPEN_WIDTH, -16, 0],
      [1, 0.7, 0],
      Extrapolation.CLAMP
    ),
  }));

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
              <Pencil size={15} color={Palette.textInverse} />
              <Text style={styles.actionBtnLabel}>Edit</Text>
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
              <Trash2 size={15} color={Palette.textInverse} />
              <Text style={styles.actionBtnLabel}>Delete</Text>
            </Pressable>
          </Animated.View>
        </View>

        <Animated.View
          style={[styles.animatedBoxWrap, cardAnimatedStyle]}
          onStartShouldSetResponderCapture={handleStartShouldSetResponderCapture}
          onMoveShouldSetResponder={handleMoveShouldSetResponder}
          onMoveShouldSetResponderCapture={handleMoveShouldSetResponder}
          onResponderGrant={handleResponderGrant}
          onResponderMove={handleResponderMove}
          onResponderRelease={handleResponderRelease}
          onResponderTerminate={handleResponderTerminate}
          onResponderTerminationRequest={() => false}>
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
    gap: 4,
    paddingHorizontal: 6,
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

