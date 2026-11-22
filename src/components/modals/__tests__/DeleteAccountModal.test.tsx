import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';

import { DeleteAccountModal } from '@/components/modals/delete-account-modal';
import { useAuthStore } from '@/store/useAuthStore';

describe('DeleteAccountModal', () => {
  it('keeps delete disabled until user types DELETE, then confirms and closes', async () => {
    const onClose = jest.fn();
    const onConfirmDelete = jest.fn().mockResolvedValue({ ok: true });

    await render(
      <DeleteAccountModal
        visible
        email="gardener@floralog.app"
        onClose={onClose}
        onConfirmDelete={onConfirmDelete}
      />
    );

    const deleteBtn = screen.getByLabelText('Permanently Delete Account');
    expect(deleteBtn.props.accessibilityState?.disabled).toBe(true);

    const input = screen.getByLabelText(
      'Type DELETE to confirm account deletion'
    );
    await fireEvent.changeText(input, 'DEL');
    expect(deleteBtn.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.changeText(input, 'DELETE');
    expect(deleteBtn.props.accessibilityState?.disabled).toBe(false);

    await fireEvent.press(deleteBtn);

    await waitFor(() => {
      expect(onConfirmDelete).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays server error when account deletion fails', async () => {
    const onClose = jest.fn();
    const onConfirmDelete = jest.fn().mockResolvedValue({
      ok: false,
      error: 'Edge function unreachable',
    });

    await render(
      <DeleteAccountModal
        visible
        email="gardener@floralog.app"
        onClose={onClose}
        onConfirmDelete={onConfirmDelete}
      />
    );

    const input = screen.getByLabelText(
      'Type DELETE to confirm account deletion'
    );
    await fireEvent.changeText(input, 'delete');

    const deleteBtn = screen.getByLabelText('Permanently Delete Account');
    await fireEvent.press(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Edge function unreachable')).toBeTruthy();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('useAuthStore.deleteAccount (local fallback)', () => {
  it('removes the signed-in local account and clears session state', async () => {
    const signUpRes = await useAuthStore.getState().signUpWithEmail({
      email: 'delete-me@floralog.app',
      password: 'password123',
      displayName: 'Temp Gardener',
    });
    expect(signUpRes.ok).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('delete-me@floralog.app');

    const delRes = await useAuthStore.getState().deleteAccount();
    expect(delRes.ok).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
  });
});
