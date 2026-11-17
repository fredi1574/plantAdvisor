import type {
  LightExposure,
  NotebookEntry,
  PlantType,
  PotMaterial,
} from '@/types/plant';

export type SoilMoistureLevel = NonNullable<
  NonNullable<NotebookEntry['metrics']>['soilMoisture']
>;

export const PLANT_TYPE_OPTIONS: { key: PlantType; label: string }[] = [
  { key: 'succulent', label: 'Succulent' },
  { key: 'propagation', label: 'Propagation' },
  { key: 'foliage', label: 'Foliage' },
  { key: 'flowering', label: 'Flowering' },
];

export const POT_MATERIAL_OPTIONS: { key: PotMaterial; label: string }[] = [
  { key: 'terracotta', label: 'Terracotta' },
  { key: 'ceramic_glazed', label: 'Glazed Ceramic' },
  { key: 'plastic_nursery', label: 'Nursery Pot' },
  { key: 'glass_vessel', label: 'Glass Jar' },
  { key: 'fabric_grow_bag', label: 'Grow Bag' },
];

export const LIGHT_EXPOSURE_OPTIONS: { key: LightExposure; label: string }[] = [
  { key: 'bright_direct', label: 'Bright Direct' },
  { key: 'bright_indirect', label: 'Bright Indirect' },
  { key: 'medium_filtered', label: 'Medium Filtered' },
  { key: 'low_shade', label: 'Low Shade' },
  { key: 'grow_light', label: 'Grow Light' },
];

export const SOIL_MOISTURE_OPTIONS: {
  key: SoilMoistureLevel;
  label: string;
}[] = [
  { key: 'bone_dry', label: 'Bone Dry' },
  { key: 'slightly_damp', label: 'Slightly Damp' },
  { key: 'moist', label: 'Moist' },
  { key: 'waterlogged', label: 'Waterlogged' },
];
