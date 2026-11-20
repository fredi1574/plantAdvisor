import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { AiScanShimmerCard } from '@/components/ui/botanical-shimmer';
import {
  computeHydrationMetrics,
  HydrationBar,
  WateringProgressPill,
} from '@/components/ui/hydration-bar';

describe('computeHydrationMetrics, HydrationBar & WateringProgressPill', () => {
  const fixedNow = new Date('2026-11-20T12:00:00.000Z');

  it('fills from 0% right after watering up to 100% when due or overdue', () => {
    const fresh = computeHydrationMetrics(
      {
        lastWateredAt: '2026-11-20T08:00:00.000Z',
        customWateringIntervalDays: 10,
      },
      fixedNow
    );
    expect(fresh.tone).toBe('fresh');
    expect(fresh.fillRatio).toBe(0);
    expect(fresh.isFilled).toBe(false);

    const filling = computeHydrationMetrics(
      {
        lastWateredAt: '2026-11-12T12:00:00.000Z',
        customWateringIntervalDays: 10,
      },
      fixedNow
    );
    expect(filling.tone).toBe('filling');
    expect(filling.fillRatio).toBeCloseTo(0.8);
    expect(filling.isFilled).toBe(false);

    const dueToday = computeHydrationMetrics(
      {
        lastWateredAt: '2026-11-10T12:00:00.000Z',
        customWateringIntervalDays: 10,
      },
      fixedNow
    );
    expect(dueToday.tone).toBe('due_today');
    expect(dueToday.fillRatio).toBe(1);
    expect(dueToday.isFilled).toBe(true);

    const overdue = computeHydrationMetrics(
      {
        lastWateredAt: '2026-11-05T12:00:00.000Z',
        customWateringIntervalDays: 10,
      },
      fixedNow
    );
    expect(overdue.tone).toBe('overdue');
    expect(overdue.fillRatio).toBe(1);
    expect(overdue.isFilled).toBe(true);
  });

  it('renders an accessible progressbar for HydrationBar', async () => {
    await render(
      <HydrationBar
        plant={{
          lastWateredAt: new Date().toISOString(),
          customWateringIntervalDays: 7,
        }}
      />
    );

    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows progress pill before due date and interactive water button once filled', async () => {
    const onWaterNow = jest.fn();
    const baseSpecies = {
      id: 'sp-1',
      commonName: 'Monstera',
      scientificName: 'Monstera deliciosa',
      family: 'Araceae',
      plantType: 'foliage' as const,
      baselineCare: {
        idealLight: 'Bright indirect',
        baseWateringDays: 7,
        soilRecommendation: 'Aroid mix',
        succulentGuardrails: {
          isSucculentOrCactus: false,
          neverMistFoliage: false,
          soakAndDryRequired: false,
          minimumDryBackDays: 4,
          rotWarningNote: '',
        },
      },
    };

    const { rerender } = await render(
      <WateringProgressPill
        plant={{
          nickname: 'Deli',
          lastWateredAt: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          customWateringIntervalDays: 7,
          species: baseSpecies,
        }}
        onWaterNow={onWaterNow}
      />
    );

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText(/until water/i)).toBeTruthy();

    await rerender(
      <WateringProgressPill
        plant={{
          nickname: 'Deli',
          lastWateredAt: new Date(
            Date.now() - 9 * 24 * 60 * 60 * 1000
          ).toISOString(),
          customWateringIntervalDays: 7,
          species: baseSpecies,
        }}
        onWaterNow={onWaterNow}
      />
    );

    const waterBtn = screen.getByLabelText('Water Deli now');
    await fireEvent.press(waterBtn, { stopPropagation: jest.fn() });
    expect(onWaterNow).toHaveBeenCalledTimes(1);
  });
});

describe('AiScanShimmerCard', () => {
  it('renders staged botanical analysis copy for identify and diagnose modes', async () => {
    const { rerender } = await render(<AiScanShimmerCard mode="identify" />);
    expect(screen.getByText('BOTANICAL ANALYSIS')).toBeTruthy();
    expect(screen.getByText(/Reading leaf venation/i)).toBeTruthy();

    await rerender(<AiScanShimmerCard mode="diagnose" />);
    expect(screen.getByText('PATHOLOGY SCAN')).toBeTruthy();
    expect(screen.getByText(/Inspecting foliage/i)).toBeTruthy();
  });
});
