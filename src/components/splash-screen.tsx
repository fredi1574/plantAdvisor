import { Image } from 'expo-image';
import { Leaf } from 'lucide-react-native';
import { useEffect } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useAnimatedValue,
  View,
} from 'react-native';

import { Palette, Radius } from '@/constants/theme';

const LOGO_SOURCE = require('../../logo_transparent.png');

interface BotanicalSplashScreenProps {
  onFinish?: () => void;
  readyToDismiss: boolean;
}

export function BotanicalSplashScreen({
  onFinish,
  readyToDismiss,
}: BotanicalSplashScreenProps) {
  const logoScale = useAnimatedValue(0.84);
  const logoOpacity = useAnimatedValue(0);
  const textTranslateY = useAnimatedValue(12);
  const textOpacity = useAnimatedValue(0);
  const progressWidth = useAnimatedValue(0);
  const containerOpacity = useAnimatedValue(1);
  const ringPulse = useAnimatedValue(1);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 14,
        stiffness: 110,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 540,
        delay: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 540,
        delay: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressWidth, {
        toValue: 1,
        duration: 1350,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1.06,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [
    logoOpacity,
    logoScale,
    progressWidth,
    ringPulse,
    textOpacity,
    textTranslateY,
  ]);

  useEffect(() => {
    if (!readyToDismiss) return;

    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && onFinish) {
          onFinish();
        }
      });
    }, 1450);

    return () => clearTimeout(timer);
  }, [containerOpacity, onFinish, readyToDismiss]);

  const barInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Ambient Decorative Circles */}
      <View style={styles.ambientTopRight} />
      <View style={styles.ambientBottomLeft} />

      <View style={styles.centerContent}>
        {/* Animated Custom Logo */}
        <Animated.View
          style={[
            styles.emblemWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <Animated.View
            style={[
              styles.outerHalo,
              { transform: [{ scale: ringPulse }] },
            ]}
          />
          <Image
            source={LOGO_SOURCE}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>

        {/* Brand Typography */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}>
          <View style={styles.eyebrowPill}>
            <Leaf size={11} color={Palette.primary} />
            <Text style={styles.eyebrowText}>BOTANICAL COMPANION</Text>
          </View>
          <Text style={styles.brandTitle}>FloraLog</Text>
          <Text style={styles.brandTagline}>
            Mindful plant care & AI diagnostics
          </Text>
        </Animated.View>

        {/* Minimal Loading Progress Track */}
        <Animated.View style={[styles.progressTrack, { opacity: textOpacity }]}>
          <Animated.View
            style={[styles.progressFill, { width: barInterpolated }]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Palette.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    overflow: 'hidden',
  },
  ambientTopRight: {
    position: 'absolute',
    top: -110,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E3EFE6',
    opacity: 0.7,
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#EAE4D7',
    opacity: 0.65,
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emblemWrapper: {
    width: 200,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerHalo: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: Palette.primarySoft,
    borderWidth: 1,
    borderColor: '#C5DEC9',
    opacity: 0.75,
  },
  logoImage: {
    width: 190,
    height: 220,
  },
  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Palette.primarySoft,
    marginBottom: 2,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: Palette.primary,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.8,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.textSecondary,
    letterSpacing: 0.1,
  },
  progressTrack: {
    width: 120,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: '#DFE7E1',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
  },
});
