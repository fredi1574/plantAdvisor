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

const LOGO_SOURCE = require('../../logo_transparent.png');

type FocusedField = 'email' | 'password' | null;

export default function SignInScreen() {
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
                  <AlertCircle size={16} color={Palette.criticalText} />
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
                          ? Palette.primary
                          : Palette.textMuted
                      }
                    />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Email address"
                    placeholderTextColor={Palette.textMuted}
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
                          ? Palette.primary
                          : Palette.textMuted
                      }
                    />
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Password"
                    placeholderTextColor={Palette.textMuted}
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
                      <EyeOff size={16} color={Palette.textMuted} />
                    ) : (
                      <Eye size={16} color={Palette.textMuted} />
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
                  <ActivityIndicator color={Palette.textInverse} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Enter My Garden</Text>
                    <ArrowRight size={17} color={Palette.textInverse} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.bgPrimary,
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
    backgroundColor: '#E3EFE6',
    opacity: 0.75,
  },
  ambientOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#EAE4D7',
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
    backgroundColor: Palette.primarySoft,
    borderWidth: 1,
    borderColor: '#C5DEC9',
    opacity: 0.8,
  },
  logoImage: {
    width: 108,
    height: 124,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Palette.bgSurface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
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
    backgroundColor: Palette.criticalBg,
    borderWidth: 1,
    borderColor: Palette.criticalBorder,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.criticalText,
  },
  inputsStack: {
    gap: 10,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1.2,
    borderColor: Palette.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  inputFieldFocused: {
    borderColor: Palette.primary,
    backgroundColor: '#FAFDFB',
  },
  inputIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Palette.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputIconWrapFocused: {
    backgroundColor: Palette.primarySoft,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Palette.textPrimary,
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
    backgroundColor: Palette.primary,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 2,
    shadowColor: Palette.primary,
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
    color: Palette.textInverse,
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
    color: Palette.textSecondary,
  },
  footerLink: {
    color: Palette.primary,
    fontWeight: '700',
  },
});
