import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';

describe('PetSafetyBadge', () => {
  it('renders nothing when petSafety is omitted', async () => {
    await render(<PetSafetyBadge />);
    expect(screen.queryByText(/Pet Safe|Toxic to/i)).toBeNull();
  });

  it('renders a pet-safe badge when non-toxic to cats and dogs', async () => {
    await render(
      <PetSafetyBadge
        petSafety={{
          isToxicToCats: false,
          isToxicToDogs: false,
          toxicityLevel: 'safe',
          toxicPrinciples: 'None',
          safetyNotes: 'Safe around household pets.',
        }}
      />
    );

    expect(screen.getByText('Pet Safe (Cats & Dogs)')).toBeTruthy();
    expect(screen.queryByText(/Safe around household pets/)).toBeNull();
  });

  it('renders toxicity targets, compound, and safety notes when showDetails is true', async () => {
    await render(
      <PetSafetyBadge
        showDetails
        petSafety={{
          isToxicToCats: true,
          isToxicToDogs: true,
          toxicityLevel: 'moderate',
          toxicPrinciples: 'Insoluble calcium oxalates',
          safetyNotes: 'Keep elevated out of reach of pets.',
        }}
      />
    );

    expect(screen.getByText('Toxic to Cats & Dogs · Moderate')).toBeTruthy();
    expect(
      screen.getByText('Compound: Insoluble calcium oxalates')
    ).toBeTruthy();
    expect(
      screen.getByText('Keep elevated out of reach of pets.')
    ).toBeTruthy();
  });
});
