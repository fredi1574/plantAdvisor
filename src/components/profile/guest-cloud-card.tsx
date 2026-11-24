import { router } from 'expo-router';
import { CloudOff, LogIn } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';

interface GuestCloudCardProps {
  plantCount: number;
  entryCount: number;
}

/**
 * Signed-out guest banner inviting the user to sync their local garden to Supabase.
 */
export function GuestCloudCard({
  plantCount,
  entryCount,
}: GuestCloudCardProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  return (
    <SurfaceCard style={styles.card}>
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: palette.attentionBg,
            borderColor: palette.attentionBorder,
          },
        ]}>
        <CloudOff size={14} color={palette.attentionText} />
        <Text style={[styles.statusPillText, { color: palette.attentionText }]}>
          {t('profile.guest.pill')}
        </Text>
      </View>

      <Text style={[styles.title, { color: palette.textPrimary }]}>
        {t('profile.guest.title')}
      </Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>
        {t('profile.guest.description', {
          plants: t('profile.guest.plantWord', { count: plantCount }),
          entries: t('profile.guest.entryWord', { count: entryCount }),
        })}
      </Text>

      <Pressable
        onPress={() => router.push('/auth')}
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: palette.primary },
          pressed && { opacity: 0.9 },
        ]}>
        <LogIn size={18} color={palette.textInverse} />
        <Text style={[styles.primaryBtnText, { color: palette.textInverse }]}>
          {t('profile.guest.actionBtn')}
        </Text>
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
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
