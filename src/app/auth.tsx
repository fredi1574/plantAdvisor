import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  Sprout,
  User as UserIcon,
} from 'lucide-react-native';
import { useState } from 'react';
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
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { ExperienceLevel } from '@/types/plant';

const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  subtitle: string;
}[] = [
  {
    value: 'beginner',
    label: 'Beginner Sprout',
    subtitle: 'Learning watering rhythms & light basics',
  },
  {
    value: 'enthusiast',
    label: 'Plant Enthusiast',
    subtitle: 'Growing succulents, foliage & cuttings',
  },
  {
    value: 'master_gardener',
    label: 'Master Botanist',
    subtitle: 'Advanced substrates, propagation & diagnostics',
  },
];

export default function AuthScreen() {
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>('enthusiast');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const switchMode = (nextMode: 'sign_in' | 'sign_up') => {
    setMode(nextMode);
    setLocalError(null);
    setConfirmationSent(false);
    clearError();
  };

  const handleSubmit = async () => {
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

    if (mode === 'sign_in') {
      const result = await signInWithEmail(cleanEmail, password);
      if (result.ok) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }
    } else {
      const result = await signUpWithEmail({
        email: cleanEmail,
        password,
        displayName: displayName.trim() || cleanEmail.split('@')[0],
        experienceLevel,
      });

      if (result.ok) {
        if (result.needsEmailConfirmation) {
          setConfirmationSent(true);
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  };

  const activeError = localError || authError;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Top Back Button */}
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.75 },
              ]}>
              <ArrowLeft size={18} color={Palette.textPrimary} />
              <Text style={styles.backBtnText}>Back to Garden</Text>
            </Pressable>

            {/* Hero Header */}
            <View style={styles.heroBlock}>
              <View style={styles.iconCircle}>
                <Sprout size={28} color={Palette.primary} />
              </View>
              <Text style={styles.eyebrow}>FLORALOG CLOUD SYNC</Text>
              <Text style={styles.title}>
                {mode === 'sign_in'
                  ? 'Welcome Back, Gardener'
                  : 'Create Your Botanical Account'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'sign_in'
                  ? 'Sign in to sync your plants, care logs, and AI health scans across all your devices.'
                  : 'Back up your garden in Supabase and track every watering, propagation, and AI diagnosis.'}
              </Text>
            </View>

            {/* Segmented Mode Switcher */}
            <View style={styles.tabSwitch}>
              <Pressable
                onPress={() => switchMode('sign_in')}
                style={[
                  styles.tabButton,
                  mode === 'sign_in' && styles.tabButtonActive,
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'sign_in' && styles.tabButtonTextActive,
                  ]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode('sign_up')}
                style={[
                  styles.tabButton,
                  mode === 'sign_up' && styles.tabButtonActive,
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'sign_up' && styles.tabButtonTextActive,
                  ]}>
                  Create Account
                </Text>
              </Pressable>
            </View>

            {/* Error Banner */}
            {activeError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color={Palette.criticalText} />
                <Text style={styles.errorText}>{activeError}</Text>
              </View>
            )}

            {/* Confirmation Email Sent Banner */}
            {confirmationSent && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={18} color={Palette.thrivingText} />
                <View style={styles.flex}>
                  <Text style={styles.successTitle}>
                    Check your email to confirm your account
                  </Text>
                  <Text style={styles.successBody}>
                    We sent a verification link to {email.trim()}. Once confirmed,
                    switch to Sign In above.
                  </Text>
                </View>
              </View>
            )}

            {/* Form Card */}
            <View style={styles.card}>
              {mode === 'sign_up' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Gardener Name</Text>
                  <View style={styles.inputRow}>
                    <UserIcon size={18} color={Palette.textMuted} />
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="e.g. Clara Lin"
                      placeholderTextColor={Palette.textMuted}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputRow}>
                  <Mail size={18} color={Palette.textMuted} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={Palette.textMuted}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Lock size={18} color={Palette.textMuted} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={Palette.textMuted}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={Palette.textMuted} />
                    ) : (
                      <Eye size={18} color={Palette.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>

              {mode === 'sign_up' && (
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Sparkles size={14} color={Palette.primary} />
                    <Text style={styles.label}>Botanical Experience</Text>
                  </View>
                  <View style={styles.levelList}>
                    {EXPERIENCE_OPTIONS.map((opt) => {
                      const selected = experienceLevel === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setExperienceLevel(opt.value)}
                          style={[
                            styles.levelOption,
                            selected && styles.levelOptionSelected,
                          ]}>
                          <View style={styles.levelRadioOuter}>
                            {selected && <View style={styles.levelRadioInner} />}
                          </View>
                          <View style={styles.flex}>
                            <Text
                              style={[
                                styles.levelTitle,
                                selected && styles.levelTitleSelected,
                              ]}>
                              {opt.label}
                            </Text>
                            <Text style={styles.levelSubtitle}>
                              {opt.subtitle}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && !isLoading && { opacity: 0.9 },
                  isLoading && { opacity: 0.65 },
                ]}>
                {isLoading ? (
                  <ActivityIndicator color={Palette.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === 'sign_in' ? 'Sign In & Sync Garden' : 'Create Account'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  heroBlock: {
    gap: 8,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: Radius.lg,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Palette.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: Palette.bgSurface,
    ...CardShadow,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  tabButtonTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Palette.criticalBg,
    borderWidth: 1,
    borderColor: Palette.criticalBorder,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.criticalText,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Palette.thrivingBg,
    borderWidth: 1,
    borderColor: Palette.thrivingBorder,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.thrivingText,
  },
  successBody: {
    fontSize: 13,
    color: Palette.thrivingText,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: Spacing.md,
    ...CardShadow,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Palette.textPrimary,
  },
  levelList: {
    gap: 8,
    marginTop: 2,
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  levelOptionSelected: {
    backgroundColor: Palette.primarySoft,
    borderColor: Palette.primary,
  },
  levelRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Palette.primary,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  levelTitleSelected: {
    color: Palette.primary,
  },
  levelSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  submitBtn: {
    marginTop: 6,
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: Palette.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
