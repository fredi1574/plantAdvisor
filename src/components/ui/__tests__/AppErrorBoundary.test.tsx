import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { AppErrorBoundary } from '@/components/ui/app-error-boundary';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders error details and invokes retry when Try Again is pressed', async () => {
    const retry = jest.fn(async () => undefined);

    await render(
      <AppErrorBoundary
        error={new Error('Specimen renderer crashed')}
        retry={retry}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Specimen renderer crashed')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('navigates back to the garden tab when Return to Garden is pressed', async () => {
    await render(
      <AppErrorBoundary
        error={new Error('Unexpected state')}
        retry={jest.fn(async () => undefined)}
      />
    );

    await fireEvent.press(screen.getByLabelText('Return to My Garden'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
