import { Image } from 'expo-image';
import { Columns2, Images } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { PhotoLightboxModal } from '@/components/ui/photo-lightbox-modal';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { HealthAssessment, NotebookEntry } from '@/types/plant';

interface ProgressPhotoItem {
  id: string;
  uri: string;
  timestamp: string;
  label: string;
  source: 'notebook' | 'assessment' | 'profile';
}

interface VisualProgressGalleryProps {
  entries: NotebookEntry[];
  assessments: HealthAssessment[];
  plantPhotoUri?: string;
  acquiredAt?: string;
}

function formatPhotoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function VisualProgressGallery({
  entries,
  assessments,
  plantPhotoUri,
  acquiredAt,
}: VisualProgressGalleryProps) {
  const palette = usePalette();
  const [compareMode, setCompareMode] = useState(false);
  const [previewItem, setPreviewItem] = useState<ProgressPhotoItem | null>(
    null
  );

  const photos = useMemo<ProgressPhotoItem[]>(() => {
    const collected: ProgressPhotoItem[] = [];
    const seenUris = new Set<string>();

    for (const entry of entries) {
      if (entry.photoUri && !seenUris.has(entry.photoUri)) {
        seenUris.add(entry.photoUri);
        collected.push({
          id: `entry-${entry.id}`,
          uri: entry.photoUri,
          timestamp: entry.timestamp,
          label: entry.title,
          source: 'notebook',
        });
      }
    }

    for (const ha of assessments) {
      if (ha.imageUri && !seenUris.has(ha.imageUri)) {
        seenUris.add(ha.imageUri);
        collected.push({
          id: `ha-${ha.id}`,
          uri: ha.imageUri,
          timestamp: ha.createdAt,
          label: 'AI Health Scan',
          source: 'assessment',
        });
      }
    }

    if (plantPhotoUri && !seenUris.has(plantPhotoUri)) {
      collected.push({
        id: 'profile-photo',
        uri: plantPhotoUri,
        timestamp: acquiredAt ?? new Date().toISOString(),
        label: 'Baseline Photo',
        source: 'profile',
      });
    }

    return collected.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [entries, assessments, plantPhotoUri, acquiredAt]);

  if (photos.length === 0) {
    return null;
  }

  const canCompare = photos.length >= 2;
  const earliest = photos[0];
  const latest = photos[photos.length - 1];

  return (
    <SurfaceCard variant="glass">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Images size={16} color={palette.primary} strokeWidth={2.2} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Visual Progress ({photos.length})
          </Text>
        </View>

        {canCompare && (
          <Chip
            label={compareMode ? 'Timeline' : 'Before & After'}
            variant="subtle"
            selected={compareMode}
            selectedStyle="solid"
            icon={
              <Columns2
                size={13}
                color={compareMode ? palette.textInverse : palette.textSecondary}
              />
            }
            onPress={() => setCompareMode((prev) => !prev)}
          />
        )}
      </View>

      {compareMode && canCompare ? (
        <View style={styles.compareRow}>
          <Pressable
            onPress={() => setPreviewItem(earliest)}
            style={styles.compareCol}>
            <Image
              source={{ uri: earliest.uri }}
              style={styles.compareImage}
              contentFit="cover"
            />
            <Text
              style={[styles.compareTag, { color: palette.textPrimary }]}
              numberOfLines={1}>
              Before · {formatPhotoDate(earliest.timestamp)}
            </Text>
            <Text
              style={[styles.compareSub, { color: palette.textMuted }]}
              numberOfLines={1}>
              {earliest.label}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPreviewItem(latest)}
            style={styles.compareCol}>
            <Image
              source={{ uri: latest.uri }}
              style={styles.compareImage}
              contentFit="cover"
            />
            <Text
              style={[styles.compareTag, { color: palette.primary }]}
              numberOfLines={1}>
              Latest · {formatPhotoDate(latest.timestamp)}
            </Text>
            <Text
              style={[styles.compareSub, { color: palette.textMuted }]}
              numberOfLines={1}>
              {latest.label}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}>
          {photos.map((photo) => (
            <Pressable
              key={photo.id}
              onPress={() => setPreviewItem(photo)}
              style={[
                styles.thumbCard,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.thumbImage}
                contentFit="cover"
              />
              <View style={styles.thumbMeta}>
                <Text style={[styles.thumbDate, { color: palette.primary }]}>
                  {formatPhotoDate(photo.timestamp)}
                </Text>
                <Text
                  style={[styles.thumbLabel, { color: palette.textSecondary }]}
                  numberOfLines={1}>
                  {photo.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <PhotoLightboxModal
        visible={Boolean(previewItem)}
        uri={previewItem?.uri}
        caption={
          previewItem
            ? `${formatPhotoDate(previewItem.timestamp)} · ${previewItem.label}`
            : undefined
        }
        onClose={() => setPreviewItem(null)}
      />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  stripContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  thumbCard: {
    width: 118,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: 92,
  },
  thumbMeta: {
    padding: Spacing.xs,
    gap: 2,
  },
  thumbDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  thumbLabel: {
    fontSize: 11,
  },
  compareRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  compareCol: {
    flex: 1,
    gap: 4,
  },
  compareImage: {
    width: '100%',
    height: 150,
    borderRadius: Radius.lg,
  },
  compareTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  compareSub: {
    fontSize: 11,
  },
});
