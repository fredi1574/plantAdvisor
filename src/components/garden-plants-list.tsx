import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SwipeablePlantCard } from '@/components/swipeable-plant-card';
import { Spacing } from '@/constants/theme';
import type { UserPlant } from '@/types/plant';

interface GardenPlantsListProps {
  plants: UserPlant[];
  onPressPlant: (plantId: string) => void;
  onWaterNow: (plantId: string) => void;
  onEdit: (plant: UserPlant) => void;
  onDelete: (plant: UserPlant) => void;
}

export function GardenPlantsList({
  plants,
  onPressPlant,
  onWaterNow,
  onEdit,
  onDelete,
}: GardenPlantsListProps) {
  return (
    <View style={styles.listContainer}>
      {plants.map((plant) => (
        <SwipeablePlantCard
          key={plant.id}
          plant={plant}
          onPress={() => onPressPlant(plant.id)}
          onWaterNow={() => onWaterNow(plant.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: Spacing.md,
  },
});
