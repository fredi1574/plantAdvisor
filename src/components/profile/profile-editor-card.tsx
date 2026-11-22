import type { User } from '@supabase/supabase-js';
import { Save } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import { useAuthStore } from '@/store/useAuthStore';
import type { UserProfile } from '@/types/plant';

interface ProfileEditorCardProps {
  user: User;
  profile: UserProfile | null;
  onShowToast: (message: string) => void;
}

/**
 * Inset grouped gardener profile editor for updating display name.
 */
export function ProfileEditorCard({
  user,
  profile,
  onShowToast,
}: ProfileEditorCardProps) {
  const palette = usePalette();
  const isLoading = useAuthStore((s) => s.isLoading);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [draftName, setDraftName] = useState<string | null>(null);

  const displayName =
    draftName ??
    profile?.displayName ??
    user.email?.split('@')[0] ??
    'Gardener';

  const handleSaveProfile = async () => {
    triggerLightHaptic();
    const res = await updateProfile({ displayName });
    if (res.ok) {
      setDraftName(null);
      onShowToast('Gardener profile saved to Supabase! 🌿');
    } else if (res.error) {
      onShowToast(res.error);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
        GARDENER PROFILE
      </Text>

      <View
        style={[
          styles.groupedBox,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>
          Display Name
        </Text>
        <View style={styles.inputRow}>
          <BotanicalInput
            surface="primary"
            compact={false}
            value={displayName}
            onChangeText={setDraftName}
            placeholder="Your name or handle"
            style={styles.input}
          />
          <SpringPressable
            onPress={() => void handleSaveProfile()}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
            style={[
              styles.saveBtn,
              { backgroundColor: palette.primary },
              isLoading && { opacity: 0.65 },
            ]}>
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.textInverse} />
            ) : (
              <>
                <Save size={14} color={palette.textInverse} />
                <Text
                  style={[styles.saveBtnText, { color: palette.textInverse }]}>
                  Save
                </Text>
              </>
            )}
          </SpringPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.eyebrow,
    paddingHorizontal: Spacing.xs,
  },
  groupedBox: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs + 2,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
