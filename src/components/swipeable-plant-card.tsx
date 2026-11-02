import { Image } from 'expo-image';
import {
  CheckCircle2,
  ChevronRight,
  Droplets,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
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

import {
  CardShadow,
  HealthBadgeTheme,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { getDaysUntilNextWater } from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

const PLANT_TYPE_LABELS: Record<UserPlant['species']['plantType'], string> = {
  succulent: 'Succulent',
  propagation: 'Propagation',
  foliage: 'Foliage',
  flowering: 'Flowering',
};

const RIGHT_OPEN_WIDTH = 96; // Swiping right reveals Edit on left
const LEFT_OPEN_WIDTH = -96; // Swiping left reveals Delete on right
const FULL_SWIPE_RIGHT_THRESHOLD = 155;
const FULL_SWIPE_LEFT_THRESHOLD = -155;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 220,
  mass: 0.8,
};

interface SwipeablePlantCardProps {
  plant: UserPlant;
  onPress: () => void;
  onWaterNow: () => void;
  onEdit: (plant: UserPlant) => void;
  onDelete: (plant: UserPlant) => void;
}

export function SwipeablePlantCard({
  plant,
  onPress,
  onWaterNow,
  onEdit,
  onDelete,
}: SwipeablePlantCardProps) {
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
    const clampedX = Math.max(-190, Math.min(190, rawX));
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
    if (finalX > FULL_SWIPE_RIGHT_THRESHOLD || (finalX > 85 && vx > 0.75)) {
      snapTo(0);
      setTimeout(() => onEdit(plant), 120);
      return;
    }

    // Full swipe left -> trigger Delete confirmation immediately
    if (finalX < FULL_SWIPE_LEFT_THRESHOLD || (finalX < -85 && vx < -0.75)) {
      snapTo(0);
      setTimeout(() => onDelete(plant), 120);
      return;
    }

    // Snap open right (revealing Edit on left side)
    if (finalX > 48 || (finalX > 24 && vx > 0.35)) {
      snapTo(RIGHT_OPEN_WIDTH);
      return;
    }

    // Snap open left (revealing Delete on right side)
    if (finalX < -48 || (finalX < -24 && vx < -0.35)) {
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
      [0, 20, RIGHT_OPEN_WIDTH],
      [0, 0.7, 1],
      Extrapolation.CLAMP
    ),
  }));

  const rightActionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [LEFT_OPEN_WIDTH, -20, 0],
      [1, 0.7, 0],
      Extrapolation.CLAMP
    ),
  }));

  const healthStatus =
    plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const badge = HealthBadgeTheme[healthStatus];
  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;

  const handleCardPress = () => {
    if (gestureRef.current.isSwiping) return;
    if (gestureRef.current.currentOffset !== 0) {
      closeSwipe();
      return;
    }
    onPress();
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Background Underlay Actions */}
      <View
        style={styles.actionsBackdrop}
        pointerEvents={isOpen ? 'auto' : 'none'}>
        {/* Left Side Action (Revealed when swiping right) */}
        <Animated.View style={[styles.leftActionSlot, leftActionAnimatedStyle]}>
          <Pressable
            onPress={() => closeSwipe(() => onEdit(plant))}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.editActionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${plant.nickname}`}>
            <Pencil size={18} color={Palette.textInverse} />
            <Text style={styles.actionBtnLabel}>Edit</Text>
          </Pressable>
        </Animated.View>

        {/* Right Side Action (Revealed when swiping left) */}
        <Animated.View
          style={[styles.rightActionSlot, rightActionAnimatedStyle]}>
          <Pressable
            onPress={() => closeSwipe(() => onDelete(plant))}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteActionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${plant.nickname}`}>
            <Trash2 size={18} color={Palette.textInverse} />
            <Text style={styles.actionBtnLabel}>Delete</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Foreground Animated Plant Card */}
      <Animated.View
        style={[styles.animatedCardWrap, cardAnimatedStyle]}
        onStartShouldSetResponderCapture={handleStartShouldSetResponderCapture}
        onMoveShouldSetResponder={handleMoveShouldSetResponder}
        onMoveShouldSetResponderCapture={handleMoveShouldSetResponder}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderRelease={handleResponderRelease}
        onResponderTerminate={handleResponderTerminate}
        onResponderTerminationRequest={() => false}>
        <Pressable
          onPress={handleCardPress}
          style={({ pressed }) => [
            styles.plantCard,
            pressed && !isOpen && styles.plantCardPressed,
          ]}>
          {/* Top Row: Thumbnail + Title + Health Status Badge */}
          <View style={styles.cardTopRow}>
            <Image
              source={{ uri: plant.photoUri }}
              style={styles.thumbnail}
              contentFit="cover"
            />

            <View style={styles.cardHeaderMeta}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.plantNickname} numberOfLines={1}>
                  {plant.nickname}
                </Text>

                <View
                  style={[
                    styles.healthBadge,
                    {
                      backgroundColor: badge.bg,
                      borderColor: badge.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: badge.dot },
                    ]}
                  />
                  <Text
                    style={[
                      styles.healthBadgeText,
                      { color: badge.text },
                    ]}>
                    {badge.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.speciesLine} numberOfLines={1}>
                {plant.species.commonName} •{' '}
                <Text style={styles.scientificItalic}>
                  {plant.species.scientificName}
                </Text>
              </Text>

              <View style={styles.metaChipsRow}>
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>
                    {PLANT_TYPE_LABELS[plant.species.plantType]}
                  </Text>
                </View>

                <View style={styles.locationChip}>
                  <MapPin size={12} color={Palette.textSecondary} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {plant.location}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Latest AI Health Summary Snippet */}
          {plant.latestHealthAssessment && (
            <View style={styles.diagnosisSnippetBox}>
              <Text style={styles.diagnosisSnippetText} numberOfLines={2}>
                <Text style={styles.diagnosisSnippetPrefix}>AI Note: </Text>
                {plant.latestHealthAssessment.diagnosisSummary}
              </Text>
            </View>
          )}

          {/* Footer Strip: Watering Indicator + Quick Water Action */}
          <View style={styles.cardFooter}>
            {needsWater ? (
              <View style={styles.needsWaterBadge}>
                <Droplets size={14} color={Palette.waterAlertText} />
                <Text style={styles.needsWaterBadgeText}>
                  {daysUntilWater === 0
                    ? 'Needs Watering Today'
                    : `Needs Watering (${Math.abs(daysUntilWater)}d overdue)`}
                </Text>
              </View>
            ) : (
              <View style={styles.waterScheduleInfo}>
                <CheckCircle2 size={14} color={Palette.primaryMuted} />
                <Text style={styles.waterScheduleText}>
                  Next water in {daysUntilWater}d (every{' '}
                  {plant.customWateringIntervalDays}d)
                </Text>
              </View>
            )}

            <View style={styles.cardFooterRight}>
              {needsWater && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onWaterNow();
                  }}
                  style={({ pressed }) => [
                    styles.quickWaterBtn,
                    pressed && { opacity: 0.8 },
                  ]}>
                  <Droplets size={13} color={Palette.textInverse} />
                  <Text style={styles.quickWaterBtnText}>
                    {plant.species.plantType === 'propagation'
                      ? 'Refresh Water'
                      : 'Log Water'}
                  </Text>
                </Pressable>
              )}

              <View style={styles.openNotebookLink}>
                <Text style={styles.openNotebookText}>Notebook</Text>
                <ChevronRight size={15} color={Palette.primary} />
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  actionsBackdrop: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.lg,
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
    gap: 6,
    paddingHorizontal: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
    letterSpacing: 0.3,
  },
  animatedCardWrap: {
    width: '100%',
  },
  plantCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  plantCardPressed: {
    backgroundColor: '#FAF8F4',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumbnail: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: Palette.bgSubtle,
  },
  cardHeaderMeta: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  plantNickname: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  speciesLine: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  scientificItalic: {
    fontStyle: 'italic',
  },
  metaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  typeChip: {
    backgroundColor: Palette.bgSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  diagnosisSnippetBox: {
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  diagnosisSnippetPrefix: {
    fontWeight: '700',
    color: Palette.primary,
  },
  diagnosisSnippetText: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Palette.bgSubtle,
  },
  needsWaterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.waterAlertBg,
    borderColor: Palette.waterAlertBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  needsWaterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.waterAlertText,
  },
  waterScheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterScheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.waterBlue,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  quickWaterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  openNotebookLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openNotebookText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
});
