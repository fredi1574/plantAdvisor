import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthIconInput } from '@/components/auth/auth-icon-input';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignInScreen() {
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
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
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    const result = await signInWithEmail(cleanEmail, password);
    if (result.ok) {
      router.replace('/(tabs)');
    }
  };

  return (
    <AuthScreenShell
      title="FloraLog"
      subtitle="Sign in to your botanical sanctuary"
      errorMessage={localError || authError}
      submitLabel="Enter My Garden"
      isLoading={isLoading}
      onSubmit={() => void handleSignIn()}
      footerPrompt="Don't have an account?"
      footerActionLabel="Create account"
      onFooterAction={() => {
        setLocalError(null);
        clearError();
        router.push('/sign-up');
      }}>
      <View style={styles.inputsStack}>
        <AuthIconInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          renderIcon={(color) => <Mail size={16} color={color} />}
        />

        <AuthIconInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
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
