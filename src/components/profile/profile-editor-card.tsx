import type { User } from '@supabase/supabase-js';
import { Save, User as UserIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BotanicalInput } from '@/components/ui/botanical-input';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { UserProfile } from '@/types/plant';

interface ProfileEditorCardProps {
  user: User;
  profile: UserProfile | null;
  onShowToast: (message: string) => void;
}

/**
 * Editable gardener profile card for updating display name.
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
    const res = await updateProfile({ displayName });
    if (res.ok) {
      setDraftName(null);
      onShowToast('Gardener profile saved to Supabase! 🌿');
    } else if (res.error) {
      onShowToast(res.error);
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.sectionTitleRow}>
        <UserIcon size={17} color={palette.primary} />
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Gardener Profile
        </Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textPrimary }]}>
          Display Name
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          value={displayName}
          onChangeText={setDraftName}
          placeholder="Your name or handle"
          style={styles.input}
        />
      </View>

      <Pressable
        onPress={() => void handleSaveProfile()}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Save profile"
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: palette.primary },
          pressed && { opacity: 0.9 },
          isLoading && { opacity: 0.65 },
        ]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={palette.textInverse} />
        ) : (
          <>
            <Save size={16} color={palette.textInverse} />
            <Text style={[styles.primaryBtnText, { color: palette.textInverse }]}>
              Save Profile
            </Text>
          </>
        )}
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    fontSize: 15,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: 13,
    marginTop: Spacing.xs,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
