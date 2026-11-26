import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  PlantEnvironmentFields,
  RoomPresetBar,
} from '@/components/forms/plant-environment-fields';
import { POT_MATERIAL_OPTIONS } from '@/constants/plantOptions';
import { usePlantStore } from '@/store/usePlantStore';

describe('RoomPresetBar', () => {
  beforeEach(async () => {
    await act(async () => {
      usePlantStore.getState().resetToSeedData();
    });
  });

  it('applies a room preset when tapped and saves a new spot into store', async () => {
    const onApplyPreset = jest.fn();

    await render(
      <RoomPresetBar
        label="Location"
        location="East Sun Porch"
        lightExposure="bright_indirect"
        isIndoor={false}
        onApplyPreset={onApplyPreset}
      />
    );

    const firstPreset = usePlantStore.getState().roomPresets[0];
    expect(firstPreset).toBeDefined();

    await fireEvent.press(screen.getByText(new RegExp(firstPreset.name)));
    expect(onApplyPreset).toHaveBeenCalledWith({
      name: firstPreset.name,
      lightExposure: firstPreset.lightExposure,
      isIndoor: firstPreset.isIndoor,
    });

    await fireEvent.press(
      screen.getByLabelText('Save current location as room preset')
    );
    expect(
      usePlantStore
        .getState()
        .roomPresets.some(
          (p) =>
            p.name === 'East Sun Porch' &&
            p.lightExposure === 'bright_indirect' &&
            p.isIndoor === false
        )
    ).toBe(true);
  });

  it('renders nothing when hideWhenEmpty is enabled and no room presets exist', async () => {
    await act(async () => {
      usePlantStore.setState({ roomPresets: [] });
    });

    await render(
      <RoomPresetBar
        label="Room Presets"
        hideWhenEmpty
        location="Balcony"
        lightExposure="bright_direct"
        isIndoor={false}
        onApplyPreset={jest.fn()}
      />
    );

    expect(screen.queryByText('Room Presets')).toBeNull();
  });
});

describe('PlantEnvironmentFields', () => {
  it('updates light exposure, pot material (respecting maxPotOptions), and indoor/drainage toggles', async () => {
    const onChangeLightExposure = jest.fn();
    const onChangePotMaterial = jest.fn();
    const onChangeIsIndoor = jest.fn();
    const onChangeHasDrainageHole = jest.fn();

    await render(
      <PlantEnvironmentFields
        lightExposure="bright_direct"
        onChangeLightExposure={onChangeLightExposure}
        potMaterial="terracotta"
        onChangePotMaterial={onChangePotMaterial}
        isIndoor
        onChangeIsIndoor={onChangeIsIndoor}
        hasDrainageHole
        onChangeHasDrainageHole={onChangeHasDrainageHole}
        maxPotOptions={4}
        indoorBeforePot
        drainageDescription="Drainage helps prevent root rot."
      />
    );

    await fireEvent.press(screen.getByText('Low Shade'));
    expect(onChangeLightExposure).toHaveBeenCalledWith('low_shade');

    await fireEvent.press(screen.getByText('Nursery Pot'));
    expect(onChangePotMaterial).toHaveBeenCalledWith('plastic_nursery');

    expect(POT_MATERIAL_OPTIONS.length).toBeGreaterThan(4);
    expect(screen.queryByText('Grow Bag')).toBeNull();

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);

    await fireEvent(switches[0], 'valueChange', false);
    expect(onChangeIsIndoor).toHaveBeenCalledWith(false);

    await fireEvent(switches[1], 'valueChange', false);
    expect(onChangeHasDrainageHole).toHaveBeenCalledWith(false);
  });
});
