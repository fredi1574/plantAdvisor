import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CardShadow,
  Radius,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { ExperienceLevel } from '@/types/plant';

const LOGO_SOURCE = require('../../logo_transparent.png');

const EXPERIENCE_PILLS: {
  value: ExperienceLevel;
  label: string;
}[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'enthusiast', label: 'Enthusiast' },
    { value: 'master_gardener', label: 'Botanist' },
  ];

type FocusedField = 'name' | 'email' | 'password' | null;

export default function SignUpScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>('enthusiast');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
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

  const activeError = localError || authError;

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Subtle Ambient Background Motifs */}
      <View style={styles.ambientOrbTop} pointerEvents="none" />
      <View style={styles.ambientOrbBottom} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Minimal Centered Brand Identity */}
            <View style={styles.brandHeader}>
              <View style={styles.logoWrap}>
                <View style={styles.logoHalo} />
                <Image
                  source={LOGO_SOURCE}
                  style={styles.logoImage}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.brandTitle}>Create Account</Text>
              <Text style={styles.brandSubtitle}>
                Start your personal FloraLog plant journal
              </Text>
            </View>

            {/* Elevated Minimal Sign-Up Card */}
            <View style={styles.card}>
              {activeError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={palette.criticalText} />
                  <Text style={styles.errorText}>{activeError}</Text>
                </View>
              )}

              {confirmationSent && (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color={palette.thrivingText} />
                  <Text style={styles.successText}>
                    Verification link sent to {email.trim()}. Confirm your email,
                    then sign in below.
                  </Text>
                </View>
              )}

              <View style={styles.inputsStack}>
                <View
                  style={[
                    styles.inputField,
                    focusedField === 'name' && styles.inputFieldFocused,
                  ]}>
                  <View
                    style={[
                      styles.inputIconWrap,
                      focusedField === 'name' && styles.inputIconWrapFocused,
                    ]}>
                    <UserIcon
                      size={16}
                      color={
                        focusedField === 'name'
                          ? palette.primary
                          : palette.textMuted
                      }
                    />
                  </View>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Your name"
                    placeholderTextColor={palette.textMuted}
                    style={styles.input}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View
                  style={[
                    styles.inputField,
                    focusedField === 'email' && styles.inputFieldFocused,
                  ]}>
                  <View
                    style={[
                      styles.inputIconWrap,
                      focusedField === 'email' && styles.inputIconWrapFocused,
                    ]}>
                    <Mail
                      size={16}
                      color={
                        focusedField === 'email'
                          ? palette.primary
                          : palette.textMuted
                      }
                    />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Email address"
                    placeholderTextColor={palette.textMuted}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View
                  style={[
                    styles.inputField,
                    focusedField === 'password' && styles.inputFieldFocused,
                  ]}>
                  <View
                    style={[
                      styles.inputIconWrap,
                      focusedField === 'password' && styles.inputIconWrapFocused,
                    ]}>
                    <Lock
                      size={16}
                      color={
                        focusedField === 'password'
                          ? palette.primary
                          : palette.textMuted
                      }
                    />
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Password (min. 6 chars)"
                    placeholderTextColor={palette.textMuted}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={() => void handleSignUp()}
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={10}
                    style={styles.eyeBtn}>
                    {showPassword ? (
                      <EyeOff size={16} color={palette.textMuted} />
                    ) : (
                      <Eye size={16} color={palette.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={styles.experienceSection}>
                <Text style={styles.experienceLabel}>Botanical Experience</Text>
                <View style={styles.experienceRow}>
                  {EXPERIENCE_PILLS.map((pill) => {
                    const isActive = experienceLevel === pill.value;
                    return (
                      <Pressable
                        key={pill.value}
                        onPress={() => setExperienceLevel(pill.value)}
                        style={({ pressed }) => [
                          styles.experienceChip,
                          isActive && styles.experienceChipActive,
                          pressed && styles.submitBtnPressed,
                        ]}>
                        <Text
                          style={[
                            styles.experienceChipText,
                            isActive && styles.experienceChipTextActive,
                          ]}>
                          {pill.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                onPress={() => void handleSignUp()}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && !isLoading && styles.submitBtnPressed,
                  isLoading && styles.submitBtnDisabled,
                ]}>
                {isLoading ? (
                  <ActivityIndicator color={palette.textInverse} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Create Account</Text>
                    <ArrowRight size={17} color={palette.textInverse} />
                  </>
                )}
              </Pressable>
            </View>

            {/* Bottom Navigation Button to Sign In Page */}
            <Pressable
              onPress={navigateToSignIn}
              style={({ pressed }) => [
                styles.bottomSwitchBtn,
                pressed && { opacity: 0.75 },
              ]}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text style={styles.footerLink}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  ambientOrbTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: palette.primarySoft,
    opacity: 0.75,
  },
  ambientOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: palette.bgSubtle,
    opacity: 0.65,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    gap: 18,
  },
  brandHeader: {
    alignItems: 'center',
    gap: 4,
  },
  logoWrap: {
    width: 100,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  logoHalo: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    opacity: 0.8,
  },
  logoImage: {
    width: 96,
    height: 112,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: palette.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: palette.bgSurface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    gap: 14,
    ...CardShadow,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: palette.criticalBg,
    borderWidth: 1,
    borderColor: palette.criticalBorder,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: palette.criticalText,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: palette.thrivingBg,
    borderWidth: 1,
    borderColor: palette.thrivingBorder,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: palette.thrivingText,
    lineHeight: 17,
  },
  inputsStack: {
    gap: 10,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.bgPrimary,
    borderWidth: 1.2,
    borderColor: palette.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  inputFieldFocused: {
    borderColor: palette.primary,
    backgroundColor: palette.bgSurface,
  },
  inputIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: palette.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputIconWrapFocused: {
    backgroundColor: palette.primarySoft,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: palette.textPrimary,
    paddingVertical: 4,
  },
  eyeBtn: {
    paddingHorizontal: 4,
  },
  experienceSection: {
    gap: 6,
    marginTop: 2,
  },
  experienceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  experienceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  experienceChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    backgroundColor: palette.bgPrimary,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  experienceChipActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  experienceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  experienceChipTextActive: {
    color: palette.primary,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 2,
    shadowColor: palette.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: palette.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSwitchBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
  },
  footerText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  footerLink: {
    color: palette.primary,
    fontWeight: '700',
  },
});

