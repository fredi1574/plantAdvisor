import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  computePropagationReadiness,
  getLatestRootLengthCm,
  PropagationReadinessBar,
} from '@/components/garden/propagation-readiness-bar';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { usePlantStore } from '@/store/usePlantStore';
import type { NotebookEntry } from '@/types/plant';

describe('Watering Undo (careLogSlice & FeedbackBanner)', () => {
  beforeEach(() => {
    usePlantStore.getState().resetToSeedData();
  });

  it('reverses quick-water by restoring lastWateredAt and removing the created care entry', () => {
    const initialPlant = usePlantStore.getState().plants[0];
    const previousLastWateredAt = initialPlant.lastWateredAt;
    const initialEntryCount = usePlantStore.getState().entries.length;

    const snapshot = usePlantStore.getState().waterPlantNow(initialPlant.id);
    expect(snapshot).not.toBeNull();
    expect(usePlantStore.getState().entries.length).toBe(initialEntryCount + 1);
    expect(usePlantStore.getState().plants[0].lastWateredAt).not.toBe(
      previousLastWateredAt
    );

    const restored = usePlantStore.getState().undoWatering(snapshot);
    expect(restored).toBe(1);
    expect(usePlantStore.getState().entries.length).toBe(initialEntryCount);
    expect(usePlantStore.getState().plants[0].lastWateredAt).toBe(
      previousLastWateredAt
    );
  });

  it('reverses batch waterAllNeedingWater via lastWateringUndo', () => {
    const beforeTimestamps = new Map(
      usePlantStore.getState().plants.map((p) => [p.id, p.lastWateredAt])
    );
    const initialEntryCount = usePlantStore.getState().entries.length;

    const count = usePlantStore.getState().waterAllNeedingWater();
    expect(count).toBeGreaterThan(0);
    expect(usePlantStore.getState().entries.length).toBe(
      initialEntryCount + count
    );

    const restored = usePlantStore.getState().undoWatering();
    expect(restored).toBe(count);
    expect(usePlantStore.getState().entries.length).toBe(initialEntryCount);
    for (const plant of usePlantStore.getState().plants) {
      expect(plant.lastWateredAt).toBe(beforeTimestamps.get(plant.id));
    }
  });

  it('renders FeedbackBanner Undo action and invokes onPress + onDismiss', async () => {
    const onUndo = jest.fn();
    const onDismiss = jest.fn();

    await render(
      <FeedbackBanner
        floating
        message='Watered "Sunny Jade"!'
        action={{ label: 'Undo', onPress: onUndo }}
        onDismiss={onDismiss}
      />
    );

    const undoBtn = screen.getByLabelText('Undo');
    await fireEvent.press(undoBtn);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('Room Presets (preferencesSlice)', () => {
  it('adds, updates existing by name, and deletes room presets', () => {
    const initialLength = usePlantStore.getState().roomPresets.length;

    const created = usePlantStore.getState().addRoomPreset({
      name: 'West Sunroom Bench',
      lightExposure: 'bright_indirect',
      isIndoor: true,
    });
    expect(usePlantStore.getState().roomPresets.length).toBe(initialLength + 1);

    const updated = usePlantStore.getState().addRoomPreset({
      name: 'west sunroom bench',
      lightExposure: 'bright_direct',
      isIndoor: false,
    });
    expect(updated.id).toBe(created.id);
    expect(updated.lightExposure).toBe('bright_direct');
    expect(updated.isIndoor).toBe(false);
    expect(usePlantStore.getState().roomPresets.length).toBe(initialLength + 1);

    usePlantStore.getState().deleteRoomPreset(created.id);
    expect(usePlantStore.getState().roomPresets.length).toBe(initialLength);
  });
});

describe('Propagation Bench View (PropagationReadinessBar)', () => {
  const entries: NotebookEntry[] = [
    {
      id: 'e-old',
      plantId: 'prop-1',
      eventType: 'propagation',
      timestamp: '2026-11-01T10:00:00.000Z',
      title: 'Initial root nub',
      notes: 'Small root starting.',
      metrics: { rootLengthCm: 1.4 },
    },
    {
      id: 'e-new',
      plantId: 'prop-1',
      eventType: 'propagation',
      timestamp: '2026-11-18T10:00:00.000Z',
      title: 'Secondary roots formed',
      notes: 'Ready for chunky soil mix.',
      metrics: { rootLengthCm: 5.4 },
    },
  ];

  it('extracts the latest rootLengthCm and computes readiness stages', () => {
    expect(getLatestRootLengthCm(entries, 'prop-1')).toBe(5.4);
    expect(getLatestRootLengthCm(entries, 'prop-missing')).toBeNull();

    expect(computePropagationReadiness(null).stage).toBe('unmeasured');
    expect(computePropagationReadiness(1.2).stage).toBe('early');
    expect(computePropagationReadiness(3.5).stage).toBe('developing');
    expect(computePropagationReadiness(5.4).stage).toBe('ready');
    expect(computePropagationReadiness(5.4).progress).toBe(1);
  });

  it('renders accessible progressbar and Ready to pot! badge when target reached', async () => {
    await render(<PropagationReadinessBar rootLengthCm={5.4} />);

    expect(screen.getByText('Roots: 5.4 / 5 cm')).toBeTruthy();
    expect(screen.getByText('Ready to pot!')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});
