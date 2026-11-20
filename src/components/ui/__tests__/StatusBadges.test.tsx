import { render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  HealthStatusBadge,
  SucculentGuardrailBanner,
  UrgencyBadge,
} from '@/components/ui/status-badges';

describe('StatusBadges primitives', () => {
  it('renders HealthStatusBadge labels for all health statuses', async () => {
    const { rerender } = await render(<HealthStatusBadge status="thriving" />);
    expect(screen.getByText('Thriving')).toBeTruthy();

    await rerender(<HealthStatusBadge status="needs_attention" />);
    expect(screen.getByText('Needs Attention')).toBeTruthy();

    await rerender(<HealthStatusBadge status="critical" showDot={false} />);
    expect(screen.getByText('Critical')).toBeTruthy();
  });

  it('renders UrgencyBadge labels and SucculentGuardrailBanner copy', async () => {
    await render(
      <>
        <UrgencyBadge urgency="immediate" />
        <UrgencyBadge urgency="soon" />
        <UrgencyBadge urgency="routine" />
        <SucculentGuardrailBanner message="Never mist succulent foliage." />
      </>
    );

    expect(screen.getByText('Immediate')).toBeTruthy();
    expect(screen.getByText('Soon')).toBeTruthy();
    expect(screen.getByText('Routine')).toBeTruthy();
    expect(screen.getByText('Never mist succulent foliage.')).toBeTruthy();
  });
});
