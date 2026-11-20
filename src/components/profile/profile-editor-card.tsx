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

import { EXPERIENCE_LEVEL_LABELS } from '@/components/profile/profile-overview-card';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { ExperienceLevel, UserProfile } from '@/types/plant';

interface ProfileEditorCardProps {
  user: User;
  profile: UserProfile | null;
  onShowToast: (message: string) => void;
}

/**
 * Editable gardener profile card encapsulating display name, experience level, and bio drafts.
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
  const [draftLevel, setDraftLevel] = useState<ExperienceLevel | null>(null);
  const [draftBio, setDraftBio] = useState<string | null>(null);

  const displayName =
    draftName ??
    profile?.displayName ??
    user.email?.split('@')[0] ??
    'Gardener';
  const experienceLevel: ExperienceLevel =
    draftLevel ?? profile?.experienceLevel ?? 'enthusiast';
  const bio = draftBio ?? profile?.bio ?? '';

  const handleSaveProfile = async () => {
    const res = await updateProfile({
      displayName,
      experienceLevel,
      bio,
    });
    if (res.ok) {
      setDraftName(null);
      setDraftLevel(null);
      setDraftBio(null);
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

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textPrimary }]}>
          Botanical Experience
        </Text>
        <View style={styles.chipsRow}>
          {(Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map(
            (lvl) => (
              <Chip
                key={lvl}
                label={EXPERIENCE_LEVEL_LABELS[lvl]}
                size="md"
                selected={experienceLevel === lvl}
                onPress={() => setDraftLevel(lvl)}
              />
            )
          )}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textPrimary }]}>
          Growing Environment / Notes
        </Text>
        <BotanicalInput
          surface="primary"
          compact={false}
          value={bio}
          onChangeText={setDraftBio}
          placeholder="e.g. South-facing apartment balcony, Zone 9b succulents"
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <Pressable
        onPress={() => void handleSaveProfile()}
        disabled={isLoading}
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
  textArea: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
