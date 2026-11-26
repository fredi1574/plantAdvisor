import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EditPlantModal } from '@/components/modals/edit-plant-modal';
import { usePlantStore } from '@/store/usePlantStore';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('EditPlantModal', () => {
  beforeEach(async () => {
    await act(async () => {
      usePlantStore.getState().resetToSeedData();
    });
  });

  it('edits plant details, applies a room preset, increments watering interval, and persists to store', async () => {
    const target = usePlantStore.getState().plants[0];
    const originalInterval = target.customWateringIntervalDays;
    const presetToPick = usePlantStore.getState().roomPresets[1];
    const onClose = jest.fn();
    const onSaved = jest.fn();

    await render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <EditPlantModal
          plant={target}
          visible
          onClose={onClose}
          onSaved={onSaved}
        />
      </SafeAreaProvider>
    );

    expect(screen.getByText('Edit Plant Details')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Sunny Window Jade'),
      'Renamed Conservatory Jade'
    );
    await fireEvent.press(screen.getByLabelText('Increase watering interval'));
    await fireEvent.press(screen.getByText(new RegExp(presetToPick.name)));
    await fireEvent.press(screen.getByText('Glazed Ceramic'));

    await fireEvent.press(screen.getByLabelText('Save Changes'));

    const updated = usePlantStore
      .getState()
      .plants.find((p) => p.id === target.id)!;
    expect(updated.nickname).toBe('Renamed Conservatory Jade');
    expect(updated.customWateringIntervalDays).toBe(originalInterval + 1);
    expect(updated.location).toBe(presetToPick.name);
    expect(updated.lightExposure).toBe(presetToPick.lightExposure);
    expect(updated.potMaterial).toBe('ceramic_glazed');

    expect(onSaved).toHaveBeenCalledWith('Renamed Conservatory Jade');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes and delegates to onRequestDelete when pressing the delete button', async () => {
    const target = usePlantStore.getState().plants[0];
    const onClose = jest.fn();
    const onRequestDelete = jest.fn();

    await render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <EditPlantModal
          plant={target}
          visible
          onClose={onClose}
          onRequestDelete={onRequestDelete}
        />
      </SafeAreaProvider>
    );

    await fireEvent.press(screen.getByLabelText(`Delete ${target.nickname}`));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRequestDelete).toHaveBeenCalledWith(target);
  });
});
