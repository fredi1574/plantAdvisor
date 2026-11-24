import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthIconInput } from '@/components/auth/auth-icon-input';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignInScreen() {
  const { t } = useTranslation();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    const result = await signInWithGoogle();
    if (result.ok) {
      router.replace('/(tabs)');
    }
  };

  return (
    <AuthScreenShell
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      errorMessage={localError || authError}
      submitLabel={t('auth.signInSubmit')}
      isLoading={isLoading}
      onSubmit={() => void handleSignIn()}
      onGooglePress={() => void handleGoogleSignIn()}
      footerPrompt={t('auth.noAccountPrompt')}
      footerActionLabel={t('auth.createAccountLink')}
      onFooterAction={() => {
        setLocalError(null);
        clearError();
        router.push('/sign-up');
      }}>
      <View style={styles.inputsStack}>
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
          placeholder={t('auth.passwordPlaceholder')}
          isPassword
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={() => void handleSignIn()}
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
