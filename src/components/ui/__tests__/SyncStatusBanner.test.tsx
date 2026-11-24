import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SyncStatusBanner } from '@/components/ui/sync-status-banner';

describe('SyncStatusBanner', () => {
  it('renders nothing when hidden or fully synced', async () => {
    const { rerender } = await render(
      <SyncStatusBanner
        visible={false}
        isSyncing={false}
        pendingSyncCount={2}
        syncError={null}
        onSyncNow={jest.fn()}
      />
    );
    expect(screen.queryByText(/Sync Now/i)).toBeNull();

    await rerender(
      <SyncStatusBanner
        visible
        isSyncing={false}
        pendingSyncCount={0}
        localPhotoCount={0}
        syncError={null}
        onSyncNow={jest.fn()}
      />
    );
    expect(screen.queryByText(/Sync Now/i)).toBeNull();
  });

  it('shows pending changes and local photo counts and triggers onSyncNow', async () => {
    const onSyncNow = jest.fn();

    await render(
      <SyncStatusBanner
        visible
        isSyncing={false}
        pendingSyncCount={2}
        localPhotoCount={1}
        syncError={null}
        onSyncNow={onSyncNow}
      />
    );

    expect(
      screen.getByText('2 changes pending · 1 photo waiting to upload')
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Sync garden now'));
    expect(onSyncNow).toHaveBeenCalledTimes(1);
  });

  it('shows syncing indicator and disables retry while syncing', async () => {
    const onSyncNow = jest.fn();

    await render(
      <SyncStatusBanner
        visible
        isSyncing
        pendingSyncCount={1}
        syncError={null}
        onSyncNow={onSyncNow}
      />
    );

    expect(screen.getByText('Syncing...')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Sync garden now'));
    expect(onSyncNow).not.toHaveBeenCalled();
  });
});
