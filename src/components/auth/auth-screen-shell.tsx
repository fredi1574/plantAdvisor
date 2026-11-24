import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import React, { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LegalInfoModal,
  type LegalDocumentType,
} from '@/components/modals/legal-info-modal';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { BorderWidth, CardShadow, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

const LOGO_SOURCE = require('../../../assets/images/logo-transparent.png');

interface AuthScreenShellProps {
  title: string;
  subtitle: string;
  compactLogo?: boolean;
  errorMessage: string | null;
  successMessage?: string | null;
  submitLabel: string;
  isLoading: boolean;
  onSubmit: () => void;
  onGooglePress?: () => void;
  googleLabel?: string;
  footerPrompt: string;
  footerActionLabel: string;
  onFooterAction: () => void;
  children: ReactNode;
}

/**
 * Shared botanical authentication layout shell powering both Sign In and Create Account screens.
 */
export function AuthScreenShell({
  title,
  subtitle,
  compactLogo = false,
  errorMessage,
  successMessage,
  submitLabel,
  isLoading,
  onSubmit,
  onGooglePress,
  googleLabel,
  footerPrompt,
  footerActionLabel,
  onFooterAction,
  children,
}: AuthScreenShellProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const [legalDoc, setLegalDoc] = useState<LegalDocumentType | null>(null);
  const resolvedGoogleLabel = googleLabel ?? t('auth.continueWithGoogle');

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top', 'bottom']}>
      <View
        style={[styles.ambientOrbTop, { backgroundColor: palette.primarySoft }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.ambientOrbBottom,
          { backgroundColor: palette.bgSubtle },
        ]}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.brandHeader}>
              <View
                style={
                  compactLogo ? styles.logoWrapCompact : styles.logoWrapRegular
                }>
                <View
                  style={[
                    compactLogo
                      ? styles.logoHaloCompact
                      : styles.logoHaloRegular,
                    {
                      backgroundColor: palette.primarySoft,
                      borderColor: palette.primaryBorder,
                    },
                  ]}
                />
                <Image
                  source={LOGO_SOURCE}
                  style={
                    compactLogo
                      ? styles.logoImageCompact
                      : styles.logoImageRegular
                  }
                  contentFit="contain"
                />
              </View>
              <Text
                style={[
                  styles.brandTitle,
                  compactLogo && styles.brandTitleCompact,
                  { color: palette.textPrimary },
                ]}>
                {title}
              </Text>
              <Text
                style={[
                  styles.brandSubtitle,
                  { color: palette.textSecondary },
                ]}>
                {subtitle}
              </Text>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <FeedbackBanner message={errorMessage} variant="error" />
              <FeedbackBanner message={successMessage ?? null} variant="success" />

              {children}

              <Pressable
                onPress={onSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: palette.primary,
                    shadowColor: palette.primary,
                  },
                  pressed && !isLoading && styles.submitBtnPressed,
                  isLoading && styles.submitBtnDisabled,
                ]}>
                {isLoading ? (
                  <ActivityIndicator color={palette.textInverse} size="small" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.submitBtnText,
                        { color: palette.textInverse },
                      ]}>
                      {submitLabel}
                    </Text>
                    <ArrowRight size={17} color={palette.textInverse} />
                  </>
                )}
              </Pressable>

              {onGooglePress && Platform.OS !== 'web' ? (
                <>
                  <View style={styles.dividerRow}>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: palette.borderSubtle },
                      ]}
                    />
                    <Text
                      style={[styles.dividerText, { color: palette.textMuted }]}>
                      {t('common.or')}
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: palette.borderSubtle },
                      ]}
                    />
                  </View>

                  <Pressable
                    onPress={onGooglePress}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={resolvedGoogleLabel}
                    style={({ pressed }) => [
                      styles.googleBtn,
                      {
                        backgroundColor: palette.bgPrimary,
                        borderColor: palette.borderSubtle,
                      },
                      pressed && !isLoading && styles.submitBtnPressed,
                      isLoading && styles.submitBtnDisabled,
                    ]}>
                    <View
                      style={[
                        styles.googleBadge,
                        {
                          backgroundColor: palette.primarySoft,
                          borderColor: palette.primaryBorder,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.googleBadgeText,
                          { color: palette.primary },
                        ]}>
                        G
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.googleBtnText,
                        { color: palette.textPrimary },
                      ]}>
                      {resolvedGoogleLabel}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <Pressable
              onPress={onFooterAction}
              style={({ pressed }) => [
                styles.bottomSwitchBtn,
                pressed && { opacity: 0.75 },
              ]}>
              <Text
                style={[styles.footerText, { color: palette.textSecondary }]}>
                {footerPrompt}{' '}
                <Text style={[styles.footerLink, { color: palette.primary }]}>
                  {footerActionLabel}
                </Text>
              </Text>
            </Pressable>

            <View style={styles.legalRow}>
              <Pressable
                onPress={() => setLegalDoc('privacy')}
                accessibilityRole="button"
                accessibilityLabel={t('auth.privacyPolicy')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <Text style={[styles.legalLink, { color: palette.textMuted }]}>
                  {t('auth.privacyPolicy')}
                </Text>
              </Pressable>
              <Text style={[styles.legalDot, { color: palette.textMuted }]}>
                •
              </Text>
              <Pressable
                onPress={() => setLegalDoc('terms')}
                accessibilityRole="button"
                accessibilityLabel={t('auth.termsOfService')}
                style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <Text style={[styles.legalLink, { color: palette.textMuted }]}>
                  {t('auth.termsOfService')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalInfoModal
        visible={legalDoc !== null}
        document={legalDoc ?? 'privacy'}
        onClose={() => setLegalDoc(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    opacity: 0.75,
  },
  ambientOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
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
  logoWrapRegular: {
    width: 112,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  logoWrapCompact: {
    width: 100,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  logoHaloRegular: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: BorderWidth.hairline,
    opacity: 0.8,
  },
  logoHaloCompact: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: BorderWidth.hairline,
    opacity: 0.8,
  },
  logoImageRegular: {
    width: 108,
    height: 124,
  },
  logoImageCompact: {
    width: 96,
    height: 112,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  brandTitleCompact: {
    fontSize: 26,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: BorderWidth.hairline,
    gap: 14,
    ...CardShadow,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: BorderWidth.hairline,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  googleBtnText: {
    fontSize: 14,
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
  },
  footerLink: {
    fontWeight: '700',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
  },
});
