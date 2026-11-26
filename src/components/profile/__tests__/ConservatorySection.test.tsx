import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ConservatorySection } from '@/components/profile/conservatory-section';
import { usePlantStore } from '@/store/usePlantStore';

describe('ConservatorySection', () => {
  beforeEach(() => {
    usePlantStore.getState().resetToSeedData();
  });

  it('renders derived rank, care rhythm stats, seals grid, and reveals seal details on tap', async () => {
    await render(<ConservatorySection />);

    expect(screen.getByText('CONSERVATORY')).toBeTruthy();
    expect(screen.getByText('Care Rhythm')).toBeTruthy();
    expect(screen.getByText('On Schedule')).toBeTruthy();
    expect(screen.getByText('Seals Earned')).toBeTruthy();
    expect(screen.getByText('First Roots')).toBeTruthy();

    // Tap First Roots seal to inspect its botanical criteria
    await fireEvent.press(screen.getByLabelText(/First Roots/i));
    expect(
      screen.getByText(
        'Cultivate at least 3 living specimens in your conservatory.'
      )
    ).toBeTruthy();
  });

  it('switches to the Herbarium tab and displays documented species plates', async () => {
    await render(<ConservatorySection />);

    await fireEvent.press(screen.getByRole('tab', { name: /Herbarium/i }));

    expect(screen.getByText('Specimen Types')).toBeTruthy();
    expect(screen.getByText('Crassula ovata')).toBeTruthy();
    expect(screen.getByText('Monstera deliciosa')).toBeTruthy();
    expect(screen.getByText('Persea americana')).toBeTruthy();
  });
});
