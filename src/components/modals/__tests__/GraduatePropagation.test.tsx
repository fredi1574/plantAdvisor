import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GraduatePropagationModal } from '@/components/modals/graduate-propagation-modal';
import { PropagationGraduationCard } from '@/components/plant-detail/propagation-graduation-card';
import { usePlantStore } from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function findSeedPropagationPlant(): UserPlant {
  const prop = usePlantStore
    .getState()
    .plants.find((p) => p.species.plantType === 'propagation');
  if (!prop) {
    throw new Error('Expected at least one propagation plant in seed data');
  }
  return prop;
}

describe('graduatePropagation store action', () => {
  beforeEach(async () => {
    await act(async () => {
      usePlantStore.getState().resetToSeedData();
    });
  });

  it('transitions a propagation cutting into a potted plant and logs a repot milestone', async () => {
    const cutting = findSeedPropagationPlant();
    const initialEntryCount = usePlantStore.getState().entries.length;

    let entry: ReturnType<
      ReturnType<typeof usePlantStore.getState>['graduatePropagation']
    > = null;
    await act(async () => {
      entry = usePlantStore.getState().graduatePropagation(cutting.id, {
        plantType: 'foliage',
        potMaterial: 'terracotta',
        hasDrainageHole: true,
        location: 'East Kitchen Window',
        lightExposure: 'bright_indirect',
        isIndoor: true,
        customWateringIntervalDays: 7,
        rootLengthCm: 6.2,
      });
    });

    expect(entry).not.toBeNull();
    expect(entry!.eventType).toBe('repot');
    expect(entry!.metrics?.rootLengthCm).toBe(6.2);
    expect(entry!.notes).toContain('6.2');

    const updated = usePlantStore
      .getState()
      .plants.find((p) => p.id === cutting.id)!;
    expect(updated.species.plantType).toBe('foliage');
    expect(updated.potMaterial).toBe('terracotta');
    expect(updated.hasDrainageHole).toBe(true);
    expect(updated.location).toBe('East Kitchen Window');
    expect(updated.customWateringIntervalDays).toBe(7);
    expect(usePlantStore.getState().entries.length).toBe(initialEntryCount + 1);
    expect(
      usePlantStore
        .getState()
        .pendingOps.some((op) => op.kind === 'upsert_plant' && op.id === cutting.id)
    ).toBe(true);
    expect(
      usePlantStore
        .getState()
        .pendingOps.some((op) => op.kind === 'upsert_entry' && op.id === entry!.id)
    ).toBe(true);
  });

  it('returns null safely for an unknown plant ID', () => {
    const result = usePlantStore.getState().graduatePropagation('missing-id', {
      plantType: 'foliage',
      potMaterial: 'terracotta',
      hasDrainageHole: true,
      location: 'Living Room',
      lightExposure: 'bright_indirect',
      isIndoor: true,
      customWateringIntervalDays: 7,
    });
    expect(result).toBeNull();
  });
});

describe('PropagationGraduationCard', () => {
  it('shows progress copy below 5 cm and still allows graduating early', async () => {
    const onPressGraduate = jest.fn();
    await render(
      <PropagationGraduationCard
        rootLengthCm={2.5}
        onPressGraduate={onPressGraduate}
      />
    );

    expect(screen.getByText('Propagation Bench Progress')).toBeTruthy();
    await fireEvent.press(
      screen.getByLabelText('Graduate propagation to permanent pot')
    );
    expect(onPressGraduate).toHaveBeenCalledTimes(1);
  });

  it('highlights Ready to Pot Into Soil! once roots reach 5 cm or more', async () => {
    await render(
      <PropagationGraduationCard
        rootLengthCm={5.8}
        onPressGraduate={jest.fn()}
      />
    );

    expect(screen.getByText('Ready to Pot Into Soil!')).toBeTruthy();
    expect(screen.getByText(/5\.8 cm/)).toBeTruthy();
  });
});

describe('GraduatePropagationModal', () => {
  beforeEach(async () => {
    await act(async () => {
      usePlantStore.getState().resetToSeedData();
    });
  });

  it('graduates a propagation cutting via the form sheet and closes cleanly', async () => {
    const cutting = findSeedPropagationPlant();
    const onClose = jest.fn();
    const onGraduated = jest.fn();

    await render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <GraduatePropagationModal
          plant={cutting}
          visible
          latestRootLengthCm={5.5}
          onClose={onClose}
          onGraduated={onGraduated}
        />
      </SafeAreaProvider>
    );

    expect(screen.getByText('Graduate to Permanent Pot')).toBeTruthy();

    await fireEvent.press(screen.getByText('Flowering'));
    await fireEvent.press(screen.getByText('Terracotta'));
    await fireEvent.press(screen.getByLabelText('Increase watering interval'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(
        'e.g., Potted into chunky aroid mix with perlite...'
      ),
      'Moved into chunky soil mix.'
    );

    await fireEvent.press(screen.getByLabelText('Confirm & Pot Up'));

    const updated = usePlantStore
      .getState()
      .plants.find((p) => p.id === cutting.id)!;
    expect(updated.species.plantType).toBe('flowering');
    expect(updated.potMaterial).toBe('terracotta');
    expect(updated.hasDrainageHole).toBe(true);

    const latestEntry = usePlantStore.getState().entries[0];
    expect(latestEntry.eventType).toBe('repot');
    expect(latestEntry.notes).toBe('Moved into chunky soil mix.');
    expect(latestEntry.metrics?.rootLengthCm).toBe(5.5);

    expect(onGraduated).toHaveBeenCalledWith(cutting.nickname);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
