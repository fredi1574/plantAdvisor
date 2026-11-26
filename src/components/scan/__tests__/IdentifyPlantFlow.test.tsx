import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { IdentifyPlantFlow } from '@/components/scan/identify-plant-flow';
import { identifyPlant } from '@/services/aiPlantService';
import { usePlantStore } from '@/store/usePlantStore';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/services/aiPlantService', () => {
  const actual = jest.requireActual('@/services/aiPlantService');
  return {
    ...actual,
    identifyPlant: jest.fn(),
  };
});

describe('IdentifyPlantFlow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      usePlantStore.getState().resetToSeedData();
    });
  });

  it('reports a validation error when running identification without photo or search query', async () => {
    const onError = jest.fn();

    await render(
      <IdentifyPlantFlow
        imageUri=""
        photoRevision={0}
        manualEntryRevision={0}
        aiQuota={null}
        onQuotaExceeded={jest.fn()}
        onError={onError}
      />
    );

    await fireEvent.press(screen.getByText('Run AI Plant Identification'));

    expect(onError).toHaveBeenCalledWith(
      'Please enter a plant name or select/capture a photo first.'
    );
    expect(identifyPlant).not.toHaveBeenCalled();
  });

  it('triggers onQuotaExceeded when remaining daily AI scans is 0', async () => {
    const onQuotaExceeded = jest.fn();

    await render(
      <IdentifyPlantFlow
        imageUri="https://example.com/leaf.jpg"
        photoRevision={0}
        manualEntryRevision={0}
        aiQuota={{
          limit: 5,
          remaining: 0,
          used: 5,
          resetAt: '2026-11-27T00:00:00.000Z',
          tier: 'free',
        }}
        onQuotaExceeded={onQuotaExceeded}
        onError={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByText('Run AI Plant Identification'));

    expect(onQuotaExceeded).toHaveBeenCalledTimes(1);
    expect(identifyPlant).not.toHaveBeenCalled();
  });

  it('supports manual entry mode and saves a new plant into usePlantStore', async () => {
    const initialCount = usePlantStore.getState().plants.length;

    const { rerender } = await render(
      <IdentifyPlantFlow
        imageUri=""
        photoRevision={0}
        manualEntryRevision={0}
        aiQuota={null}
        onQuotaExceeded={jest.fn()}
        onError={jest.fn()}
      />
    );

    await fireEvent.changeText(
      screen.getByPlaceholderText(
        'e.g., Crassula ovata, Jade Plant, Avocado seed, Monstera...'
      ),
      'Calathea Orbifolia'
    );

    await rerender(
      <IdentifyPlantFlow
        imageUri=""
        photoRevision={0}
        manualEntryRevision={1}
        aiQuota={null}
        onQuotaExceeded={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByText('Calathea Orbifolia')).toBeTruthy();

    await fireEvent.press(screen.getByText('Low Shade'));
    await fireEvent.press(screen.getByText('Nursery Pot'));
    await fireEvent.press(
      screen.getByText('Add to My Garden & Open Notebook')
    );

    const plants = usePlantStore.getState().plants;
    expect(plants.length).toBe(initialCount + 1);
    expect(plants[0].nickname).toBe('Calathea Orbifolia');
    expect(plants[0].lightExposure).toBe('low_shade');
    expect(plants[0].potMaterial).toBe('plastic_nursery');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plant/[id]',
      params: { id: plants[0].id },
    });
  });
});
