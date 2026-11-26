import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
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

  afterEach(async () => {
    await act(async () => {
      useAuthStore.setState({
        resetPasswordForEmail: originalReset,
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
});
