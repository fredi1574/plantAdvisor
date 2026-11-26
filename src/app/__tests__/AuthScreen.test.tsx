import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import SignInScreen from '@/app/auth';
import { useAuthStore } from '@/store/useAuthStore';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('SignInScreen Forgot Password flow', () => {
  const originalReset = useAuthStore.getState().resetPasswordForEmail;
  const originalUpdatePassword = useAuthStore.getState().updatePassword;
  const originalCancelRecovery = useAuthStore.getState().cancelPasswordRecovery;

  afterEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      useAuthStore.setState({
        resetPasswordForEmail: originalReset,
        updatePassword: originalUpdatePassword,
        cancelPasswordRecovery: originalCancelRecovery,
        isPasswordRecovery: false,
        authError: null,
        isLoading: false,
      });
    });
  });

  it('switches into reset mode, validates email, sends reset link, and returns to sign in', async () => {
    const mockReset = jest.fn(async () => ({ ok: true }));
    useAuthStore.setState({
      resetPasswordForEmail: mockReset,
      authError: null,
      isLoading: false,
    });

    await render(<SignInScreen />);

    const emailInput = screen.getByPlaceholderText('Email address');
    await fireEvent.changeText(emailInput, 'gardener@example.com');

    await fireEvent.press(screen.getByLabelText('Forgot password?'));

    expect(screen.getByText('Reset Password')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Password')).toBeNull();

    await fireEvent.press(screen.getByText('Send Reset Link'));
    expect(mockReset).toHaveBeenCalledWith('gardener@example.com');
    expect(
      screen.getByText(/Password reset link sent to gardener@example\.com/i)
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Back to sign in'));
    expect(screen.getByText('Enter My Garden')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('shows validation error when submitting reset mode with an invalid email', async () => {
    const mockReset = jest.fn(async () => ({ ok: true }));
    useAuthStore.setState({
      resetPasswordForEmail: mockReset,
      authError: null,
      isLoading: false,
    });

    await render(<SignInScreen />);

    await fireEvent.press(screen.getByLabelText('Forgot password?'));
    await fireEvent.changeText(
      screen.getByPlaceholderText('Email address'),
      'not-an-email'
    );
    await fireEvent.press(screen.getByText('Send Reset Link'));

    expect(mockReset).not.toHaveBeenCalled();
    expect(
      screen.getByText('Please enter a valid email address.')
    ).toBeTruthy();
  });

  it('renders Set New Password mode during password recovery, validates match, and updates password', async () => {
    const mockUpdate = jest.fn(async () => ({ ok: true }));
    const mockCancel = jest.fn(async () => undefined);

    await act(async () => {
      useAuthStore.setState({
        isPasswordRecovery: true,
        updatePassword: mockUpdate,
        cancelPasswordRecovery: mockCancel,
        authError: null,
        isLoading: false,
      });
    });

    await render(<SignInScreen />);

    expect(screen.getByText('Set New Password')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByPlaceholderText('New password (min. 6 chars)'),
      'botanical123'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('Confirm new password'),
      'different123'
    );
    await fireEvent.press(screen.getByText('Update Password'));

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByPlaceholderText('Confirm new password'),
      'botanical123'
    );
    await fireEvent.press(screen.getByText('Update Password'));

    expect(mockUpdate).toHaveBeenCalledWith('botanical123');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');

    await fireEvent.press(screen.getByText('Back to sign in'));
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
