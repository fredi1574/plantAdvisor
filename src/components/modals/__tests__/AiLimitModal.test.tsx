import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { AiLimitModal } from '@/components/modals/ai-limit-modal';

describe('AiLimitModal', () => {
  it('displays the daily limit and handles manual-add and dismiss actions', async () => {
    const onClose = jest.fn();
    const onAddManual = jest.fn();

    await render(
      <AiLimitModal
        visible
        quota={{
          limit: 5,
          used: 5,
          remaining: 0,
          resetAt: '2026-11-21T00:00:00.000Z',
          tier: 'free',
        }}
        onClose={onClose}
        onAddManual={onAddManual}
      />
    );

    expect(screen.getByText('Daily AI Scan Limit Reached')).toBeTruthy();
    expect(screen.getByText(/used all 5 free AI scans/i)).toBeTruthy();

    await fireEvent.press(screen.getByText('Add Plant Manually Instead'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAddManual).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Got It'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('omits manual add button when onAddManual is not provided', async () => {
    await render(<AiLimitModal visible quota={null} onClose={jest.fn()} />);

    expect(screen.queryByText('Add Plant Manually Instead')).toBeNull();
    expect(screen.getByText('Got It')).toBeTruthy();
  });
});
