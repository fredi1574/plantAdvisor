import { router } from 'expo-router';
import { Lock, Mail, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthIconInput } from '@/components/auth/auth-icon-input';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { Chip } from '@/components/ui/chip';
import { usePalette } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { ExperienceLevel } from '@/types/plant';

const EXPERIENCE_PILLS: {
  value: ExperienceLevel;
  label: string;
}[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'enthusiast', label: 'Enthusiast' },
  { value: 'master_gardener', label: 'Botanist' },
];

export default function SignUpScreen() {
  const palette = usePalette();
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>('enthusiast');
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSignUp = async () => {
    setLocalError(null);
    setConfirmationSent(false);
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

    const result = await signUpWithEmail({
      email: cleanEmail,
      password,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      experienceLevel,
    });

    if (result.ok) {
      if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        router.replace('/(tabs)');
      }
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
      title="Create Account"
      subtitle="Start your personal FloraLog plant journal"
      compactLogo
      errorMessage={localError || authError}
      successMessage={
        confirmationSent
          ? `Verification link sent to ${email.trim()}. Confirm your email, then sign in below.`
          : null
      }
      submitLabel="Create Account"
      isLoading={isLoading}
      onSubmit={() => void handleSignUp()}
      footerPrompt="Already have an account?"
      footerActionLabel="Sign in"
      onFooterAction={navigateToSignIn}>
      <View style={styles.inputsStack}>
        <AuthIconInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          autoCapitalize="words"
          returnKeyType="next"
          renderIcon={(color) => <UserIcon size={16} color={color} />}
        />

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
          placeholder="Password (min. 6 chars)"
          isPassword
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={() => void handleSignUp()}
          renderIcon={(color) => <Lock size={16} color={color} />}
        />
      </View>

      <View style={styles.experienceSection}>
        <Text
          style={[styles.experienceLabel, { color: palette.textSecondary }]}>
          Botanical Experience
        </Text>
        <View style={styles.experienceRow}>
          {EXPERIENCE_PILLS.map((pill) => (
            <Chip
              key={pill.value}
              label={pill.label}
              size="md"
              selected={experienceLevel === pill.value}
              onPress={() => setExperienceLevel(pill.value)}
              style={styles.experienceChip}
            />
          ))}
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  inputsStack: {
    gap: 10,
  },
  experienceSection: {
    gap: 6,
    marginTop: 2,
  },
  experienceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  experienceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  experienceChip: {
    flex: 1,
  },
});
