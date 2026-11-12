import {
  Droplet,
  FlaskConical,
  Flower2,
  Leaf,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Sun,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CardShadow, Palette, Radius, Spacing } from '@/constants/theme';

export type FilterMode =
  | 'all'
  | 'needs_water'
  | 'needs_attention'
  | 'succulent'
  | 'propagation'
  | 'foliage'
  | 'flowering';

export interface GardenStats {
  total: number;
  needsWaterCount: number;
  needsAttentionCount: number;
  succulentCount: number;
  propagationCount: number;
  foliageCount: number;
  floweringCount: number;
}

interface GardenKpiRowProps {
  stats: GardenStats;
  filter: FilterMode;
  onSelectFilter: (filter: FilterMode) => void;
}

export function GardenKpiRow({
  stats,
  filter,
  onSelectFilter,
}: GardenKpiRowProps) {
  const toggleFilter = (target: Exclude<FilterMode, 'all'>) => {
    onSelectFilter(filter === target ? 'all' : target);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.kpiRow}>
      {/* Card 1: Active Specimens / All Plants */}
      <Pressable
        onPress={() => onSelectFilter('all')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardLeaf,
          filter === 'all' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Active specimens: ${stats.total}. Tap to show all plants.`}>
        <View style={styles.kpiHeaderRow}>
          <View style={[styles.kpiIconPill, styles.kpiIconPillLeaf]}>
            <Leaf size={14} color={Palette.primary} />
          </View>
          <Text style={[styles.kpiTag, styles.kpiTagLeaf]}>Garden</Text>
        </View>
        <Text style={[styles.kpiValue, styles.kpiValueLeaf]}>
          {stats.total}
        </Text>
        <Text style={styles.kpiLabel}>All{'\n'}Plants</Text>
      </Pressable>

      {/* Card 2: Needs Watering */}
      <Pressable
        onPress={() => toggleFilter('needs_water')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardDrop,
          stats.needsWaterCount > 0 ? styles.kpiDropAlert : styles.kpiDropCalm,
          filter === 'needs_water' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Needs watering: ${stats.needsWaterCount}. Tap to filter.`}>
        <View style={styles.kpiHeaderRow}>
          <View
            style={[
              styles.kpiIconPill,
              stats.needsWaterCount > 0
                ? styles.kpiIconPillDropAlert
                : styles.kpiIconPillDropCalm,
            ]}>
            <Droplet
              size={14}
              color={stats.needsWaterCount > 0 ? '#0284C7' : '#0EA5E9'}
              fill={stats.needsWaterCount > 0 ? '#38BDF8' : '#BAE6FD'}
            />
          </View>
          <Text
            style={[
              styles.kpiTag,
              stats.needsWaterCount > 0
                ? styles.kpiTagDropAlert
                : styles.kpiTagDropCalm,
            ]}>
            {stats.needsWaterCount > 0 ? 'Thirsty' : 'Good'}
          </Text>
        </View>
        <Text
          style={[
            styles.kpiValue,
            stats.needsWaterCount > 0
              ? styles.kpiValueDropAlert
              : styles.kpiValueDropCalm,
          ]}>
          {stats.needsWaterCount}
        </Text>
        <Text style={styles.kpiLabel}>Needs{'\n'}Watering</Text>
      </Pressable>

      {/* Card 3: Health Alerts */}
      <Pressable
        onPress={() => toggleFilter('needs_attention')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardShield,
          stats.needsAttentionCount > 0
            ? styles.kpiShieldAlert
            : styles.kpiShieldCalm,
          filter === 'needs_attention' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Health alerts: ${stats.needsAttentionCount}. Tap to filter.`}>
        <View style={styles.kpiHeaderRow}>
          <View
            style={[
              styles.kpiIconPill,
              stats.needsAttentionCount > 0
                ? styles.kpiIconPillShieldAlert
                : styles.kpiIconPillShieldCalm,
            ]}>
            {stats.needsAttentionCount > 0 ? (
              <ShieldAlert size={14} color="#B45309" fill="#FDE68A" />
            ) : (
              <ShieldCheck size={14} color="#16A34A" fill="#BBF7D0" />
            )}
          </View>
          <Text
            style={[
              styles.kpiTag,
              stats.needsAttentionCount > 0
                ? styles.kpiTagShieldAlert
                : styles.kpiTagShieldCalm,
            ]}>
            {stats.needsAttentionCount > 0 ? 'Alerts' : 'Thriving'}
          </Text>
        </View>
        <Text
          style={[
            styles.kpiValue,
            stats.needsAttentionCount > 0
              ? styles.kpiValueShieldAlert
              : styles.kpiValueShieldCalm,
          ]}>
          {stats.needsAttentionCount}
        </Text>
        <Text style={styles.kpiLabel}>Health{'\n'}Alerts</Text>
      </Pressable>

      {/* Card 4: Succulents */}
      <Pressable
        onPress={() => toggleFilter('succulent')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardSucculent,
          filter === 'succulent' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Succulents: ${stats.succulentCount}. Tap to filter.`}>
        <View style={styles.kpiHeaderRow}>
          <View style={[styles.kpiIconPill, styles.kpiIconPillSucculent]}>
            <Sun size={14} color="#C86D51" />
          </View>
          <Text style={[styles.kpiTag, styles.kpiTagSucculent]}>Desert</Text>
        </View>
        <Text style={[styles.kpiValue, styles.kpiValueSucculent]}>
          {stats.succulentCount}
        </Text>
        <Text style={styles.kpiLabel}>Succulent{'\n'}Plants</Text>
      </Pressable>

      {/* Card 5: Propagations */}
      <Pressable
        onPress={() => toggleFilter('propagation')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardProp,
          filter === 'propagation' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Propagations: ${stats.propagationCount}. Tap to filter.`}>
        <View style={styles.kpiHeaderRow}>
          <View style={[styles.kpiIconPill, styles.kpiIconPillProp]}>
            <FlaskConical size={14} color="#0F766E" />
          </View>
          <Text style={[styles.kpiTag, styles.kpiTagProp]}>Rooting</Text>
        </View>
        <Text style={[styles.kpiValue, styles.kpiValueProp]}>
          {stats.propagationCount}
        </Text>
        <Text style={styles.kpiLabel}>Active{'\n'}Propagations</Text>
      </Pressable>

      {/* Card 6: Foliage */}
      <Pressable
        onPress={() => toggleFilter('foliage')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardFoliage,
          filter === 'foliage' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Foliage plants: ${stats.foliageCount}. Tap to filter.`}>
        <View style={styles.kpiHeaderRow}>
          <View style={[styles.kpiIconPill, styles.kpiIconPillFoliage]}>
            <Sprout size={14} color="#15803D" />
          </View>
          <Text style={[styles.kpiTag, styles.kpiTagFoliage]}>Canopy</Text>
        </View>
        <Text style={[styles.kpiValue, styles.kpiValueFoliage]}>
          {stats.foliageCount}
        </Text>
        <Text style={styles.kpiLabel}>Foliage{'\n'}Specimens</Text>
      </Pressable>

      {/* Card 7: Flowering */}
      <Pressable
        onPress={() => toggleFilter('flowering')}
        style={({ pressed }) => [
          styles.kpiCardBase,
          styles.kpiCardFlowering,
          filter === 'flowering' && styles.kpiCardActiveRing,
          pressed && styles.kpiCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Flowering plants: ${stats.floweringCount}. Tap to filter.`}>
        <View style={styles.kpiHeaderRow}>
          <View style={[styles.kpiIconPill, styles.kpiIconPillFlowering]}>
            <Flower2 size={14} color="#BE185D" />
          </View>
          <Text style={[styles.kpiTag, styles.kpiTagFlowering]}>Bloom</Text>
        </View>
        <Text style={[styles.kpiValue, styles.kpiValueFlowering]}>
          {stats.floweringCount}
        </Text>
        <Text style={styles.kpiLabel}>Flowering{'\n'}Specimens</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
    paddingRight: Spacing.sm,
  },
  kpiCardBase: {
    width: 112,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    minHeight: 114,
    justifyContent: 'space-between',
    ...CardShadow,
  },
  kpiCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  kpiCardActiveRing: {
    borderWidth: 2.5,
    borderColor: Palette.primary,
  },
  kpiCardLeaf: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 8,
    backgroundColor: '#EDF5EF',
    borderColor: '#C3DEC8',
  },
  kpiCardDrop: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  kpiDropAlert: {
    backgroundColor: '#E0F2FE',
    borderColor: '#38BDF8',
  },
  kpiDropCalm: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  kpiCardShield: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 8,
  },
  kpiShieldAlert: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  kpiShieldCalm: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  kpiCardSucculent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 26,
    backgroundColor: '#F9EBE6',
    borderColor: '#E8B8A8',
  },
  kpiCardProp: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  kpiCardFoliage: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 28,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  kpiCardFlowering: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 24,
    backgroundColor: '#FCE7F3',
    borderColor: '#F9A8D4',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiIconPill: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconPillLeaf: {
    backgroundColor: '#D8EBDE',
  },
  kpiIconPillDropAlert: {
    backgroundColor: '#BAE6FD',
  },
  kpiIconPillDropCalm: {
    backgroundColor: '#E0F2FE',
  },
  kpiIconPillShieldAlert: {
    backgroundColor: '#FDE68A',
  },
  kpiIconPillShieldCalm: {
    backgroundColor: '#DCFCE7',
  },
  kpiIconPillSucculent: {
    backgroundColor: '#F2D5CA',
  },
  kpiIconPillProp: {
    backgroundColor: '#99F6E4',
  },
  kpiIconPillFoliage: {
    backgroundColor: '#BBF7D0',
  },
  kpiIconPillFlowering: {
    backgroundColor: '#FBCFE8',
  },
  kpiTag: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  kpiTagLeaf: {
    color: '#2D5A3C',
  },
  kpiTagDropAlert: {
    color: '#0369A1',
  },
  kpiTagDropCalm: {
    color: '#0284C7',
  },
  kpiTagShieldAlert: {
    color: '#B45309',
  },
  kpiTagShieldCalm: {
    color: '#15803D',
  },
  kpiTagSucculent: {
    color: '#9A3412',
  },
  kpiTagProp: {
    color: '#0F766E',
  },
  kpiTagFoliage: {
    color: '#15803D',
  },
  kpiTagFlowering: {
    color: '#9D174D',
  },
  kpiValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiValueLeaf: {
    color: '#1E3F2A',
  },
  kpiValueDropAlert: {
    color: '#0369A1',
  },
  kpiValueDropCalm: {
    color: '#0284C7',
  },
  kpiValueShieldAlert: {
    color: '#92400E',
  },
  kpiValueShieldCalm: {
    color: '#15803D',
  },
  kpiValueSucculent: {
    color: '#7C2D12',
  },
  kpiValueProp: {
    color: '#115E59',
  },
  kpiValueFoliage: {
    color: '#14532D',
  },
  kpiValueFlowering: {
    color: '#831843',
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 2,
  },
});
