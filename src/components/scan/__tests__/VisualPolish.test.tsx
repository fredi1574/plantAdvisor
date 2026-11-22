import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { GardenEmptyState } from '@/components/garden/garden-empty-state';
import { CareLogSection } from '@/components/plant-detail/care-log-section';
import { PhotoCaptureCard } from '@/components/scan/photo-capture-card';
import { PlantSelectorField } from '@/components/scan/plant-selector-field';
import type { NotebookEntry, UserPlant } from '@/types/plant';

jest.mock('@/components/plant-detail/care-event-composer', () => ({
  CareEventComposer: () => null,
}));

jest.mock('@/components/ui/swipeable-row', () => ({
  SwipeableRow: ({
    children,
  }: {
    children: (state: { isOpen: boolean; pressed: boolean }) => React.ReactNode;
  }) => children({ isOpen: false, pressed: false }),
}));

const MOCK_PLANT: UserPlant = {
  id: 'plant-1',
  nickname: 'Sunny Jade',
  location: 'South Living Room Sill',
  isIndoor: true,
  lightExposure: 'bright_direct',
  hasDrainageHole: true,
  potMaterial: 'terracotta',
  photoUri: 'https://example.com/jade.jpg',
  acquiredAt: '2026-10-01T10:00:00.000Z',
  lastWateredAt: '2026-11-18T10:00:00.000Z',
  customWateringIntervalDays: 14,
  species: {
    id: 'sp-jade',
    commonName: 'Jade Plant',
    scientificName: 'Crassula ovata',
    family: 'Crassulaceae',
    plantType: 'succulent',
    baselineCare: {
      idealLight: 'Bright direct sun',
      baseWateringDays: 14,
      soilRecommendation: 'Gritty cactus & succulent mix',
      succulentGuardrails: {
        isSucculentOrCactus: true,
        neverMistFoliage: true,
        soakAndDryRequired: true,
        minimumDryBackDays: 10,
        rotWarningNote: 'Allow soil to dry completely between soakings.',
      },
    },
  },
};

const MOCK_ENTRY: NotebookEntry = {
  id: 'entry-1',
  plantId: 'plant-1',
  timestamp: '2026-11-18T10:00:00.000Z',
  eventType: 'water',
  title: 'Deep Bottom Soak',
  notes: 'Soil was bone dry before watering.',
  photoUri: 'https://example.com/log-photo.jpg',
};

describe('GardenEmptyState', () => {
  it('renders custom botanical empty state for empty-garden and triggers action', async () => {
    const onAction = jest.fn();
    await render(<GardenEmptyState variant="empty-garden" onAction={onAction} />);

    expect(screen.getByText('Your garden is empty')).toBeTruthy();
    const button = screen.getByText('Identify Your First Plant');
    await fireEvent.press(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders custom botanical empty state for no-matches and triggers action', async () => {
    const onAction = jest.fn();
    await render(<GardenEmptyState variant="no-matches" onAction={onAction} />);

    expect(screen.getByText('Nothing matches this view')).toBeTruthy();
    const button = screen.getByText('Show All Plants');
    await fireEvent.press(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('CareLogSection', () => {
  it('renders botanical SVG empty placeholder when there are no care entries', async () => {
    await render(
      <CareLogSection
        plant={MOCK_PLANT}
        plantEntries={[]}
        onShowToast={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(screen.getByText('Chronological Notebook Timeline')).toBeTruthy();
    expect(screen.getByText('Your care journal is ready')).toBeTruthy();
  });

  it('renders chronological timeline items and inline photo inspection button', async () => {
    await render(
      <CareLogSection
        plant={MOCK_PLANT}
        plantEntries={[MOCK_ENTRY]}
        onShowToast={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(screen.getByText('Deep Bottom Soak')).toBeTruthy();
    expect(screen.getByText('Soil was bone dry before watering.')).toBeTruthy();
    expect(
      screen.getByLabelText('Inspect photo for Deep Bottom Soak')
    ).toBeTruthy();
  });
});

describe('PhotoCaptureCard', () => {
  it('renders viewfinder empty state and tactile Camera / Photo Library controls', async () => {
    await render(
      <PhotoCaptureCard
        imageUri=""
        imageDimensions=""
        onImageSelected={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(
      screen.getByText('Snap a leaf photo or choose a sample below')
    ).toBeTruthy();
    expect(screen.getByLabelText('Capture photo with camera')).toBeTruthy();
    expect(screen.getByLabelText('Choose photo from library')).toBeTruthy();
  });
});

describe('PlantSelectorField', () => {
  it('opens dropdown modal and selects a plant cleanly', async () => {
    const secondPlant: UserPlant = {
      ...MOCK_PLANT,
      id: 'plant-2',
      nickname: 'Kitchen Pothos',
      location: 'East Kitchen Shelf',
    };
    const onSelectPlant = jest.fn();

    await render(
      <PlantSelectorField
        plants={[MOCK_PLANT, secondPlant]}
        selectedPlant={MOCK_PLANT}
        onSelectPlant={onSelectPlant}
      />
    );

    const trigger = screen.getByLabelText(
      'Selected plant Sunny Jade. Tap to change specimen.'
    );
    await fireEvent.press(trigger);

    expect(screen.getByText('Choose Specimen')).toBeTruthy();
    await fireEvent.press(screen.getByText('Kitchen Pothos'));
    expect(onSelectPlant).toHaveBeenCalledWith('plant-2');
  });
});
