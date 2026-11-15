import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
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

const LOGO_SOURCE = require('../../logo_transparent.png');

type FocusedField = 'email' | 'password' | null;

export default function SignInScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
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

  const activeError = localError || authError;

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
              <Text style={styles.brandTitle}>FloraLog</Text>
              <Text style={styles.brandSubtitle}>
                Sign in to your botanical sanctuary
              </Text>
            </View>

            {/* Elevated Minimal Sign-In Card */}
            <View style={styles.card}>
              {activeError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={palette.criticalText} />
                  <Text style={styles.errorText}>{activeError}</Text>
                </View>
              )}

              <View style={styles.inputsStack}>
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
                    placeholder="Password"
                    placeholderTextColor={palette.textMuted}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={() => void handleSignIn()}
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

              <Pressable
                onPress={() => void handleSignIn()}
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
                    <Text style={styles.submitBtnText}>Enter My Garden</Text>
                    <ArrowRight size={17} color={palette.textInverse} />
                  </>
                )}
              </Pressable>
            </View>

            {/* Bottom Navigation Button to Sign Up Page */}
            <Pressable
              onPress={() => {
                setLocalError(null);
                clearError();
                router.push('/sign-up');
              }}
              style={({ pressed }) => [
                styles.bottomSwitchBtn,
                pressed && { opacity: 0.75 },
              ]}>
              <Text style={styles.footerText}>
                Don&apos;t have an account?{' '}
                <Text style={styles.footerLink}>Create account</Text>
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
    width: 112,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  logoHalo: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    opacity: 0.8,
  },
  logoImage: {
    width: 108,
    height: 124,
  },
  brandTitle: {
    fontSize: 28,
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
