import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  GardenControlsCard,
  type GardenStats,
} from '@/components/garden/garden-controls-card';

const mockStats: GardenStats = {
  total: 6,
  needsWaterCount: 2,
  needsAttentionCount: 1,
  succulentCount: 3,
  propagationCount: 1,
  foliageCount: 2,
  floweringCount: 0,
};

describe('GardenControlsCard', () => {
  it('renders search, filter counts, sort options, and triggers callbacks', async () => {
    const onChangeSearch = jest.fn();
    const onSelectFilter = jest.fn();
    const onSelectSort = jest.fn();
    const onToggleGroupByLocation = jest.fn();

    await render(
      <GardenControlsCard
        hasPlants
        stats={mockStats}
        searchQuery="Jade"
        filter="all"
        sortBy="needs_water"
        groupByLocation={false}
        onChangeSearch={onChangeSearch}
        onSelectFilter={onSelectFilter}
        onSelectSort={onSelectSort}
        onToggleGroupByLocation={onToggleGroupByLocation}
      />
    );

    const searchInput = screen.getByPlaceholderText(
      'Search nickname, species, or room...'
    );
    await fireEvent.changeText(searchInput, 'Monstera');
    expect(onChangeSearch).toHaveBeenCalledWith('Monstera');

    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(onChangeSearch).toHaveBeenCalledWith('');

    await fireEvent.press(screen.getByText('Thirsty (2)'));
    expect(onSelectFilter).toHaveBeenCalledWith('needs_water');

    await fireEvent.press(screen.getByText('Succulents (3)'));
    expect(onSelectFilter).toHaveBeenCalledWith('succulent');

    await fireEvent.press(screen.getByText('A–Z'));
    expect(onSelectSort).toHaveBeenCalledWith('alpha');

    await fireEvent.press(screen.getByText('By Room'));
    expect(onToggleGroupByLocation).toHaveBeenCalledTimes(1);
  });

  it('hides search input and sort bar when garden is empty', async () => {
    await render(
      <GardenControlsCard
        hasPlants={false}
        stats={{
          total: 0,
          needsWaterCount: 0,
          needsAttentionCount: 0,
          succulentCount: 0,
          propagationCount: 0,
          foliageCount: 0,
          floweringCount: 0,
        }}
        searchQuery=""
        filter="all"
        sortBy="needs_water"
        groupByLocation={false}
        onChangeSearch={jest.fn()}
        onSelectFilter={jest.fn()}
        onSelectSort={jest.fn()}
        onToggleGroupByLocation={jest.fn()}
      />
    );

    expect(
      screen.queryByPlaceholderText('Search nickname, species, or room...')
    ).toBeNull();
    expect(screen.queryByText('By Room')).toBeNull();
    expect(screen.getByText('All (0)')).toBeTruthy();
  });
});
