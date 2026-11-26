import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  GardenContextBanners,
  GardenViewToggle,
} from '@/components/garden/garden-feed-sections';

describe('GardenViewToggle', () => {
  it('switches between list and grid modes with accessible labels', async () => {
    const onChange = jest.fn();
    await render(<GardenViewToggle viewMode="list" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Two-column grid view'));
    expect(onChange).toHaveBeenCalledWith('grid');

    await fireEvent.press(screen.getByLabelText('List view'));
    expect(onChange).toHaveBeenCalledWith('list');
  });
});

describe('GardenContextBanners', () => {
  it('shows the thirsty banner with Water All action on the needs_water filter', async () => {
    const onWaterAll = jest.fn();
    await render(
      <GardenContextBanners
        filter="needs_water"
        filteredCount={3}
        isPropagationBench={false}
        propagationReadyCount={0}
        onWaterAllThirsty={onWaterAll}
      />
    );

    await fireEvent.press(screen.getByLabelText('Water all thirsty plants'));
    expect(onWaterAll).toHaveBeenCalledTimes(1);
  });

  it('shows the propagation readiness banner on the propagation bench', async () => {
    await render(
      <GardenContextBanners
        filter="propagation"
        filteredCount={2}
        isPropagationBench
        propagationReadyCount={1}
        onWaterAllThirsty={jest.fn()}
      />
    );

    expect(screen.getByText(/1 of 2 ready to pot/)).toBeTruthy();
    expect(screen.queryByLabelText('Water all thirsty plants')).toBeNull();
  });
});
