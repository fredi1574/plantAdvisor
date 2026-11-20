import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { PlantStatusPhoto } from '@/components/garden/plant-status-photo';

describe('PlantStatusPhoto', () => {
  it('renders a clean photo ring without alert pip for thriving plants', async () => {
    await render(
      <PlantStatusPhoto
        uri="https://example.com/jade.jpg"
        alt="Window Jade"
        status="thriving"
      />
    );

    expect(screen.getByLabelText('Window Jade, Thriving')).toBeTruthy();
    expect(screen.queryByTestId('status-alert-pip')).toBeNull();
  });

  it('renders a corner alert pip for needs_attention and critical plants', async () => {
    const { rerender } = await render(
      <PlantStatusPhoto
        uri="https://example.com/fern.jpg"
        alt="Boston Fern"
        status="needs_attention"
      />
    );

    expect(screen.getByLabelText('Boston Fern, Needs Attention')).toBeTruthy();
    expect(screen.getByTestId('status-alert-pip')).toBeTruthy();

    await rerender(
      <PlantStatusPhoto
        uri="https://example.com/fern.jpg"
        alt="Boston Fern"
        status="critical"
        variant="grid"
      />
    );

    expect(screen.getByLabelText('Boston Fern, Critical')).toBeTruthy();
    expect(screen.getByTestId('status-alert-pip')).toBeTruthy();
  });
});
