import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LegalInfoModal } from '@/components/modals/legal-info-modal';
import { OnboardingModal } from '@/components/modals/onboarding-modal';
import { RoomPresetsSection } from '@/components/profile/room-presets-section';
import { usePlantStore } from '@/store/usePlantStore';

describe('LegalInfoModal', () => {
  it('renders Privacy Policy and Terms of Service and closes cleanly', async () => {
    const onClose = jest.fn();
    const { rerender } = await render(
      <LegalInfoModal visible document="privacy" onClose={onClose} />
    );

    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('4. Account & Data Deletion')).toBeTruthy();

    await rerender(<LegalInfoModal visible document="terms" onClose={onClose} />);
    expect(screen.getByText('Terms of Service')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Close Terms of Service'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('OnboardingModal', () => {
  it('advances through slides and invokes final scan/sample actions', async () => {
    const onStartScan = jest.fn();
    const onExploreSample = jest.fn();

    await render(
      <OnboardingModal
        visible
        onStartScan={onStartScan}
        onExploreSample={onExploreSample}
      />
    );

    expect(screen.getByText('Your calm botanical notebook')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Next onboarding slide'));
    expect(screen.getByText('Identify & diagnose in seconds')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Next onboarding slide'));
    expect(screen.getByText('Never miss a watering day')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Identify My First Plant'));
    expect(onStartScan).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByLabelText('Explore Sample Conservatory'));
    expect(onExploreSample).toHaveBeenCalledTimes(1);
  });
});

describe('RoomPresetsSection', () => {
  it('adds and deletes a room preset in Profile settings', async () => {
    const onShowToast = jest.fn();
    await render(<RoomPresetsSection onShowToast={onShowToast} />);

    await fireEvent.press(screen.getByLabelText('Add room preset'));
    await fireEvent.changeText(
      screen.getByLabelText('Room preset name'),
      'North Studio Window'
    );
    await fireEvent.press(screen.getByLabelText('Save Room Preset'));

    expect(screen.getByText('North Studio Window')).toBeTruthy();
    expect(onShowToast).toHaveBeenCalledWith(
      'Saved room preset "North Studio Window".'
    );

    await fireEvent.press(
      screen.getByLabelText('Delete North Studio Window preset')
    );
    expect(
      usePlantStore
        .getState()
        .roomPresets.some((p) => p.name === 'North Studio Window')
    ).toBe(false);
  });
});
