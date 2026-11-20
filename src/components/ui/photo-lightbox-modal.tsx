import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface PhotoLightboxModalProps {
  visible: boolean;
  uri: string | null | undefined;
  caption?: string;
  onClose: () => void;
}

/**
 * Full-screen image preview lightbox for notebook log photos and progress gallery items.
 */
export function PhotoLightboxModal({
  visible,
  uri,
  caption,
  onClose,
}: PhotoLightboxModalProps) {
  const palette = usePalette();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={[styles.backdrop, { backgroundColor: palette.scrimDark }]}>
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: palette.bgSurface }]}
          accessibilityRole="button"
          accessibilityLabel="Close photo preview">
          <X size={20} color={palette.textPrimary} />
        </Pressable>

        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
        />

        {caption ? (
          <View
            style={[
              styles.captionPill,
              { backgroundColor: palette.bgSurface },
            ]}>
            <Text
              style={[styles.captionText, { color: palette.textPrimary }]}
              numberOfLines={2}>
              {caption}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: Spacing.md,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '72%',
    borderRadius: Radius.lg,
  },
  captionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    maxWidth: '90%',
  },
  captionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
