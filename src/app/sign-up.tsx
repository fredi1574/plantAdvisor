import { router } from 'expo-router';
import { Lock, Mail, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthIconInput } from '@/components/auth/auth-icon-input';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSignUp = async () => {
    setLocalError(null);
    setConfirmationSent(false);
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

    const result = await signUpWithEmail({
      email: cleanEmail,
      password,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
    });

    if (result.ok) {
      if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleGoogleSignUp = async () => {
    setLocalError(null);
    setConfirmationSent(false);
    clearError();
    const result = await signInWithGoogle();
    if (result.ok) {
      router.replace('/(tabs)');
    }
  };

  const navigateToSignIn = () => {
    setLocalError(null);
    setConfirmationSent(false);
    clearError();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth');
    }
  };

  return (
    <AuthScreenShell
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      compactLogo
      errorMessage={localError || authError}
      successMessage={
        confirmationSent
          ? t('auth.verificationSent', { email: email.trim() })
          : null
      }
      submitLabel={t('auth.signUpSubmit')}
      isLoading={isLoading}
      onSubmit={() => void handleSignUp()}
      onGooglePress={() => void handleGoogleSignUp()}
      footerPrompt={t('auth.hasAccountPrompt')}
      footerActionLabel={t('auth.signInLink')}
      onFooterAction={navigateToSignIn}>
      <View style={styles.inputsStack}>
        <AuthIconInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('auth.namePlaceholder')}
          autoCapitalize="words"
          returnKeyType="next"
          renderIcon={(color) => <UserIcon size={16} color={color} />}
        />

        <AuthIconInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          renderIcon={(color) => <Mail size={16} color={color} />}
        />

        <AuthIconInput
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordMinPlaceholder')}
          isPassword
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={() => void handleSignUp()}
          renderIcon={(color) => <Lock size={16} color={color} />}
        />
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  inputsStack: {
    gap: 10,
  },
});
