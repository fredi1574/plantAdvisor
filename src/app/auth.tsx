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
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <AuthScreenShell
      title={isResetMode ? t('auth.resetTitle') : t('auth.signInTitle')}
      subtitle={
        isResetMode ? t('auth.resetSubtitle') : t('auth.signInSubtitle')
      }
      compactLogo={isResetMode}
      errorMessage={localError || authError}
      successMessage={
        resetSentEmail
          ? t('auth.resetSent', { email: resetSentEmail })
          : null
      }
      submitLabel={
        isResetMode ? t('auth.resetSubmit') : t('auth.signInSubmit')
      }
      isLoading={isLoading}
      onSubmit={() =>
        void (isResetMode ? handleResetPassword() : handleSignIn())
      }
      onGooglePress={isResetMode ? undefined : () => void handleGoogleSignIn()}
      footerPrompt={
        isResetMode
          ? t('auth.rememberedPasswordPrompt')
          : t('auth.noAccountPrompt')
      }
      footerActionLabel={
        isResetMode ? t('auth.backToSignInLink') : t('auth.createAccountLink')
      }
      onFooterAction={() => {
        if (isResetMode) {
          toggleResetMode(false);
        } else {
          setLocalError(null);
          clearError();
          router.push('/sign-up');
        }
      }}>
      <View style={styles.inputsStack}>
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
