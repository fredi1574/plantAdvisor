import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthIconInput } from '@/components/auth/auth-icon-input';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { usePalette } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignInScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const resetPasswordForEmail = useAuthStore((s) => s.resetPasswordForEmail);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const cancelPasswordRecovery = useAuthStore((s) => s.cancelPasswordRecovery);
  const isPasswordRecovery = useAuthStore((s) => s.isPasswordRecovery);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLocalError(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError(t('auth.invalidEmailError'));
      return;
    }
    if (password.length < 6) {
      setLocalError(t('auth.shortPasswordError'));
      return;
    }

    const result = await signInWithEmail(cleanEmail, password);
    if (result.ok) {
      router.replace('/(tabs)');
    }
  };

  const handleResetPassword = async () => {
    setLocalError(null);
    setResetSentEmail(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError(t('auth.invalidEmailError'));
      return;
    }

    const result = await resetPasswordForEmail(cleanEmail);
    if (result.ok) {
      setResetSentEmail(cleanEmail);
    }
  };

  const handleUpdatePassword = async () => {
    setLocalError(null);
    clearError();

    if (newPassword.length < 6) {
      setLocalError(t('auth.shortPasswordError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError(t('auth.passwordMismatchError'));
      return;
    }

    const result = await updatePassword(newPassword);
    if (result.ok) {
      setNewPassword('');
      setConfirmPassword('');
      router.replace('/(tabs)');
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    const result = await signInWithGoogle();
    if (result.ok) {
      router.replace('/(tabs)');
    }
  };

  const toggleResetMode = (nextResetMode: boolean) => {
    setIsResetMode(nextResetMode);
    setLocalError(null);
    setResetSentEmail(null);
    clearError();
  };

  const screenTitle = isPasswordRecovery
    ? t('auth.newPasswordTitle')
    : isResetMode
      ? t('auth.resetTitle')
      : t('auth.signInTitle');

  const screenSubtitle = isPasswordRecovery
    ? t('auth.newPasswordSubtitle')
    : isResetMode
      ? t('auth.resetSubtitle')
      : t('auth.signInSubtitle');

  const submitLabel = isPasswordRecovery
    ? t('auth.updatePasswordSubmit')
    : isResetMode
      ? t('auth.resetSubmit')
      : t('auth.signInSubmit');

  const footerPrompt = isPasswordRecovery
    ? t('auth.cancelRecoveryPrompt')
    : isResetMode
      ? t('auth.rememberedPasswordPrompt')
      : t('auth.noAccountPrompt');

  const footerActionLabel =
    isPasswordRecovery || isResetMode
      ? t('auth.backToSignInLink')
      : t('auth.createAccountLink');

  return (
    <AuthScreenShell
      title={screenTitle}
      subtitle={screenSubtitle}
      compactLogo={isPasswordRecovery || isResetMode}
      errorMessage={localError || authError}
      successMessage={
        !isPasswordRecovery && resetSentEmail
          ? t('auth.resetSent', { email: resetSentEmail })
          : null
      }
      submitLabel={submitLabel}
      isLoading={isLoading}
      onSubmit={() => {
        if (isPasswordRecovery) {
          void handleUpdatePassword();
        } else if (isResetMode) {
          void handleResetPassword();
        } else {
          void handleSignIn();
        }
      }}
      onGooglePress={
        isPasswordRecovery || isResetMode
          ? undefined
          : () => void handleGoogleSignIn()
      }
      footerPrompt={footerPrompt}
      footerActionLabel={footerActionLabel}
      onFooterAction={() => {
        if (isPasswordRecovery) {
          setLocalError(null);
          setNewPassword('');
          setConfirmPassword('');
          setIsResetMode(false);
          void cancelPasswordRecovery();
        } else if (isResetMode) {
          toggleResetMode(false);
        } else {
          setLocalError(null);
          clearError();
          router.push('/sign-up');
        }
      }}>
      <View style={styles.inputsStack}>
        {isPasswordRecovery ? (
          <>
            <AuthIconInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('auth.newPasswordPlaceholder')}
              isPassword
              autoCapitalize="none"
              returnKeyType="next"
              renderIcon={(color) => <Lock size={16} color={color} />}
            />

            <AuthIconInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              isPassword
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={() => void handleUpdatePassword()}
              renderIcon={(color) => <Lock size={16} color={color} />}
            />
          </>
        ) : (
          <>
            <AuthIconInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType={isResetMode ? 'go' : 'next'}
              onSubmitEditing={
                isResetMode ? () => void handleResetPassword() : undefined
              }
              renderIcon={(color) => <Mail size={16} color={color} />}
            />

            {!isResetMode && (
              <>
                <AuthIconInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordPlaceholder')}
                  isPassword
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={() => void handleSignIn()}
                  renderIcon={(color) => <Lock size={16} color={color} />}
                />

                <Pressable
                  onPress={() => toggleResetMode(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.forgotPasswordLink')}
                  style={({ pressed }) => [
                    styles.forgotBtn,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text style={[styles.forgotText, { color: palette.primary }]}>
                    {t('auth.forgotPasswordLink')}
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  inputsStack: {
    gap: 10,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
