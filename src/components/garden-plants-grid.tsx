import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlantGridCard } from '@/components/plant-grid-card';
import { Spacing } from '@/constants/theme';
import type { UserPlant } from '@/types/plant';

interface GardenPlantsGridProps {
  plants: UserPlant[];
  onPressPlant: (plantId: string) => void;
  onWaterNow: (plantId: string) => void;
  onEdit: (plant: UserPlant) => void;
}

export function GardenPlantsGrid({
  plants,
  onPressPlant,
  onWaterNow,
  onEdit,
}: GardenPlantsGridProps) {
  const rows = useMemo(() => {
    const chunked: UserPlant[][] = [];
    for (let i = 0; i < plants.length; i += 2) {
      chunked.push(plants.slice(i, i + 2));
    }
    return chunked;
  }, [plants]);

  return (
    <View style={styles.gridContainer}>
      {rows.map((row, rowIndex) => (
        <View key={`grid-row-${rowIndex}`} style={styles.gridRow}>
          {row.map((plant) => (
            <PlantGridCard
              key={plant.id}
              plant={plant}
              onPress={() => onPressPlant(plant.id)}
              onWaterNow={() => onWaterNow(plant.id)}
              onLongPress={() => onEdit(plant)}
            />
          ))}
          {row.length === 1 && <View style={styles.gridSpacer} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'stretch',
  },
  gridSpacer: {
    flex: 1,
  },
});
