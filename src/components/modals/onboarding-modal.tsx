import { ArrowRight, Camera, Sprout } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import {
  JournalSproutIllustration,
  PottedSucculentIllustration,
  SproutSearchIllustration,
} from '@/components/ui/botanical-illustrations';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';

interface OnboardingModalProps {
  visible: boolean;
  onStartScan: () => void;
  onExploreSample: () => void;
}

const SLIDES = [
  {
    key: 'welcome',
    eyebrow: 'WELCOME TO FLORALOG',
    title: 'Your calm botanical notebook',
    body: 'Track every houseplant, succulent, and propagation in one place—with adaptive watering schedules and chronological care logs.',
    Illustration: PottedSucculentIllustration,
  },
  {
    key: 'ai',
    eyebrow: 'AI BOTANIST & HEALTH SCANS',
    title: 'Identify & diagnose in seconds',
    body: 'Snap a leaf photo to auto-identify species with pet-safety warnings, or run context-aware health scans paired with your care history.',
    Illustration: SproutSearchIllustration,
  },
  {
    key: 'care',
    eyebrow: 'EFFORTLESS CARE RHYTHM',
    title: 'Never miss a watering day',
    body: 'Get gentle on-device reminders, batch-water thirsty plants with instant Undo, and watch propagation roots grow ready for soil.',
    Illustration: JournalSproutIllustration,
  },
] as const;

/**
 * First-time botanical welcome flow inviting new users to identify their first plant
 * or explore the pre-loaded sample conservatory.
 */
export function OnboardingModal({
  visible,
  onStartScan,
  onExploreSample,
}: OnboardingModalProps) {
  const palette = usePalette();
  const [step, setStep] = useState(0);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const SlideIllustration = slide.Illustration;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onExploreSample}>
      <View style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View style={styles.topRow}>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>
              {slide.eyebrow}
            </Text>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onExploreSample();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding">
              <Text style={[styles.skipText, { color: palette.textMuted }]}>
                Skip
              </Text>
            </Pressable>
          </View>

          <View style={styles.illustrationWrap}>
            <SlideIllustration size={120} />
          </View>

          <View style={styles.copyBlock}>
            <Text
              style={[
                styles.title,
                { color: palette.textPrimary, fontFamily: Fonts?.serif },
              ]}>
              {slide.title}
            </Text>
            <Text style={[styles.body, { color: palette.textSecondary }]}>
              {slide.body}
            </Text>
          </View>

          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === step ? palette.primary : palette.borderSubtle,
                    width: idx === step ? 20 : 7,
                  },
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <View style={styles.finalActions}>
              <SpringPressable
                onPress={() => {
                  triggerLightHaptic();
                  onStartScan();
                }}
                accessibilityRole="button"
                accessibilityLabel="Identify My First Plant"
                style={[
                  styles.primaryBtn,
                  { backgroundColor: palette.primary },
                ]}>
                <Camera size={16} color={palette.textInverse} />
                <Text
                  style={[
                    styles.primaryBtnText,
                    { color: palette.textInverse },
                  ]}>
                  Identify My First Plant
                </Text>
              </SpringPressable>

              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  onExploreSample();
                }}
                accessibilityRole="button"
                accessibilityLabel="Explore Sample Conservatory"
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  {
                    backgroundColor: palette.bgPrimary,
                    borderColor: palette.borderSubtle,
                  },
                  pressed && { opacity: 0.8 },
                ]}>
                <Sprout size={15} color={palette.primary} />
                <Text
                  style={[styles.secondaryBtnText, { color: palette.primary }]}>
                  Explore Sample Conservatory
                </Text>
              </Pressable>
            </View>
          ) : (
            <SpringPressable
              onPress={() => {
                triggerLightHaptic();
                setStep((prev) => Math.min(SLIDES.length - 1, prev + 1));
              }}
              accessibilityRole="button"
              accessibilityLabel="Next onboarding slide"
              style={[styles.primaryBtn, { backgroundColor: palette.primary }]}>
              <Text
                style={[styles.primaryBtnText, { color: palette.textInverse }]}>
                Continue
              </Text>
              <ArrowRight size={16} color={palette.textInverse} />
            </SpringPressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  copyBlock: {
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  title: {
    ...Typography.sectionTitle,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 21,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: Spacing.xs,
  },
  dot: {
    height: 7,
    borderRadius: Radius.full,
  },
  finalActions: {
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
